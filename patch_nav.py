import re

with open('frontend/src/components/layout/dashboard-layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_nav = """const navWithSections: { to: string; label: string; icon: typeof LayoutDashboard; section: string }[] = [
  { to: "/admin", label: "Дашборд", icon: LayoutDashboard, section: "dashboard" },
  { to: "/admin/clients", label: "Клиенты", icon: Users, section: "clients" },
  { to: "/admin/tariffs", label: "Тарифы", icon: CreditCard, section: "tariffs" },
  { to: "/admin/proxy", label: "Прокси", icon: Globe, section: "proxy" },
  { to: "/admin/singbox", label: "Sing-box", icon: Server, section: "singbox" },
  { to: "/admin/promo", label: "Промо-ссылки", icon: Megaphone, section: "promo" },
  { to: "/admin/promo-codes", label: "Промокоды", icon: Tag, section: "promo-codes" },
  { to: "/admin/analytics", label: "Аналитика", icon: BarChart3, section: "analytics" },
  { to: "/admin/marketing", label: "Маркетинг", icon: Target, section: "marketing" },
  { to: "/admin/sales-report", label: "Отчёты продаж", icon: FileText, section: "sales-report" },
  { to: "/admin/broadcast", label: "Рассылка", icon: Send, section: "broadcast" },
  { to: "/admin/auto-broadcast", label: "Авто-рассылка", icon: CalendarClock, section: "auto-broadcast" },
  { to: "/admin/backup", label: "Бэкапы", icon: Database, section: "backup" },
  { to: "/admin/contests", label: "Конкурсы", icon: Trophy, section: "contests" },
  { to: "/admin/tickets", label: "Тикеты", icon: MessageSquare, section: "tickets" },
  { to: "/admin/referral-network", label: "Реф. сеть", icon: Network, section: "clients" },
  { to: "/admin/traffic-abuse", label: "Анализ трафика", icon: ShieldAlert, section: "analytics" },
  { to: "/admin/api-keys", label: "API Ключи", icon: Key, section: "settings" },
  { to: "/admin/settings", label: "Настройки", icon: Settings, section: "settings" },
  { to: "/admin/admins", label: "Менеджеры", icon: UserCog, section: "admins" },
];"""

new_nav = """const navWithSections: { to: string; label: string; icon: typeof LayoutDashboard; section: string; category: string }[] = [
  { to: "/admin", label: "Дашборд", icon: LayoutDashboard, section: "dashboard", category: "CORE_SYSTEM" },
  { to: "/admin/clients", label: "Клиенты", icon: Users, section: "clients", category: "CORE_SYSTEM" },
  { to: "/admin/tariffs", label: "Тарифы", icon: CreditCard, section: "tariffs", category: "CORE_SYSTEM" },
  { to: "/admin/proxy", label: "Прокси", icon: Globe, section: "proxy", category: "NETWORK" },
  { to: "/admin/singbox", label: "Sing-box", icon: Server, section: "singbox", category: "NETWORK" },
  { to: "/admin/promo", label: "Промо-ссылки", icon: Megaphone, section: "promo", category: "MARKETING & STATS" },
  { to: "/admin/promo-codes", label: "Промокоды", icon: Tag, section: "promo-codes", category: "MARKETING & STATS" },
  { to: "/admin/analytics", label: "Аналитика", icon: BarChart3, section: "analytics", category: "MARKETING & STATS" },
  { to: "/admin/marketing", label: "Маркетинг", icon: Target, section: "marketing", category: "MARKETING & STATS" },
  { to: "/admin/sales-report", label: "Отчёты продаж", icon: FileText, section: "sales-report", category: "MARKETING & STATS" },
  { to: "/admin/broadcast", label: "Рассылка", icon: Send, section: "broadcast", category: "COMMUNICATION" },
  { to: "/admin/auto-broadcast", label: "Авто-рассылка", icon: CalendarClock, section: "auto-broadcast", category: "COMMUNICATION" },
  { to: "/admin/backup", label: "Бэкапы", icon: Database, section: "backup", category: "TOOLS" },
  { to: "/admin/contests", label: "Конкурсы", icon: Trophy, section: "contests", category: "TOOLS" },
  { to: "/admin/tickets", label: "Тикеты", icon: MessageSquare, section: "tickets", category: "TOOLS" },
  { to: "/admin/referral-network", label: "Реф. сеть", icon: Network, section: "clients", category: "SYSTEM_CONFIG" },
  { to: "/admin/traffic-abuse", label: "Анализ трафика", icon: ShieldAlert, section: "analytics", category: "SYSTEM_CONFIG" },
  { to: "/admin/api-keys", label: "API Ключи", icon: Key, section: "settings", category: "SYSTEM_CONFIG" },
  { to: "/admin/settings", label: "Настройки", icon: Settings, section: "settings", category: "SYSTEM_CONFIG" },
  { to: "/admin/admins", label: "Менеджеры", icon: UserCog, section: "admins", category: "SYSTEM_CONFIG" },
];"""

old_nav_items = """function NavItems({ onClick }: { onClick?: () => void }) {
  const location = useLocation();
  const admin = useAuth().state.admin;
  const nav = admin
    ? navWithSections.filter((item) => canAccessSection(admin.role, admin.allowedSections, item.section))
    : navWithSections;
  return (
    <>
      {nav.map((item) => {
        const isActive = isNavActive(location.pathname, item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClick}
            className={cn(
              "group flex items-center gap-3 px-4 py-2.5 text-sm font-mono font-medium transition-all duration-200",
              isActive
                ? "bg-gradient-to-r from-primary/20 to-transparent border-l-2 border-primary text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                : "text-muted-foreground hover:bg-muted/10 hover:text-foreground hover:translate-x-1 border-l-2 border-transparent"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110" />
            <span>~/ {item.label}</span>
          </Link>
        );
      })}
    </>
  );
}"""

new_nav_items = """function NavItems({ onClick }: { onClick?: () => void }) {
  const location = useLocation();
  const admin = useAuth().state.admin;
  const nav = admin
    ? navWithSections.filter((item) => canAccessSection(admin.role, admin.allowedSections, item.section))
    : navWithSections;
    
  let currentCategory = "";

  return (
    <>
      {nav.map((item) => {
        const isActive = isNavActive(location.pathname, item.to);
        const showCategory = item.category !== currentCategory;
        if (showCategory) currentCategory = item.category;

        return (
          <div key={item.to}>
            {showCategory && (
              <div className="text-[10px] font-bold text-muted-foreground/50 tracking-widest uppercase mt-6 mb-2 ml-2 flex items-center gap-2">
                <span className="text-primary/40">&gt;</span> {item.category}
              </div>
            )}
            <Link
              to={item.to}
              onClick={onClick}
              className={cn(
                "group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-mono font-bold tracking-wide transition-all duration-300 border mb-1",
                isActive
                  ? "bg-primary/10 border-primary/30 text-primary shadow-[inset_0_0_15px_rgba(var(--primary),0.15)]"
                  : "border-transparent text-muted-foreground hover:bg-muted/30 hover:border-white/10 dark:hover:border-white/5 hover:text-foreground hover:translate-x-1"
              )}
            >
              <div className={cn(
                "flex items-center justify-center h-8 w-8 rounded-lg border transition-all duration-300 shrink-0",
                isActive 
                  ? "border-primary/40 bg-primary/20 shadow-[0_0_10px_rgba(var(--primary),0.3)]" 
                  : "border-white/10 dark:border-white/5 bg-background/50 group-hover:border-primary/30 group-hover:bg-primary/10"
              )}>
                <item.icon className={cn(
                  "h-4 w-4 transition-all duration-300",
                  isActive ? "text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.8)]" : "group-hover:text-primary group-hover:scale-110 group-hover:rotate-12"
                )} />
              </div>
              <span className="flex items-center gap-1.5 truncate">
                <span className={cn("font-normal transition-colors shrink-0", isActive ? "text-primary/60" : "text-muted-foreground/40 group-hover:text-primary/50")}>~/</span> 
                <span className="truncate">{item.label}</span>
              </span>
   
