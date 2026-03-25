const fs = require('fs');
const filePath = 'frontend/src/pages/dashboard.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Update CountUpMoney and CountUpNumber
content = content.replace(
  /function CountUpMoney\(\{ value, currency \}: \{ value: number; currency: string \}\) \{([\s\S]*?)<span className="text-slate-800 dark:text-primary dark:drop-shadow-\[0_0_10px_hsl\(var\(--primary\)\/0\.5\)\]">([\s\S]*?)<\/span>/g,
  'function CountUpMoney({ value, currency, className }: { value: number; currency: string; className?: string }) {$1<span className={className || "text-inherit drop-shadow-sm dark:drop-shadow-none"}>$2</span>'
);

content = content.replace(
  /function CountUpNumber\(\{ value \}: \{ value: number \}\) \{([\s\S]*?)<span className="text-slate-800 dark:text-primary dark:drop-shadow-\[0_0_10px_hsl\(var\(--primary\)\/0\.5\)\]">([\s\S]*?)<\/span>/g,
  'function CountUpNumber({ value, className }: { value: number; className?: string }) {$1<span className={className || "text-inherit drop-shadow-sm dark:drop-shadow-none"}>$2</span>'
);

// 2. Update StatCard
const statCardOld = /function StatCard\(\{[\s\S]*?\}\) \{[\s\S]*?return \([\s\S]*?  \);\n\}/;
const statCardNew = `function StatCard({
  index,
  icon: Icon,
  title,
  value,
  subtitle,
  sparkData,
  sparkColor,
  accentColor = "primary",
}: {
  index: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: React.ReactNode;
  subtitle: string;
  sparkData?: { v: number }[];
  sparkColor?: string;
  accentColor?: "primary" | "emerald" | "amber" | "red" | "violet" | "cyan";
}) {
  const colorMap = {
    primary: {
      borderHover: "hover:border-primary/50",
      shadowHover: "hover:shadow-primary/10",
      gradient: "from-transparent via-primary/50 to-transparent",
      bracket: "text-primary/50",
      title: "text-slate-700 dark:text-primary",
      iconBg: "dark:bg-primary/30",
      iconBorder: "dark:border-primary/30",
      iconShadow: "shadow-[0_0_10px_hsl(var(--primary)/0.1)]",
      iconText: "text-slate-800 dark:text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.8)]",
      subtitle: "dark:text-primary/70",
      valueGlow: "text-slate-900 dark:text-white dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]",
    },
    emerald: {
      borderHover: "hover:border-emerald-500/50",
      shadowHover: "hover:shadow-emerald-500/10",
      gradient: "from-transparent via-emerald-500/50 to-transparent",
      bracket: "text-emerald-500/50",
      title: "text-slate-700 dark:text-emerald-500",
      iconBg: "dark:bg-emerald-500/20 bg-emerald-500/10",
      iconBorder: "dark:border-emerald-500/30 border-emerald-500/20",
      iconShadow: "shadow-[0_0_10px_rgba(16,185,129,0.1)]",
      iconText: "text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]",
      subtitle: "dark:text-emerald-500/70 text-emerald-600/70",
      valueGlow: "text-emerald-600 dark:text-emerald-400 dark:drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]",
    },
    amber: {
      borderHover: "hover:border-amber-500/50",
      shadowHover: "hover:shadow-amber-500/10",
      gradient: "from-transparent via-amber-500/50 to-transparent",
      bracket: "text-amber-500/50",
      title: "text-slate-700 dark:text-amber-500",
      iconBg: "dark:bg-amber-500/20 bg-amber-500/10",
      iconBorder: "dark:border-amber-500/30 border-amber-500/20",
      iconShadow: "shadow-[0_0_10px_rgba(245,158,11,0.1)]",
      iconText: "text-amber-600 dark:text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]",
      subtitle: "dark:text-amber-500/70 text-amber-600/70",
      valueGlow: "text-amber-600 dark:text-amber-400 dark:drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]",
    },
    red: {
      borderHover: "hover:border-red-500/50",
      shadowHover: "hover:shadow-red-500/10",
      gradient: "from-transparent via-red-500/50 to-transparent",
      bracket: "text-red-500/50",
      title: "text-slate-700 dark:text-red-500",
      iconBg: "dark:bg-red-500/20 bg-red-500/10",
      iconBorder: "dark:border-red-500/30 border-red-500/20",
      iconShadow: "shadow-[0_0_10px_rgba(239,68,68,0.1)]",
      iconText: "text-red-600 dark:text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]",
      subtitle: "dark:text-red-500/70 text-red-600/70",
      valueGlow: "text-red-600 dark:text-red-400 dark:drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]",
    },
    violet: {
      borderHover: "hover:border-violet-500/50",
      shadowHover: "hover:shadow-violet-500/10",
      gradient: "from-transparent via-violet-500/50 to-transparent",
      bracket: "text-violet-500/50",
      title: "text-slate-700 dark:text-violet-500",
      iconBg: "dark:bg-violet-500/20 bg-violet-500/10",
      iconBorder: "dark:border-violet-500/30 border-violet-500/20",
      iconShadow: "shadow-[0_0_10px_rgba(139,92,246,0.1)]",
      iconText: "text-violet-600 dark:text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]",
      subtitle: "dark:text-violet-500/70 text-violet-600/70",
      valueGlow: "text-violet-600 dark:text-violet-400 dark:drop-shadow-[0_0_12px_rgba(139,92,246,0.5)]",
    },
    cyan: {
      borderHover: "hover:border-cyan-500/50",
      shadowHover: "hover:shadow-cyan-500/10",
      gradient: "from-transparent via-cyan-500/50 to-transparent",
      bracket: "text-cyan-500/50",
      title: "text-slate-700 dark:text-cyan-500",
      iconBg: "dark:bg-cyan-500/20 bg-cyan-500/10",
      iconBorder: "dark:border-cyan-500/30 border-cyan-500/20",
      iconShadow: "shadow-[0_0_10px_rgba(6,182,212,0.1)]",
      iconText: "text-cyan-600 dark:text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]",
      subtitle: "dark:text-cyan-500/70 text-cyan-600/70",
      valueGlow: "text-cyan-600 dark:text-cyan-400 dark:drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]",
    },
  };
  const theme = colorMap[accentColor];

  return (
    <motion.div custom={index} variants={cardVariants} initial="hidden" animate="visible">
      <Card className={\`group relative overflow-hidden bg-white/5 dark:bg-black/40 backdrop-blur-xl border border-white/10 dark:border-primary/30 hover:-translate-y-1 transition-all duration-500 font-mono \${theme.borderHover} \${theme.shadowHover}\`}>
        {/* Scanlines / Matrix background */}
        <div 
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: \`url("data:image/svg+xml,%3Csvg width='24' height='40' viewBox='0 0 24 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40L12 20L0 0M24 40L12 20L24 0' stroke='var(--primary)' stroke-width='1' fill='none' fill-rule='evenodd'/%3E%3C/svg%3E")\`,
          }}
        />
        {/* Terminal Header Bar */}
        <div className={\`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r \${theme.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500\`} />
        
        <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
          <div className="flex items-center gap-2">
            <span className={\`\${theme.bracket} text-xs hidden sm:inline\`}>[</span>
            <CardTitle className={\`text-xs font-bold tracking-widest uppercase \${theme.title}\`}>{title}</CardTitle>
            <span className={\`\${theme.bracket} text-xs hidden sm:inline\`}>]</span>
          </div>
          <motion.div
            className={\`relative flex items-center justify-center h-8 w-8 rounded-none border border-white/20 bg-white/10 \${theme.iconBg} \${theme.iconBorder} \${theme.iconShadow}\`}
            whileHover={{ scale: 1.1, rotate: 90 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <Icon className={\`h-4 w-4 \${theme.iconText}\`} />
          </motion.div>
        </CardHeader>
        <CardContent className="relative pb-4">
          <div className="flex items-end justify-between gap-2 mt-2">
            <div>
              <div className={\`text-2xl font-bold tracking-widest tabular-nums \${theme.valueGlow}\`}>
                {value}
              </div>
              <p className={\`text-[10px] mt-1 tracking-widest uppercase text-slate-500 \${theme.subtitle}\`}>
                &gt; {subtitle}
              </p>
            </div>
            {sparkData && sparkColor && (
              <div className="opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                <Sparkline data={sparkData} color={sparkColor} height={36} width={70} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}`;
content = content.replace(statCardOld, statCardNew);

// 3. Update MiniBar
const minibarOld = /function MiniBar\(\{ value, maxValue, color \}: \{ value: number; maxValue: number; color: string \}\) \{[\s\S]*?return \([\s\S]*?  \);\n\}/;
const minibarNew = `function MiniBar({ value, maxValue, color }: { value: number; maxValue: number; color: string }) {
  const percent = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  const segments = 25;
  const activeSegments = Math.round((percent / 100) * segments);

  return (
    <div className="flex gap-[2px] h-2.5 w-full mt-3">
      {Array.from({ length: segments }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scaleY: 0.2 }}
          animate={{ opacity: i < activeSegments ? 1 : 0.15, scaleY: 1 }}
          transition={{ delay: 0.8 + i * 0.02, duration: 0.3 }}
          className="flex-1 rounded-[1px] bg-slate-300 dark:bg-primary/10"
          style={i < activeSegments ? { backgroundColor: color, boxShadow: \`0 0 8px \${color}\` } : undefined}
        />
      ))}
    </div>
  );
}`;
content = content.replace(minibarOld, minibarNew);

// 4. Update Analytics section in main component
const analyticsOld = /\{\[\s*\{ label: "Новые \(сегодня\)"[\s\S]*?\)\}\]\.map\(\(item, idx\) => \([\s\S]*?<\/motion\.div>\n\s*\)\)}/;
const analyticsNew = `{[
                { label: "Новые (сегодня)", val: stats?.users.newToday, max: analyticsMaxUsers, color: "hsl(var(--primary))", isMoney: false, theme: "primary" },
                { label: "Новые (7 дн.)", val: stats?.users.newLast7Days, max: analyticsMaxUsers, color: "hsl(var(--primary))", isMoney: false, theme: "primary" },
                { label: "Новые (30 дн.)", val: stats?.users.newLast30Days, max: analyticsMaxUsers, color: "hsl(var(--primary))", isMoney: false, theme: "violet" },
                { label: "Продажи (сегодня)", val: stats?.sales.todayAmount, max: analyticsMaxSales, color: "#10b981", isMoney: true, theme: "emerald" },
                { label: "Продажи (7 дн.)", val: stats?.sales.last7DaysAmount, max: analyticsMaxSales, color: "#10b981", isMoney: true, theme: "emerald" },
                { label: "Продажи (30 дн.)", val: stats?.sales.last30DaysAmount, max: analyticsMaxSales, color: "#10b981", isMoney: true, theme: "emerald" },
              ].map((item, idx) => {
                const isEmerald = item.theme === "emerald";
                const isViolet = item.theme === "violet";
                const borderClass = isEmerald ? "border-emerald-500/10 dark:border-emerald-500/20 hover:border-emerald-500/30" : isViolet ? "border-violet-500/10 dark:border-violet-500/20 hover:border-violet-500/30" : "border-white/[0.05] dark:border-primary/20 hover:border-primary/50";
                const bgClass = isEmerald ? "bg-emerald-500/5 dark:bg-emerald-500/10 hover:bg-emerald-500/10" : isViolet ? "bg-violet-500/5 dark:bg-violet-500/10 hover:bg-violet-500/10" : "bg-white/10 dark:bg-primary/10 hover:bg-primary/20";
                const textClass = isEmerald ? "text-emerald-700 dark:text-emerald-400 group-hover:text-emerald-500" : isViolet ? "text-violet-700 dark:text-violet-400 group-hover:text-violet-500" : "text-slate-900 dark:text-white dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]";
                const titleGlow = isEmerald ? "dark:drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]" : isViolet ? "dark:drop-shadow-[0_0_10px_rgba(139,92,246,0.4)]" : "";
                
                return (
                <motion.div
                  key={item.label}
                  className={\`rounded border backdrop-blur-sm p-4 space-y-2 transition-all duration-400 group \${borderClass} \${bgClass}\`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + idx * 0.06, duration: 0.5 }}
                >
                  <p className="text-[10px] tracking-widest uppercase text-slate-500 dark:text-primary/70 group-hover:text-slate-800 dark:group-hover:text-primary transition-colors">
                    &gt; {item.label}
                  </p>
                  <p className={\`text-xl font-bold tabular-nums tracking-widest \${textClass} \${titleGlow}\`}>
                    {stats ? (
                      item.isMoney ? (
                        <CountUpMoney value={item.val ?? 0} currency={defaultCurrency} />
                      ) : (
                        <CountUpNumber value={item.val ?? 0} />
                      )
                    ) : (
                      "—"
                    )}
                  </p>
                  <MiniBar value={item.val ?? 0} maxValue={item.max} color={item.color} />
                </motion.div>
              )})}`;
content = content.replace(analyticsOld, analyticsNew);

// 5. Add accentColors to StatCard usages
content = content.replace(
  /<StatCard\s*index=\{0\}\s*icon=\{Users\}\s*title="Всего пользователей"\s*value=\{stats \? <CountUpNumber value=\{stats\.users\.total\} \/> : "—"\}\s*subtitle="Клиенты панели"\s*\/>/g,
  `<StatCard
            index={0}
            icon={Users}
            title="Всего пользователей"
            value={stats ? <CountUpNumber value={stats.users.total} /> : "—"}
            subtitle="Клиенты панели"
            accentColor="primary"
          />`
);

content = content.replace(
  /<StatCard\s*index=\{1\}\s*icon=\{Shield\}\s*title="Привязано к Remna"\s*value=\{stats \? <CountUpNumber value=\{stats\.users\.withRemna\} \/> : "—"\}\s*subtitle="С remnawaveUuid"\s*\/>/g,
  `<StatCard
            index={1}
            icon={Shield}
            title="Привязано к Remna"
            value={stats ? <CountUpNumber value={stats.users.withRemna} /> : "—"}
            subtitle="С remnawaveUuid"
            accentColor="cyan"
          />`
);

content = content.replace(
  /<StatCard\s*index=\{2\}\s*icon=\{UserPlus\}\s*title="Новых сегодня"\s*value=\{stats \? <CountUpNumber value=\{stats\.users\.newToday\} \/> : "—"\}\s*subtitle="Регистрации за день"\s*\/>/g,
  `<StatCard
            index={2}
            icon={UserPlus}
            title="Новых сегодня"
            value={stats ? <CountUpNumber value={stats.users.newToday} /> : "—"}
            subtitle="Регистрации за день"
            accentColor="emerald"
          />`
);

content = content.replace(
  /<StatCard\s*index=\{3\}\s*icon=\{TrendingUp\}\s*title="Новых за 30 дней"\s*value=\{stats \? <CountUpNumber value=\{stats\.users\.newLast30Days\} \/> : "—"\}\s*subtitle="Регистрации"\s*\/>/g,
  `<StatCard
            index={3}
            icon={TrendingUp}
            title="Новых за 30 дней"
            value={stats ? <CountUpNumber value={stats.users.newLast30Days} /> : "—"}
            subtitle="Регистрации"
            accentColor="violet"
          />`
);

// 6. Update Sales Analytics text colors
content = content.replace(
  /className="text-2xl font-bold tabular-nums tracking-widest mt-1 text-slate-900 dark:text-white dark:drop-shadow-\[0_0_10px_rgba\(255,255,255,0\.3\)\]"/g,
  'className="text-2xl font-bold tabular-nums tracking-widest mt-1 text-emerald-600 dark:text-emerald-400 dark:drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"'
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log("Patch applied successfully!");
