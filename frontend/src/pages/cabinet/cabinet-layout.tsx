import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useClientAuth } from "@/contexts/client-auth";
import { CabinetConfigProvider, useCabinetConfig } from "@/contexts/cabinet-config";
import { createContext, useContext } from "react";
import { useIsMiniapp } from "@/hooks/use-is-miniapp";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Package, User, LogOut, Shield, Users, Sun, Moon, PlusCircle, Globe, KeyRound, MessageSquare, Palette, Monitor } from "lucide-react";
import { useTheme, ACCENT_PALETTES, type ThemeMode, type ThemeAccent } from "@/contexts/theme";
import { cn } from "@/lib/utils";

function AnalyticsScripts() {
  useEffect(() => {
    api.getPublicConfig().then((c) => {
      if (c.googleAnalyticsId?.trim()) {
        const id = c.googleAnalyticsId.trim();
        if (document.getElementById("ga4-script")) return;
        const script = document.createElement("script");
        script.id = "ga4-script";
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
        document.head.appendChild(script);
        const init = document.createElement("script");
        init.id = "ga4-init";
        init.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`;
        document.head.appendChild(init);
      }
      if (c.yandexMetrikaId?.trim()) {
        const id = c.yandexMetrikaId.trim();
        const ymId = /^\d+$/.test(id) ? id : "0";
        if (document.getElementById("ym-script")) return;
        const script = document.createElement("script");
        script.id = "ym-script";
        script.async = true;
        script.textContent = `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r)return;}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");ym(${ymId}, "init", {clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`;
        document.head.appendChild(script);
      }
    }).catch(() => {});
  }, []);
  return null;
}

const IsMiniappContext = createContext(false);
export function useCabinetMiniapp() {
  return useContext(IsMiniappContext);
}

const ALL_NAV_ITEMS = [
  { to: "/cabinet/dashboard", label: "Главная", icon: LayoutDashboard },
  { to: "/cabinet/tariffs", label: "Тарифы", icon: Package },
  { to: "/cabinet/extra-options", label: "Опции", icon: PlusCircle },
  { to: "/cabinet/proxy", label: "Прокси", icon: Globe },
  { to: "/cabinet/singbox", label: "Доступы", icon: KeyRound },
  { to: "/cabinet/referral", label: "Рефералы", icon: Users },
  { to: "/cabinet/tickets", label: "Тикеты", icon: MessageSquare },
  { to: "/cabinet/profile", label: "Профиль", icon: User },
];

const MODE_OPTIONS: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Светлая" },
  { value: "dark", icon: Moon, label: "Тёмная" },
  { value: "system", icon: Monitor, label: "Система" },
];

function ThemePopover() {
  const [show, setShow] = useState(false);
  const { config: themeConfig, setMode, setAccent, allowUserThemeChange } = useTheme();

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 px-2 bg-background/20 hover:bg-background/40" onClick={() => setShow(!show)}>
        <Palette className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Тема</span>
      </Button>
      {show && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShow(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border bg-card p-4 shadow-xl">
            <p className="text-xs font-medium text-muted-foreground mb-2">Режим</p>
            <div className="flex gap-1 mb-4">
              {MODE_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => setMode(opt.value)}
                  className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                    themeConfig.mode === opt.value ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted")}>
                  <opt.icon className="h-3.5 w-3.5" />{opt.label}
                </button>
              ))}
            </div>
            
            {allowUserThemeChange && (
              <>
                <p className="text-xs font-medium text-muted-foreground mb-2">Акцент</p>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.entries(ACCENT_PALETTES) as [ThemeAccent, typeof ACCENT_PALETTES["default"]][]).map(([key, palette]) => (
                    <button key={key} onClick={() => setAccent(key)}
                      className={cn("flex flex-col items-center gap-1 rounded-lg p-2 text-[10px] transition-all",
                        themeConfig.accent === key ? "ring-2 ring-primary bg-muted scale-105" : "hover:bg-muted/50")}>
                      <div className="h-6 w-6 rounded-full border-2 border-foreground/10" style={{ backgroundColor: palette.swatch }} />
                      <span className="text-muted-foreground truncate w-full text-center">{palette.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function resolveNavItems(config: { sellOptionsEnabled?: boolean; showProxyEnabled?: boolean; showSingboxEnabled?: boolean; ticketsEnabled?: boolean } | null) {
  let items = ALL_NAV_ITEMS;
  if (!config?.sellOptionsEnabled) items = items.filter((i) => i.to !== "/cabinet/extra-options");
  if (!config?.showProxyEnabled) items = items.filter((i) => i.to !== "/cabinet/proxy");
  if (!config?.showSingboxEnabled) items = items.filter((i) => i.to !== "/cabinet/singbox");
  if (!config?.ticketsEnabled) items = items.filter((i) => i.to !== "/cabinet/tickets");
  return items;
}

function MobileCabinetShell() {
  const location = useLocation();
  const { state, logout, refreshProfile } = useClientAuth();
  const config = useCabinetConfig();
  const navItems = useMemo(() => resolveNavItems(config), [config?.sellOptionsEnabled, config?.showProxyEnabled, config?.showSingboxEnabled, config?.ticketsEnabled]);
  const [logoError, setLogoError] = useState(false);
  useEffect(() => { setLogoError(false); }, [config?.logo]);
  useEffect(() => {
    if (state.token) refreshProfile().catch(() => {});
  }, [state.token, refreshProfile]);
  const serviceName = config?.serviceName ?? "";
  const logo = config?.logo && !logoError ? config.logo : null;

  return (
    <div className="min-h-svh flex flex-col bg-transparent min-w-0 overflow-x-hidden pb-20">
      <header className="sticky top-0 z-50 border-b border-border bg-card/40 backdrop-blur-xl shrink-0 transition-all duration-300" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex h-14 items-center justify-between gap-3 px-4 min-w-0 w-full max-w-7xl mx-auto">
          <Link to="/cabinet/dashboard" className="flex items-center gap-2.5 font-semibold text-base tracking-tight shrink-0 min-w-0">
            {logo ? (
              <img src={logo} alt="" className="h-8 w-8 rounded-lg object-contain bg-background/50 shrink-0 shadow-sm" onError={() => setLogoError(true)} />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary shadow-sm">
                <Shield className="h-4 w-4" />
              </span>
            )}
            {serviceName ? <span className="truncate">{serviceName}</span> : null}
          </Link>
          <div className="flex items-center gap-1.5 shrink-0">
            <ThemePopover />
            <Button variant="ghost" size="icon" className="shrink-0 bg-background/20 hover:bg-background/40 text-muted-foreground hover:text-foreground" asChild>
              <Link to="/cabinet/login" onClick={() => logout()} title="Выйти">
                <LogOut className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full min-w-0 px-4 py-6 max-w-7xl mx-auto transition-all duration-300">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/60 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] transition-all duration-300">
        <div className="flex items-center w-full overflow-x-auto no-scrollbar h-[4.5rem] px-2">
          <div className="flex items-center justify-between sm:justify-center w-full min-w-max gap-1 md:gap-2 mx-auto">
            {navItems.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-1 px-1 h-14 flex-1 min-w-[4.2rem] max-w-[6rem] rounded-xl transition-all duration-300",
                    active ? "bg-primary/20 text-primary shadow-sm scale-105" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground hover:scale-105"
                  )}
                >
                  <Icon className={cn("h-5 w-5 shrink-0 transition-transform duration-300", active && "scale-110 drop-shadow-md")} />
                  <span className="text-[10px] font-medium leading-none tracking-tight whitespace-nowrap">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      ` }} />
    </div>
  );
}

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    setMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return mobile;
}

function CabinetShell() {
  const location = useLocation();
  const { state, logout, refreshProfile } = useClientAuth();
  const config = useCabinetConfig();
  const navItems = useMemo(() => resolveNavItems(config), [config?.sellOptionsEnabled, config?.showProxyEnabled, config?.showSingboxEnabled, config?.ticketsEnabled]);
  const isMiniapp = useIsMiniapp();
  const isMobile = useIsMobile();
  const [logoError, setLogoError] = useState(false);
  useEffect(() => { setLogoError(false); }, [config?.logo]);
  useEffect(() => {
    if (state.token) refreshProfile().catch(() => {});
  }, [state.token, refreshProfile]);
  const serviceName = config?.serviceName ?? "";
  const logo = config?.logo && !logoError ? config.logo : null;

  if (isMiniapp || isMobile) {
    return <MobileCabinetShell />;
  }

  return (
    <div className="min-h-svh flex flex-col bg-transparent">
      <header className="sticky top-0 z-50 border-b border-border bg-card/40 backdrop-blur-xl shadow-sm transition-all duration-300">
        <div className="w-full max-w-7xl mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <Link to="/cabinet/dashboard" className="flex items-center gap-2.5 font-semibold text-lg tracking-tight shrink-0 hover:opacity-80 transition-opacity">
            {logo ? (
              <img src={logo} alt="" className="h-9 w-9 rounded-lg object-contain bg-background/50 shadow-sm" onError={() => setLogoError(true)} />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary shadow-sm">
                <Shield className="h-5 w-5" />
              </span>
            )}
            {serviceName ? <span className="hidden sm:inline truncate">{serviceName}</span> : null}
          </Link>
          <nav className="flex items-center gap-1 flex-wrap justify-center flex-1">
            {navItems.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link key={to} to={to}>
                  <Button
                    variant={active ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "inline-flex items-center gap-2 whitespace-nowrap transition-all duration-300",
                      active ? "bg-primary/20 hover:bg-primary/30 text-primary shadow-sm scale-105" : "hover:scale-105 hover:bg-background/40"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Button>
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <ThemePopover />
            <span className="max-w-[160px] truncate text-sm text-muted-foreground bg-background/30 px-3 py-1.5 rounded-full border border-border" title={state.client?.email?.trim() || (state.client?.telegramUsername ? `@${state.client.telegramUsername}` : "")}>
              {state.client?.email?.trim() ? state.client.email : state.client?.telegramUsername ? `@${state.client.telegramUsername}` : "—"}
            </span>
            <Button variant="outline" size="sm" className="inline-flex items-center gap-2 whitespace-nowrap bg-background/50 hover:bg-background/80 transition-all hover:scale-105" asChild>
              <Link to="/cabinet/login" onClick={() => logout()}>
                <LogOut className="h-4 w-4 shrink-0" />
                Выйти
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
}

export function CabinetLayout() {
  const location = useLocation();
  const { state } = useClientAuth();
  const isAuthPage = location.pathname === "/cabinet/login" || location.pathname === "/cabinet/register";
  const isLoggedIn = Boolean(state.token);

  return (
    <>
      <AnalyticsScripts />
      {isAuthPage || !isLoggedIn ? (
        <Outlet />
      ) : (
        <CabinetConfigProvider>
          <CabinetShellWithMiniapp />
        </CabinetConfigProvider>
      )}
    </>
  );
}

function CabinetShellWithMiniapp() {
  const isMiniapp = useIsMiniapp();
  const isMobile = useIsMobile();
  return (
    <IsMiniappContext.Provider value={isMiniapp || isMobile}>
      <CabinetShell />
    </IsMiniappContext.Provider>
  );
}
