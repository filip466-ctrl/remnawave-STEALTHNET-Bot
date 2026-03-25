import re

file_path = 'frontend/src/pages/dashboard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update CountUpMoney and CountUpNumber
content = re.sub(
    r'function CountUpMoney\(\{ value, currency \}: \{ value: number; currency: string \}\) \{([\s\S]*?)<span className="text-slate-800 dark:text-primary dark:drop-shadow-\[0_0_10px_hsl\(var\(--primary\)/0\.5\)\]">([\s\S]*?)</span>',
    r'function CountUpMoney({ value, currency, className }: { value: number; currency: string; className?: string }) {\1<span className={className || "text-inherit drop-shadow-sm dark:drop-shadow-none"}>\2</span>',
    content
)

content = re.sub(
    r'function CountUpNumber\(\{ value \}: \{ value: number \}\) \{([\s\S]*?)<span className="text-slate-800 dark:text-primary dark:drop-shadow-\[0_0_10px_hsl\(var\(--primary\)/0\.5\)\]">([\s\S]*?)</span>',
    r'function CountUpNumber({ value, className }: { value: number; className?: string }) {\1<span className={className || "text-inherit drop-shadow-sm dark:drop-shadow-none"}>\2</span>',
    content
)

# 2. Update StatCard Definition and Body
stat_card_new = '''function StatCard({
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
      <Card className={`group relative overflow-hidden bg-white/5 dark:bg-black/40 backdrop-blur-xl border border-white/10 dark:border-primary/30 hover:-translate-y-1 transition-all duration-500 font-mono ${theme.borderHover} ${theme.shadowHover}`}>
        {/* Scanlines / Matrix background */}
        <div 
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='40' viewBox='0 0 24 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40L12 20L0 0M24 40L12 20L24 0' stroke='var(--primary)' stroke-width='1' fill='none' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          }}
        />
        {/* Terminal Header Bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
        
        <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
          <div className="flex items-center gap-2">
            <span className={`${theme.bracket} text-xs hidden sm:inline`}>[</span>
            <CardTitle className={`text-xs font-bold tracking-widest uppercase ${theme.title}`}>{title}</CardTitle>
            <span className={`${theme.bracket} text-xs hidden sm:inline`}>]</span>
          </div>
          <motion.div
            className={`relative flex items-center justify-center h-8 w-8 rounded-none border border-white/20 bg-white/10 ${theme.iconBg} ${theme.iconBorder} ${theme.iconShadow}`}
            whileHover={{ scale: 1.1, rotate: 90 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <Icon className={`h-4 w-4 ${theme.iconText}`} />
          </motion.div>
        </CardHeader>
        <CardContent className="relative pb-4">
          <div className="flex items-end justify-between gap-2 mt-2">
            <div>
              <div className={`text-2xl font-bold tracking-widest tabular-nums ${theme.valueGlow}`}>
                {value}
              </div>
              <p className={`text-[10px] mt-1 tracking-widest uppercase text-slate-500 ${theme.subtitle}`}>
             
