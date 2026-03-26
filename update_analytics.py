import re
import sys

try:
    with open('frontend/src/pages/analytics.tsx', 'r', encoding='utf-8') as f:
        text = f.read()

    # GlassCard
    text = re.sub(
        r'function GlassCard\(\{[\s\S]*?\}\) \{[\s\S]*?return \([\s\S]*?</motion\.div>\);\n\}',
        '''function GlassCard({
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
}''',
        text
    )

    # MetricCard
    text = re.sub(
        r'function MetricCard\(\{[\s\S]*?\}\) \{[\s\S]*?return \([\s\S]*?</motion\.div>\);\n\}',
        '''function MetricCard({
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
              <div className={`px-2 py-0.5 rounded bg-slate-100 dark:bg-[#2a2b2e] border border-slate-200 dark:border-[#3a3b3e] text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white ${theme.valueGlow}`}>
                {part}
              </div>
              {i < parts.length - 1 && (
                <span className="text-slate-400 dark:text-slate-600 font-bold text-sm">/</span>
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
      <Card className={`group relative h-full overflow-hidden bg-white dark:bg-[#1C1C1E]/95 shadow-sm border border-slate-200 dark:border-[#2a2b2e] hover:-translate-y-1 transition-all duration-500 font-mono flex flex-col ${theme.borderHover} ${theme.shadowHover}`}>
        {/* macOS Terminal Dots */}
        <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-slate-100 dark:border-[#2a2b2e]/50 bg-slate-50/50 dark:bg-[#1C1C1E]">
          <div className="w-2 h-2 rounded-full bg-[#ff5f56]" />
          <div className="w-2 h-2 rounded-full bg-[#ffbd2e]" />
          <div className="w-2 h-2 rounded-full bg-[#27c93f]" />
        </div>
        
        <div className="p-4 sm:p-5 flex flex-col h-full justify-between relative z-10 min-h-[120px]">
          <div className="flex justify-between items-start w-full mb-4">
            <div className="flex items-center gap-1.5 overflow-hidden pr-2 mt-1">
              <span className={`${theme.bracket} text-[10px] sm:text-xs font-bold`}>[</span>
              <h3 className={`text-[10px] sm:text-xs font-bold tracking-[0.1em] uppercase ${theme.title} truncate`}>{label}</h3>
              <span className={`${theme.bracket} text-[10px] sm:text-xs font-bold`}>]</span>
            </div>
            <motion.div
              className={`relative flex items-center justify-center w-8 h-8 rounded-md border ${theme.iconBg} ${theme.iconBorder}`}
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
}''',
        text
    )

    # ChartCard
    text = re.sub(
        r'function ChartCard\(\{[\s\S]*?\}\) \{[\s\S]*?return \([\s\S]*?</GlassCard>\);\n\}',
        '''function ChartCard({ title, icon: Icon, children, index = 0 }: { title: string; icon: React.ElementType; children: React.ReactNode; index?: number }) {
  return (
    <GlassCard animIndex={index} className="flex flex-col">
      <CardHeader className="pb-2 relative pt-4 px-5">
        <CardTitle className="flex items-center gap-2 text-sm font-mono tracking-widest uppercase text-slate-800 dark:text-slate-300">
          <span className="text-slate-400 dark:text-[#4a4b4e]">[</span>
          <Icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          {title}
          <span className="text-slate-400 dark:text-[#4a4b4e]">]</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 pb-5 px-5 relative flex-1">
        <div className="h-72 w-full">{children}</div>
      </CardContent>
    </GlassCard>
  );
}''',
        text
    )

    # Filters
    text = re.sub(r'<filter id="glow"[\s\S]*?</filter>', '', text)
    text = re.sub(r'<defs>\s*</defs>', '', text)
    text = re.sub(r'style=\{\{\s*filter:\s*"url\(#glow\)"\s*\}\}', '', text)

    # Tables
    text = text.replace(
        'className="border-b border-white/10 bg-white/5 dark:bg-transparent text-xs tracking-widest uppercase text-slate-500 dark:text-primary/60"',
        'className="border-b border-slate-200 dark:border-[#2a2b2e] bg-slate-50/50 dark:bg-transparent text-xs tracking-widest uppercase text-slate-500 dark:text-slate-400"'
    )
    text = text.replace(
        'className="border-b border-white/5 hover:bg-white/10 dark:hover:bg-primary/5 transition-colors"',
        'className="border-b border-slate-100 dark:border-[#2a2b2e]/50 hover:bg-slate-50 dark:hover:bg-[#2a2b2e]/30 transition-colors"'
    )

    text = text.replace(
        '''<CardHeader className="pb-2 border-b border-white/10 relative">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
              <CardTitle className="text-sm font-mono tracking-widest uppercase text-slate-800 dark:text-white">
                <span className="text-primary/50">[</span> Промо-ссылки (топ 10) <span className="text-primary/50">]</span>
              </CardTitle>
            </CardHeader>''',
        '''<CardHeader className="pb-2 relative pt-4 px-5">
              <CardTitle className="text-sm font-mono tracking-widest uppercase text-slate-800 dark:text-slate-300">
                <span className="text-slate-400 dark:text-[#4a4b4e]">[</s
