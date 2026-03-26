import re

with open('frontend/src/pages/analytics.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace GlassCard
old_glass_card = """function GlassCard({
  children,
  animIndex = 0,
}: {
  children: React.ReactNode;
  animIndex?: number;
}) {
  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={animIndex}>
      <Card className="group relative overflow-hidden bg-white/5 dark:bg-white/5 bg-gradient-to-br from-white/5 to-transparent dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-md border border-white/10 dark:border-white/10 hover:border-white/20 dark:hover:border-primary/50 transition-all duration-500 font-mono">
        {/* Matrix background */}
        <div 
          className="absolute inset-0 opacity-[0.06] dark:opacity-[0.10] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='40' viewBox='0 0 24 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40L12 20L0 0M24 40L12 20L24 0' stroke='var(--primary)' stroke-width='1' fill='none' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          }}
        />
        {/* Inner scanline sweep */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.05] to-transparent h-[10%] w-full pointer-events-none"
          animate={{ y: ["-100%", "1000%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />
        {children}
      </Card>
    </motion.div>
  );
}"""

new_glass_card = """function GlassCard({
  children,
  animIndex = 0,
  className = "",
}: {
  children: React.ReactNode;
  animIndex?: number;
  className?: string;
}) {
  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={animIndex} className={`h-full ${className}`}>
      <Card className="group relative overflow-hidden bg-white dark:bg-[#1C1C1E]/95 shadow-sm border border-slate-200 dark:border-[#2a2b2e] hover:border-slate-300 dark:hover:border-[#3a3b3e] transition-all duration-500 font-mono h-full flex flex-col">
        {/* macOS Terminal Dots */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 dark:border-[#2a2b2e]/50 bg-slate-50/50 dark:bg-[#1C1C1E]">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
        </div>
        <div className="flex-1 flex flex-col relative z-10">
          {children}
        </div>
      </Card>
    </motion.div>
  );
}"""

# Replace MetricCard
old_metric_card = """function MetricCard({
  index = 0,
  icon: Icon,
  label,
  value,
  sub,
  color: _color,
}: {
  index?: number;
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  const theme = {
    borderHover: "hover:border-primary/50",
    shadowHover: "hover:shadow-primary/10",
    gradient: "from-transparent via-primary/50 to-transparent",
    bracket: "text-primary/50",
    title: "text-slate-800 dark:text-slate-300",
    iconBg: "bg-primary/10",
    iconBorder: "border-primary/20",
    iconShadow: "shadow-[0_0_15px_hsl(var(--primary)/0.2)]",
    iconText: "text-primary",
    subtitle: "text-primary/70",
    valueGlow: "drop-shadow-[0_0_12px_hsl(var(--primary)/0.3)]",
  };

  const renderValue = () => {
    if (typeof value === "string" && value.includes(" / ")) {
      const parts = value.split(" / ");
      return (
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
          {parts.map((part, i) => (
            <Fragment key={i}>
              <div className={`px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white ${theme.valueGlow}`}>
                {part}
              </div>
              {i < parts.length - 1 && (
                <span className="text-primary/40 font-bold text-sm">/</span>
              )}
            </Fragment>
          ))}
        </div>
      );
    }
    return (
      <div className={`text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-1.5 ${theme.valueGlow}`}>
        {value}
      </div>
    );
  };

  return (
    <motion.div custom={index} variants={cardVariants} initial="hidden" animate="visible" className="h-full">
      <Card className={`group relative h-full overflow-hidden bg-white/5 dark:bg-white/5 bg-gradient-to-br from-white/5 to-transparent dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-md border border-white/10 dark:border-white/10 hover:-translate-y-1 transition-all duration-500 font-mono ${theme.borderHover} ${theme.shadowHover}`}>
        {/* Matrix background */}
        <div 
          className="absolute inset-0 opacity-[0.06] dark:opacity-[0.10] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='40' viewBox='0 0 24 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40L12 20L0 0M24 40L12 20L24 0' stroke='var(--primary)' stroke-width='1' fill='none' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          }}
        />
        {/* Terminal Header Bar */}
        <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${theme.gradient} opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />
        
        <div className="p-4 sm:p-5 flex flex-col h-full justify-between relative z-10 min-h-[140px]">
          <div className="flex justify-between items-start w-full mb-4">
            <div className="flex items-center gap-1.5 overflow-hidden pr-2 mt-1">
              <span className={`${theme.bracket} text-[10px] sm:text-xs font-bold`}>[</span>
              <h3 className={`text-[10px] sm:text-xs font-bold tracking-[0.1em] uppercase ${theme.title} truncate`}>{label}</h3>
              <span className={`${theme.bracket} text-[10px] sm:text-xs font-bold`}>]</span>
            </div>
            <motion.div
              className={`relative flex items-center justify-center w-8 h-8 rounded-md border backdrop-blur-sm ${theme.iconBg} ${theme.iconBorder} ${theme.iconShadow}`}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Icon className={`w-4 h-4 ${theme.iconText}`} />
            </motion.div>
          </div>
          
          <div className="mt-auto">
            {renderValue()}
            <div className={`text-[9px] sm:text-[10px] tracking-widest uppercase font-semibold ${theme.subtitle} flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity`}>
              <span className={`${theme.bracket} opacity-70`}>&gt;</span>
              <span className="truncate">{sub || "DATA_POINT"}</span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}"""

new_metric_card = """function MetricCard({
  index = 0,
  icon: Icon,
  label,
  value,
  sub,
  color: _color,
}: {
  index?: number;
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  const theme = {
    borderHover: "hover:border-slate-300 dark:hover:border-[#3a3b3e]",
    shadowHover: "hover:shadow-md dark:hover:shadow-xl",
    bracket: "text-slate-400 dark:text-[#4a4b4e]",
    title: "text-slate-600 dark:text-slate-400",
    iconBg: "bg-slate-100 dark:bg-[#2a2b2e]",
    iconBorder: "border-slate-200 dark:border-[#3a3b3e]",
    iconText: "text-slate-600 dark:text-slate-400",
    subtitle: "text-slate-500 dark:text-slate-500",
    valueGlow: "",
  };

  const renderValue = () => {
    if (typeof value === "string" && value.includes(" / ")) {
      const parts = value.split(" / ");
      return (
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
          {parts.map((part, i) => (
            <Fragment key={i}>
              <div className={`px-2 py-
