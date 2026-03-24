import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, LayoutDashboard, Users, CreditCard, Settings, LogOut, KeyRound,
  Megaphone, Tag, BarChart3, FileText, ExternalLink, Sun, Moon, Monitor,
  Palette, Menu, X, Database, Target, UserCog, Send, CalendarClock, Globe, Server, MessageSquare, Trophy,
  Network, ShieldAlert, Key,
} from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { useTheme, ACCENT_PALETTES, type ThemeMode, type ThemeAccent } from "@/contexts/theme";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, type AdminNotificationCounters } from "@/lib/api";

const PANEL_VERSION = "3.2.6";
const GITHUB_URL = "https://github.com/systemmaster1200-eng/remnawave-STEALTHNET-Bot";

const navWithSections: { to: string; label: string; icon: typeof LayoutDashboard; section: string; category: string }[] = [
  { to: "/admin", label: "Дашборд", icon: LayoutDashboard, section: "dashboard", category: "CORE_SYSTEM" },
  { to: "/admin/clients", label: "Клиенты", icon: Users, section: "clients", category: "CORE_SYSTEM" },
  { to: "/admin/tariffs", label: "Тарифы", icon: CreditCard, section: "tariffs", category: "SALES_&_MARKETING" },
  { to: "/admin/proxy", label: "Прокси", icon: Globe, section: "proxy", category: "INFRASTRUCTURE" },
  { to: "/admin/singbox", label: "Sing-box", icon: Server, section: "singbox", category: "INFRASTRUCTURE" },
  { to: "/admin/promo", label: "Промо-ссылки", icon: Megaphone, section: "promo", category: "SALES_&_MARKETING" },
  { to: "/admin/promo-codes", label: "Промокоды", icon: Tag, section: "promo-codes", category: "SALES_&_MARKETING" },
  { to: "/admin/analytics", label: "Аналитика", icon: BarChart3, section: "analytics", category: "CORE_SYSTEM" },
  { to: "/admin/marketing", label: "Маркетинг", icon: Target, section: "marketing", category: "SALES_&_MARKETING" },
  { to: "/admin/sales-report", label: "Отчёты продаж", icon: FileText, section: "sales-report", category: "SALES_&_MARKETING" },
  { to: "/admin/broadcast", label: "Рассылка", icon: Send, section: "broadcast", category: "SALES_&_MARKETING" },
  { to: "/admin/auto-broadcast", label: "Авто-рассылка", icon: CalendarClock, section: "auto-broadcast", category: "SALES_&_MARKETING" },
  { to: "/admin/backup", label: "Бэкапы", icon: Database, section: "backup", category: "INFRASTRUCTURE" },
  { to: "/admin/contests", label: "Конкурсы", icon: Trophy, section: "contests", category: "SALES_&_MARKETING" },
  { to: "/admin/tickets", label: "Тикеты", icon: MessageSquare, section: "tickets", category: "CORE_SYSTEM" },
  { to: "/admin/referral-network", label: "Реф. сеть", icon: Network, section: "clients", category: "SALES_&_MARKETING" },
  { to: "/admin/traffic-abuse", label: "Анализ трафика", icon: ShieldAlert, section: "analytics", category: "ACCESS_&_SECURITY" },
  { to: "/admin/api-keys", label: "API Ключи", icon: Key, section: "settings", category: "ACCESS_&_SECURITY" },
  { to: "/admin/settings", label: "Настройки", icon: Settings, section: "settings", category: "CORE_SYSTEM" },
  { to: "/admin/admins", label: "Менеджеры", icon: UserCog, section: "admins", category: "ACCESS_&_SECURITY" },
];

function canAccessSection(role: string, allowedSections: string[] | undefined, section: string): boolean {
  if (role === "ADMIN") return true;
  if (section === "admins") return false;
  return Array.isArray(allowedSections) && allowedSections.includes(section);
}

const MODE_OPTIONS: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Светлая" },
  { value: "dark", icon: Moon, label: "Тёмная" },
  { value: "system", icon: Monitor, label: "Система" },
];

function isNavActive(pathname: string, to: string): boolean {
  if (to === "/admin") return pathname === "/admin";
  if (pathname === to) return true;
  if (pathname.startsWith(to)) {
    const next = pathname[to.length];
    return next === "/" || next === undefined;
  }
  return false;
}

function NavItems({ onClick }: { onClick?: () => void }) {
  const location = useLocation();
  const admin = useAuth().state.admin;
  const nav = admin
    ? navWithSections.filter((item) => canAccessSection(admin.role, admin.allowedSections, item.section))
    : navWithSections;

  const groupedNav = nav.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof navWithSections>);

  // Order categories as requested or naturally by iteration.
  // The predefined categories were: CORE_SYSTEM, SALES_&_MARKETING, INFRASTRUCTURE, ACCESS_&_SECURITY
  const categoryOrder = ["CORE_SYSTEM", "SALES_&_MARKETING", "INFRASTRUCTURE", "ACCESS_&_SECURITY"];
  const sortedCategories = Object.keys(groupedNav).sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b));

  return (
    <>
      {sortedCategories.map((category) => (
        <div key={category} className="mb-2 last:mb-0">
          <div className="px-4 pt-4 pb-1 text-[10px] font-mono font-bold text-muted-foreground/60 tracking-widest">
            {"> " + category}
          </div>
          {groupedNav[category].map((item) => {
            const isActive = isNavActive(location.pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClick}
                className={cn(
                  "group flex items-center gap-3 px-4 py-2.5 text-sm font-mono font-bold transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-primary/20 to-transparent border-l-2 border-primary text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                    : "text-muted-foreground hover:bg-muted/10 hover:text-foreground hover:translate-x-1 border-l-2 border-transparent"
                )}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-white/10 bg-background/50 transition-all duration-300 group-hover:border-primary/50 group-hover:bg-primary/10 group-hover:shadow-[0_0_10px_rgba(var(--primary),0.3)]">
                  <item.icon className="h-4 w-4 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110" />
                </div>
                <span>~/ {item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}

export function DashboardLayout() {
  const { state, logout } = useAuth();
  const { config: themeConfig, setMode, setAccent } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [brand, setBrand] = useState<{ serviceName: string; logo: string | null }>({ serviceName: "", logo: null });
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationToasts, setNotificationToasts] = useState<{ id: number; text: string; icon: string }[]>([]);
  const lastCountersRef = useRef<AdminNotificationCounters | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    const admin = state.admin;
    if (!admin || admin.role !== "MANAGER") return;
    const path = location.pathname.replace(/^\/admin\/?/, "") || "dashboard";
    const section = path.split("/")[0] || "dashboard";
    const allowed = admin.allowedSections ?? [];
    if (section === "admins" || !allowed.includes(section)) {
      const first = allowed[0];
      const to = !first ? "/admin" : first === "dashboard" ? "/admin" : `/admin/${first}`;
      navigate(to, { replace: true });
    }
  }, [state.admin, location.pathname, navigate]);

  useEffect(() => {
    const token = state.accessToken;
    if (token) {
      api.getSettings(token).then((s) => {
        setBrand({ serviceName: s.serviceName, logo: s.logo ?? null });
        setNotificationsEnabled(s.adminFrontNotificationsEnabled ?? true);
      }).catch(() => {});
    }
  }, [state.accessToken]);

  useEffect(() => {
    const token = state.accessToken;
    if (!token || !notificationsEnabled) return;
    let cancelled = false;
    const pushToast = (text: string, icon = "") => {
      const id = Date.now() + Math.random();
      setNotificationToasts((prev) => [...prev, { id, text, icon }]);
      window.setTimeout(() => { setNotificationToasts((prev) => prev.filter((t) => t.id !== id)); }, 5000);
    };
    const fetchCounters = async () => {
      try {
        const data = await api.getAdminNotificationCounters(token);
        if (cancelled) return;
        const last = lastCountersRef.current;
        if (last) {
          const newClients = data.totalClients - last.totalClients;
          const newPayments = data.totalTariffPayments - last.totalTariffPayments;
          const newTopups = data.totalBalanceTopups - last.totalBalanceTopups;
          const newTickets = data.totalTickets - last.totalTickets;
          if (newClients > 0) pushToast(newClients === 1 ? "Новый клиент зарегистрировался" : `+${newClients} новых клиентов`, "\u{1F464}");
          if (newPayments > 0) pushToast(newPayments === 1 ? "Новая оплата тарифа" : `+${newPayments} оплат тарифов`, "\u{1F4E6}");
          if (newTopups > 0) pushToast(newTopups === 1 ? "Пополнение баланса" : `+${newTopups} пополнений баланса`, "\u{1F4B0}");
          if (newTickets > 0) pushToast(newTickets === 1 ? "Новый тикет" : `+${newTickets} новых тикетов`, "\u{1F4AC}");
        }
        lastCountersRef.current = data;
      } catch { /* ignore */ }
    };
    fetchCounters();
    const id = window.setInterval(fetchCounters, 15000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [state.accessToken, notificationsEnabled]);

  async function handleLogout() {
    await logout();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="flex min-h-svh bg-background/50 relative overflow-hidden">
      {/* ═══ Desktop sidebar ═══ */}
      <aside className="hidden md:flex flex-col shrink-0 fixed left-0 top-3 bottom-3 w-[280px] z-50 rounded-r-[2rem] border-y border-r border-white/10 bg-card/60 backdrop-blur-xl shadow-[20px_0_40px_-10px_rgba(0,0,0,0.3)] transition-all overflow-hidden">
        {/* Matrix background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.06] dark:opacity-10 z-0">
          <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="matrix-grid-sidebar" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#matrix-grid-sidebar)" />
          </svg>
        </div>

        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4 relative z-10">
          {brand.logo ? (
            <img src={brand.logo} alt="" className="h-8 w-auto object-contain" />
          ) : (
            <Shield className="h-6 w-6 text-primary shrink-0" />
          )}
          {brand.serviceName ? <span className="font-semibold truncate">{brand.serviceName}</span> : null}
        </div>
        <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto relative z-10">
          <NavItems />
        </nav>
        <div className="border-t border-white/10 p-4 space-y-1.5 relative z-10">
          <div className="text-xs text-muted-foreground truncate px-3 py-1 flex items-center gap-2 font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            [ SYS_ONLINE ]
          </div>
          <div className="text-xs text-muted-foreground truncate px-3 py-1 font-mono">{state.admin?.email}</div>
          <Link to="/admin/change-password" className="block">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 font-mono hover:bg-primary/10 hover:text-primary transition-all">
              <KeyRound className="h-4 w-4" />
              [ SEC: PASS_CHANGE ]
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start gap-2 font-mono text-red-500/80 hover:bg-red-500/20 hover:text-red-400 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            [ EXEC: LOGOUT ]
          </Button>
        </div>
      </aside>

      {/* ═══ Mobile sidebar overlay ═══ */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)} />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-[280px] flex flex-col md:hidden bg-card/95 backdrop-blur-xl border-r border-white/10 shadow-[20px_0_40px_-10px_rgba(0,0,0,0.3)] overflow-hidden"
            >
              {/* Matrix background */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.06] dark:opacity-10 z-0">
                <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="matrix-grid-sidebar-mobile" width="24" height="24" patternUnits="userSpaceOnUse">
                      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#matrix-grid-sidebar-mobile)" />
                </svg>
              </div>

              <div className="flex h-14 items-center justify-between gap-2 border-b border-white/10 px-4 relative z-10">
                <div className="flex items-center gap-2 min-w-0">
                  {brand.logo ? <img src={brand.logo} alt="" className="h-8 w-auto object-contain" /> : <Shield className="h-6 w-6 text-primary shrink-0" />}
                  {brand.serviceName ? <span className="font-semibold truncate">{brand.serviceName}</span> : null}
                </div>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto relative z-10">
                <NavItems onClick={() => setMobileMenuOpen(false)} />
              </nav>
              <div className="border-t border-white/10 p-4 space-y-1.5 relative z-10">
                <div className="text-xs text-muted-foreground truncate px-3 py-1 flex items-center gap-2 font-mono">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  [ SYS_ONLINE ]
                </div>
                <div className="text-xs text-muted-foreground truncate px-3 py-1 font-mono">{state.admin?.email}</div>
                <Link to="/admin/change-password" className="block" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 font-mono hover:bg-primary/10 hover:text-primary transition-all">
                    <KeyRound className="h-4 w-4" />
                    [ SEC: PASS_CHANGE ]
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start gap-2 font-mono text-red-500/80 hover:bg-red-500/20 hover:text-red-400 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all" 
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  [ EXEC: LOGOUT ]
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ═══ Main content ═══ */}
      <main className="flex-1 overflow-auto min-w-0 flex flex-col relative z-0 md:pl-[280px] w-full">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-2 px-4 md:pr-6 md:-ml-[280px] md:pl-[calc(280px+1.5rem)] bg-card/60 backdrop-blur-xl border-b border-white/10 md:border-r rounded-none md:rounded-br-[2rem] mb-6 md:mb-10 shadow-sm md:mr-6 transition-all">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            {brand.serviceName ? <span className="text-sm text-muted-foreground md:hidden truncate">{brand.serviceName}</span> : null}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 px-2" onClick={() => setShowThemePanel(!showThemePanel)}>
                <Palette className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Тема</span>
              </Button>
              {showThemePanel && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowThemePanel(false)} />
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
                    <p className="text-xs font-medium text-muted-foreground mb-2">Акцент</p>
                    <div className="grid grid-cols-4 gap-2">
                      {(Object.entries(ACCENT_PALETTES) as [ThemeAccent, typeof ACCENT_PALETTES["default"]][]).map(([key, palette]) => (
                        <button key={key} onClick={() => setAccent(key)}
                          className={cn("flex flex-col items-center gap-1 rounded-lg p-2 text-[10px] transition-all",
                            themeConfig.accent === key ? "ring-2 ring-primary bg-muted" : "hover:bg-muted/50")}>
                          <div className="h-6 w-6 rounded-full border-2 border-foreground/10" style={{ backgroundColor: palette.swatch }} />
                          <span className="text-muted-foreground truncate w-full text-center">{palette.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent">
              <Shield className="h-3 w-3" />Версия {PANEL_VERSION}<ExternalLink className="h-3 w-3 opacity-50" />
            </a>
          </div>
        </header>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="flex-1 px-4 md:px-6 pb-6">
          <Outlet />
        </motion.div>
      </main>

      {notificationToasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {notificationToasts.map((t) => (
            <div key={t.id} className="max-w-xs rounded-lg border bg-card px-4 py-3 text-sm shadow-lg flex items-center gap-2 animate-in slide-in-from-right-5 fade-in duration-300">
              {t.icon && <span className="text-base shrink-0">{t.icon}</span>}
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
