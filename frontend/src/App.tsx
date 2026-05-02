import { useEffect, useState, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};
import { AuthProvider, useAuth } from "@/contexts/auth";
import { ClientAuthProvider, useClientAuth } from "@/contexts/client-auth";
import { ThemeProvider } from "@/contexts/theme";
import { AnimatedBackground } from "@/components/animated-background";
import { PwaUpdatePrompt } from "@/components/pwa/pwa-update-prompt";
import { api } from "@/lib/api";

// Layouts грузятся eager — они нужны мгновенно при попадании на любой роут.
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CabinetLayout } from "@/pages/cabinet/cabinet-layout";

// Хелпер: конвертирует named-export модуль в shape, который понимает React.lazy.
const named = <T extends string>(p: Promise<Record<string, unknown>>, name: T) =>
  p.then((m) => ({ default: m[name] as React.ComponentType }));

// === Admin pages (lazy chunks) ===
const LoginPage = lazy(() => named(import("@/pages/login"), "LoginPage"));
const ChangePasswordPage = lazy(() => named(import("@/pages/change-password"), "ChangePasswordPage"));
const DashboardPage = lazy(() => named(import("@/pages/dashboard"), "DashboardPage"));
const ClientsPage = lazy(() => named(import("@/pages/clients"), "ClientsPage"));
const TariffsPage = lazy(() => named(import("@/pages/tariffs"), "TariffsPage"));
const SettingsPage = lazy(() => named(import("@/pages/settings"), "SettingsPage"));
const PromoPage = lazy(() => named(import("@/pages/promo"), "PromoPage"));
const PromoCodesPage = lazy(() => named(import("@/pages/promo-codes"), "PromoCodesPage"));
const AnalyticsPage = lazy(() => named(import("@/pages/analytics"), "AnalyticsPage"));
const MarketingPage = lazy(() => named(import("@/pages/marketing"), "MarketingPage"));
const AdminsPage = lazy(() => named(import("@/pages/admins"), "AdminsPage"));
const SalesReportPage = lazy(() => named(import("@/pages/sales-report"), "SalesReportPage"));
const VideoInstructionsPage = lazy(() => named(import("@/pages/video-instructions"), "VideoInstructionsPage"));
const BackupPage = lazy(() => named(import("@/pages/backup"), "BackupPage"));
const ContestsPage = lazy(() => named(import("@/pages/contests"), "ContestsPage"));
const AdminTicketsPage = lazy(() => named(import("@/pages/admin-tickets"), "AdminTicketsPage"));
const BroadcastPage = lazy(() => named(import("@/pages/broadcast"), "BroadcastPage"));
const AutoBroadcastPage = lazy(() => named(import("@/pages/auto-broadcast"), "AutoBroadcastPage"));
const ReferralNetworkPage = lazy(() => named(import("@/pages/referral-network"), "ReferralNetworkPage"));
const GramadsPromoPage = lazy(() => named(import("@/pages/gramads-promo"), "GramadsPromoPage"));
const TrafficAbusePage = lazy(() => named(import("@/pages/traffic-abuse"), "TrafficAbusePage"));
const ApiKeysPage = lazy(() => named(import("@/pages/api-keys"), "ApiKeysPage"));
const ApiDocsPage = lazy(() => named(import("@/pages/api-docs"), "ApiDocsPage"));
const GeoMapPage = lazy(() => named(import("@/pages/geo-map"), "GeoMapPage"));
const AdminSecondarySubscriptionsPage = lazy(() => named(import("@/pages/admin-secondary-subscriptions"), "AdminSecondarySubscriptionsPage"));
const ProxyPage = lazy(() => named(import("@/pages/proxy"), "ProxyPage"));
const SingboxPage = lazy(() => named(import("@/pages/singbox"), "SingboxPage"));
// LanguagesPage — default export, не named
const LanguagesPage = lazy(() => import("@/pages/languages"));
const TourConstructorPage = lazy(() => named(import("@/pages/tour-constructor"), "TourConstructorPage"));

// === Cabinet pages (lazy chunks) ===
const ClientLoginPage = lazy(() => named(import("@/pages/cabinet/client-login"), "ClientLoginPage"));
const ClientRegisterPage = lazy(() => named(import("@/pages/cabinet/client-register"), "ClientRegisterPage"));
const ClientOnboardingPage = lazy(() => named(import("@/pages/cabinet/client-onboarding"), "ClientOnboardingPage"));
const ClientVerifyEmailPage = lazy(() => named(import("@/pages/cabinet/client-verify-email"), "ClientVerifyEmailPage"));
const ClientVerifyLinkEmailPage = lazy(() => named(import("@/pages/cabinet/client-verify-link-email"), "ClientVerifyLinkEmailPage"));
const ClientDashboardPage = lazy(() => named(import("@/pages/cabinet/client-dashboard"), "ClientDashboardPage"));
const ClientTariffsPage = lazy(() => named(import("@/pages/cabinet/client-tariffs"), "ClientTariffsPage"));
const ClientProfilePage = lazy(() => named(import("@/pages/cabinet/client-profile"), "ClientProfilePage"));
const ClientReferralPage = lazy(() => named(import("@/pages/cabinet/client-referral"), "ClientReferralPage"));
const ClientSubscribePage = lazy(() => named(import("@/pages/cabinet/client-subscribe"), "ClientSubscribePage"));
const ClientYooMoneyPayPage = lazy(() => named(import("@/pages/cabinet/client-yoomoney-pay"), "ClientYooMoneyPayPage"));
const ClientExtraOptionsPage = lazy(() => named(import("@/pages/cabinet/client-extra-options"), "ClientExtraOptionsPage"));
const ClientProxyPage = lazy(() => named(import("@/pages/cabinet/client-proxy"), "ClientProxyPage"));
const ClientSingboxPage = lazy(() => named(import("@/pages/cabinet/client-singbox"), "ClientSingboxPage"));
const ClientTicketsPage = lazy(() => named(import("@/pages/cabinet/client-tickets"), "ClientTicketsPage"));
const ClientCustomBuildPage = lazy(() => named(import("@/pages/cabinet/client-custom-build"), "ClientCustomBuildPage"));
const ClientGiftsPage = lazy(() => named(import("@/pages/cabinet/client-gifts"), "ClientGiftsPage"));
const GiftActivatePage = lazy(() => named(import("@/pages/gift-activate"), "GiftActivatePage"));
const LandingPage = lazy(() => named(import("@/pages/landing"), "LandingPage"));

import type { PublicConfig } from "@/lib/api";

/** Минималистичный fallback пока грузится lazy-chunk страницы. */
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 className="h-7 w-7 animate-spin text-primary/70" />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const hasToken = Boolean(state.accessToken);

  if (!hasToken) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

function ForceChangePassword({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  if (state.admin?.mustChangePassword) {
    return <Navigate to="/admin/change-password" replace />;
  }
  return <>{children}</>;
}

function RequireClientAuth({ children }: { children: React.ReactNode }) {
  const { state } = useClientAuth();
  const location = useLocation();
  const inTelegram = typeof window !== "undefined" && Boolean((window as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData);
  const showMiniappLoading = state.miniappAuthLoading || (inTelegram && !state.token && !state.miniappAuthAttempted);
  if (showMiniappLoading) {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-background to-muted/20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Загрузка кабинета…</p>
      </div>
    );
  }
  if (!state.token) {
    return <Navigate to="/cabinet/login" replace />;
  }
  // Проверяем серверный флаг onboardingCompleted ИЛИ эфемерный isNewTelegramUser
  const needsOnboarding = state.client?.onboardingCompleted === false || state.isNewTelegramUser;
  if (needsOnboarding && location.pathname !== "/cabinet/onboarding") {
    return <Navigate to="/cabinet/onboarding" replace />;
  }
  return <>{children}</>;
}

function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const { state } = useClientAuth();
  const needsOnboarding = state.client?.onboardingCompleted === false || state.isNewTelegramUser;
  if (!needsOnboarding) {
    return <Navigate to="/cabinet/dashboard" replace />;
  }
  return <>{children}</>;
}

function CabinetIndexRedirect() {
  const { state } = useClientAuth();
  const inTelegram = typeof window !== "undefined" && Boolean((window as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData);
  const showMiniappLoading = state.miniappAuthLoading || (inTelegram && !state.token && !state.miniappAuthAttempted);
  if (showMiniappLoading) {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-background to-muted/20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Загрузка кабинета…</p>
      </div>
    );
  }
  return <Navigate to={state.token ? "/cabinet/dashboard" : "/cabinet/login"} replace />;
}

function RootRoute() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getPublicConfig()
      .then((c) => setConfig(c))
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-background to-muted/20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Загрузка…</p>
      </div>
    );
  }

  if (config?.landingEnabled && config?.landingConfig) {
    return <LandingPage config={config} />;
  }

  return <Navigate to="/cabinet" replace />;
}

function AppRoutes() {
  const { state, refreshAccess } = useAuth();

  useEffect(() => {
    if (!state.accessToken && state.refreshToken) {
      refreshAccess();
    }
  }, []);

  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Главная: лендинг (если включён в настройках) или редирект в кабинет */}
      <Route path="/" element={<RootRoute />} />

      {/* Админка */}
      <Route path="/admin/login" element={state.accessToken ? <Navigate to="/admin" replace /> : <LoginPage />} />
      <Route
        path="/admin/change-password"
        element={
          <RequireAuth>
            <ChangePasswordPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route
          index
          element={
            <ForceChangePassword>
              <DashboardPage />
            </ForceChangePassword>
          }
        />
        <Route path="clients" element={<ForceChangePassword><ClientsPage /></ForceChangePassword>} />
        <Route path="tariffs" element={<ForceChangePassword><TariffsPage /></ForceChangePassword>} />
        <Route path="settings" element={<ForceChangePassword><SettingsPage /></ForceChangePassword>} />
        <Route path="promo" element={<ForceChangePassword><PromoPage /></ForceChangePassword>} />
        <Route path="promo-codes" element={<ForceChangePassword><PromoCodesPage /></ForceChangePassword>} />
        <Route path="analytics" element={<ForceChangePassword><AnalyticsPage /></ForceChangePassword>} />
        <Route path="marketing" element={<ForceChangePassword><MarketingPage /></ForceChangePassword>} />
        <Route path="admins" element={<ForceChangePassword><AdminsPage /></ForceChangePassword>} />
        <Route path="sales-report" element={<ForceChangePassword><SalesReportPage /></ForceChangePassword>} />
        <Route path="video-instructions" element={<ForceChangePassword><VideoInstructionsPage /></ForceChangePassword>} />
        <Route path="broadcast" element={<ForceChangePassword><BroadcastPage /></ForceChangePassword>} />
        <Route path="auto-broadcast" element={<ForceChangePassword><AutoBroadcastPage /></ForceChangePassword>} />
        <Route path="proxy" element={<ForceChangePassword><ProxyPage /></ForceChangePassword>} />
        <Route path="singbox" element={<ForceChangePassword><SingboxPage /></ForceChangePassword>} />
        <Route path="backup" element={<ForceChangePassword><BackupPage /></ForceChangePassword>} />
        <Route path="contests" element={<ForceChangePassword><ContestsPage /></ForceChangePassword>} />
        <Route path="tickets" element={<ForceChangePassword><AdminTicketsPage /></ForceChangePassword>} />
        <Route path="referral-network" element={<ForceChangePassword><ReferralNetworkPage /></ForceChangePassword>} />
        <Route path="traffic-abuse" element={<ForceChangePassword><TrafficAbusePage /></ForceChangePassword>} />
        <Route path="api-keys" element={<ForceChangePassword><ApiKeysPage /></ForceChangePassword>} />
        <Route path="languages" element={<ForceChangePassword><LanguagesPage /></ForceChangePassword>} />
        <Route path="api-docs" element={<ForceChangePassword><ApiDocsPage /></ForceChangePassword>} />
        <Route path="geo-map" element={<ForceChangePassword><GeoMapPage /></ForceChangePassword>} />
        <Route path="secondary-subscriptions" element={<ForceChangePassword><AdminSecondarySubscriptionsPage /></ForceChangePassword>} />
        <Route path="tour-constructor" element={<ForceChangePassword><TourConstructorPage /></ForceChangePassword>} />
        <Route path="promo-vpn" element={<ForceChangePassword><GramadsPromoPage /></ForceChangePassword>} />
      </Route>
      {/* Онбординг — вне CabinetLayout (без навбара) */}
      <Route
        path="/cabinet/onboarding"
        element={
          <ClientAuthProvider>
            <RequireClientAuth>
              <RequireOnboarding>
                <ClientOnboardingPage />
              </RequireOnboarding>
            </RequireClientAuth>
          </ClientAuthProvider>
        }
      />

      {/* Публичная страница подарка — без auth */}
      <Route
        path="/gift/:code"
        element={
          <ClientAuthProvider>
            <GiftActivatePage />
          </ClientAuthProvider>
        }
      />

      <Route
        path="/cabinet"
        element={
          <ClientAuthProvider>
            <CabinetLayout />
          </ClientAuthProvider>
        }
      >
        <Route index element={<CabinetIndexRedirect />} />
        <Route path="login" element={<ClientLoginPage />} />
        <Route path="register" element={<ClientRegisterPage />} />
        <Route path="verify-email" element={<ClientVerifyEmailPage />} />
        <Route path="verify-link-email" element={<ClientVerifyLinkEmailPage />} />
        <Route
          path="dashboard"
          element={
            <RequireClientAuth>
              <ClientDashboardPage />
            </RequireClientAuth>
          }
        />
        <Route
          path="tariffs"
          element={
            <RequireClientAuth>
              <ClientTariffsPage />
            </RequireClientAuth>
          }
        />
        <Route
          path="profile"
          element={
            <RequireClientAuth>
              <ClientProfilePage />
            </RequireClientAuth>
          }
        />
        <Route
          path="referral"
          element={
            <RequireClientAuth>
              <ClientReferralPage />
            </RequireClientAuth>
          }
        />
        <Route
          path="tickets"
          element={
            <RequireClientAuth>
              <ClientTicketsPage />
            </RequireClientAuth>
          }
        />
        <Route
          path="subscribe"
          element={
            <RequireClientAuth>
              <ClientSubscribePage />
            </RequireClientAuth>
          }
        />
        <Route
          path="yoomoney-pay"
          element={
            <RequireClientAuth>
              <ClientYooMoneyPayPage />
            </RequireClientAuth>
          }
        />
        <Route
          path="custom-build"
          element={
            <RequireClientAuth>
              <ClientCustomBuildPage />
            </RequireClientAuth>
          }
        />
        <Route
          path="extra-options"
          element={
            <RequireClientAuth>
              <ClientExtraOptionsPage />
            </RequireClientAuth>
          }
        />
        <Route
          path="proxy"
          element={
            <RequireClientAuth>
              <ClientProxyPage />
            </RequireClientAuth>
          }
        />
        <Route
          path="singbox"
          element={
            <RequireClientAuth>
              <ClientSingboxPage />
            </RequireClientAuth>
          }
        />
        <Route
          path="gifts"
          element={
            <RequireClientAuth>
              <ClientGiftsPage />
            </RequireClientAuth>
          }
        />
      </Route>
      {/* Всё неизвестное тоже ведём в кабинет */}
      <Route path="*" element={<Navigate to="/cabinet" replace />} />
    </Routes>
    </Suspense>
  );
}

function TitleAndThemeSync() {
  const location = useLocation();
  const [config, setConfig] = useState<{ serviceName: string; favicon: string | null } | null>(null);

  // Подтягиваем конфиг при смене маршрута (в т.ч. после сохранения настроек), чтобы favicon обновился
  useEffect(() => {
    api
      .getPublicConfig()
      .then((cfg) => {
        setConfig({
          serviceName: cfg.serviceName ?? "",
          favicon: (cfg as { favicon?: string | null }).favicon ?? null,
        });
        // Глобальная тема из настроек
      })
      .catch(() => {
        setConfig({ serviceName: "", favicon: null });
      });
  }, [location.pathname]);

  // Title и favicon
  useEffect(() => {
    const base = config?.serviceName ?? "";
    let suffix = "";
    if (location.pathname.startsWith("/admin")) suffix = " — Admin";
    else if (location.pathname.startsWith("/cabinet")) suffix = " — Кабинет";
    document.title = (base + suffix).trim() || suffix.replace(/^ — /, "").trim();

    const favicon = config?.favicon ?? null;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) {
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = favicon;
      if (favicon.startsWith("data:image/")) {
        const m = favicon.match(/data:image\/(\w+)/);
        link.type = m ? `image/${m[1]}` : "image/png";
      } else {
        link.type = "image/png";
      }
    }
  }, [location.pathname, config]);

  return null;
}

export default function App() {

  return (
    <ThemeProvider >
      <AuthProvider>
        <BrowserRouter future={routerFutureFlags}>
          <AnimatedBackground />
          <TitleAndThemeSync  />
          <AppRoutes />
          <PwaUpdatePrompt />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
