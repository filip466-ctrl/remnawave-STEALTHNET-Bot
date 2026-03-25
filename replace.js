const fs = require('fs');
const path = 'frontend/src/components/layout/dashboard-layout.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Replace navWithSections
const navWithSectionsOld = `const navWithSections: { to: string; label: string; icon: typeof LayoutDashboard; section: string; category: string }[] = [
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
];`;

const navWithSectionsNew = `const navWithSections: { to: string; label: string; icon: typeof LayoutDashboard; section: string; category: string }[] = [
  { to: "/admin", label: "Дашборд", icon: LayoutDashboard, section: "dashboard", category: "ОБЗОР" },
  { to: "/admin/analytics", label: "Аналитика", icon: BarChart3, section: "analytics", category: "ОБЗОР" },
  { to: "/admin/sales-report", label: "Отчёты продаж", icon: FileText, section: "sales-report", category: "ОБЗОР" },
  { to: "/admin/traffic-abuse", label: "Анализ трафика", icon: ShieldAlert, section: "analytics", category: "ОБЗОР" },
  { to: "/admin/clients", label: "Клиенты", icon: Users, section: "clients", category: "УПРАВЛЕНИЕ" },
  { to: "/admin/proxy", label: "Прокси", icon: Globe, section: "proxy", category: "УПРАВЛЕНИЕ" },
  { to: "/admin/singbox", label: "Sing-box", icon: Server, section: "singbox", category: "УПРАВЛЕНИЕ" },
  { to: "/admin/backup", label: "Бэкапы", icon: Database, section: "backup", category: "УПРАВЛЕНИЕ" },
  { to: "/admin/tickets", label: "Тикеты", icon: MessageSquare, section: "tickets", category: "УПРАВЛЕНИЕ" },
  { to: "/admin/tariffs", label: "Тарифы", icon: CreditCard, section: "tariffs", category: "ПОДПИСКА" },
  { to: "/admin/promo", label: "Промо-ссылки", icon: Megaphone, section: "promo", category: "ПОДПИСКА" },
  { to: "/admin/promo-codes", label: "Промокоды", icon: Tag, section: "promo-codes", category: "ПОДПИСКА" },
  { to: "/admin/marketing", label: "Маркетинг", icon: Target, section: "marketing", category: "ПОДПИСКА" },
  { to: "/admin/referral-network", label: "Реф. сеть", icon: Network, section: "clients", category: "ПОДПИСКА" },
  { to: "/admin/broadcast", label: "Рассылка", icon: Send, section: "broadcast", category: "ИНСТРУМЕНТЫ" },
  { to: "/admin/auto-broadcast", label: "Авто-рассылка", icon: CalendarClock, section: "auto-broadcast", category: "ИНСТРУМЕНТЫ" },
  { to: "/admin/contests", label: "Конкурсы", icon: Trophy, section: "contests", category: "ИНСТРУМЕНТЫ" },
  { to: "/admin/settings", label: "Настройки", icon: Settings, section: "settings", category: "НАСТРОЙКИ" },
  { to: "/admin/admins", label: "Менеджеры", icon: UserCog, section: "admins", category: "НАСТРОЙКИ" },
  { to: "/admin/api-keys", label: "API Ключи", icon: Key, section: "settings", category: "НАСТРОЙКИ" },
];`;

content = content.replace(navWithSectionsOld, navWithSectionsNew);

// 2. Replace NavItems categories rendering
const navItemsOld = `  // Order categories as requested or naturally by iteration.
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
                  "group flex items-center gap-3 px-3 py-2.5 mx-3 rounded-xl border transition-all duration-200",
                  isActive
                    ? "border-primary/30 bg-primary/10 shadow-[inset_0_0_15px_rgba(var(--primary),0.15)] text-primary"
                    : "border-transparent text-foreground hover:border-foreground/10 hover:bg-foreground/5 hover:translate-x-1"
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/10 bg-background/50 transition-all duration-300 group-hover:border-primary/50 group-hover:bg-primary/10 group-hover:shadow-[0_0_10px_rgba(var(--primary),0.3)]">
                  <item.icon className={cn("h-4 w-4 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110", isActive && "text-primary")} />
                </div>
                <div className="flex items-center text-[15px] font-bold">
                  <span className="text-foreground/20 font-light mr-1">~/</span>
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );`;

const navItemsNew = `  const categoryOrder = ["ОБЗОР", "УПРАВЛЕНИЕ", "ПОДПИСКА", "ИНСТРУМЕНТЫ", "НАСТРОЙКИ"];
  const sortedCategories = Object.keys(groupedNav).sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b));

  return (
    <>
      {sortedCategories.map((category, index) => (
        <div key={category} className="mb-2 last:mb-0">
          {index > 0 && <div className="mx-4 my-3 border-t border-dotted border-foreground/20"></div>}
          <div className="flex items-center gap-2 px-4 mb-1 mt-2">
            <div className="w-[3px] h-[12px] bg-primary rounded-full"></div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{category}</div>
          </div>
          {groupedNav[category].map((item) => {
            const isActive = isNavActive(location.pathname, item.to);
            return (
              <Link
                key={
