const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/analytics.tsx', 'utf-8');

// 1. Add CustomTooltip component right after MetricCard
const customTooltipCode = `
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-slate-950/90 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 backdrop-blur-md px-3 py-2 rounded-lg shadow-xl text-xs font-mono z-50">
        {label && <p className="font-bold mb-1.5 opacity-80 border-b border-slate-200 dark:border-white/10 pb-1">{label}</p>}
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 py-0.5">
            <div className="flex items-center gap-1.5">
              <div 
                className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]" 
                style={{ 
                  backgroundColor: entry.color || entry.payload?.fill || 'hsl(var(--primary))',
                  color: entry.color || entry.payload?.fill || 'hsl(var(--primary))'
                }} 
              />
              <span className="opacity-80">{entry.name}</span>
            </div>
            <span className="font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};
`;

if (!content.includes('const CustomTooltip =')) {
  content = content.replace('// ─── Компоненты ───', '// ─── Компоненты ───\n' + customTooltipCode);
}

// 2. Replace CartesianGrid
content = content.replace(/<CartesianGrid strokeDasharray="3 3" className="stroke-white\/10" \/>/g, '<CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-slate-200 dark:stroke-white/10" />');

// 3. Replace all Tooltip contentStyles
const tooltipStyleRegex = /contentStyle=\{\{\s*background:\s*"rgba\(10,10,20,0\.85\)",\s*border:\s*"1px solid rgba\(255,255,255,0\.15\)",\s*borderRadius:\s*"8px",\s*color:\s*"white",\s*fontSize:\s*"12px"\s*\}\}/g;
content = content.replace(tooltipStyleRegex, 'content={<CustomTooltip />}');
// Also replace tooltips without formatter if they became self-closing or empty content
content = content.replace(/<Tooltip\s+content=\{<CustomTooltip \/>\}\s*\/>/g, '<Tooltip content={<CustomTooltip />} />');

// 4. Add glow filter to AreaChart (revenueWeekly)
const glowFilter = `
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
`;

if (!content.includes('<filter id="glow"')) {
  content = content.replace('<defs>', '<defs>' + glowFilter);
}

// 5. Apply glow to Area in revenueWeekly
content = content.replace(
  /<Area type="monotone" dataKey="value" stroke="hsl\(var\(--primary\)\)" strokeWidth=\{2\} fillOpacity=\{1\} fill="url\(#revGrad\)" \/>/g,
  '<Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#revGrad)" style={{ filter: "url(#glow)" }} />'
);

// 6. BarChart clientsWeekly
content = content.replace(
  /<BarChart data=\{clientsWeekly\}>/,
  '<BarChart data={clientsWeekly}>\n              <defs>' + glowFilter + '</defs>'
);
content = content.replace(
  /<Bar dataKey="value" fill="#10b981" radius=\{\[4, 4, 0, 0\]\} \/>/g,
  '<Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} style={{ filter: "url(#glow)" }} />'
);

// 7. BarChart trialsWeekly
content = content.replace(
  /<BarChart data=\{trialsWeekly\}>/,
  '<BarChart data={trialsWeekly}>\n              <defs>' + glowFilter + '</defs>'
);
content = content.replace(
  /<Bar dataKey="value" fill="#f59e0b" radius=\{\[4, 4, 0, 0\]\} \/>/g,
  '<Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} style={{ filter: "url(#glow)" }} />'
);

// 8. AreaChart refCreditsWeekly
content = content.replace(
  /<AreaChart data=\{refCreditsWeekly\}>/,
  '<AreaChart data={refCreditsWeekly}>'
);
// It already has <defs>, add glow
content = content.replace(
  /<linearGradient id="refGrad"/,
  glowFilter + '\n                <linearGradient id="refGrad"'
);
content = content.replace(
  /<Area type="monotone" dataKey="value" stroke="#ec4899" strokeWidth=\{2\} fillOpacity=\{1\} fill="url\(#refGrad\)" \/>/g,
  '<Area type="monotone" dataKey="value" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#refGrad)" style={{ filter: "url(#glow)" }} />'
);

// 9. ComposedChart promoWeekly
content = content.replace(
  /<ComposedChart data=\{promoWeekly\}>/,
  '<ComposedChart data={promoWeekly}>\n              <defs>' + glowFilter + '</defs>'
);
content = content.replace(
  /<Bar dataKey="v1" name="Промо-ссылки" fill="#8b5cf6" radius=\{\[4, 4, 0, 0\]\} \/>/g,
  '<Bar dataKey="v1" name="Промо-ссылки" fill="#8b5cf6" radius={[4, 4, 0, 0]} style={{ filter: "url(#glow)" }} />'
);
content = content.replace(
  /<Line type="monotone" dataKey="v2" name="Промокоды" stroke="#06b6d4" strokeWidth=\{2\} dot=\{false\} \/>/g,
  '<Line type="monotone" dataKey="v2" name="Промокоды" stroke="#06b6d4" strokeWidth={2} dot={false} style={{ filter: "url(#glow)" }} />'
);

// 10. PieChart Sources
content = content.replace(
  /<PieChart>/,
  '<PieChart>\n              <defs>' + glowFilter + '</defs>'
);

// Wait, there are multiple PieCharts. Let's do it individually by replacing the Pie tag
// First Pie: sources
content = content.replace(
  /outerRadius=\{90\}(\s*)label=\{/g,
  'outerRadius={90}\n                stroke="hsl(var(--background))"\n                strokeWidth={2}\n                style={{ filter: "url(#glow)" }}$1label={'
);

// 11. BarChart topTariffs
content = content.replace(
  /<BarChart data=\{data\.topTariffs\} layout="vertical" margin=\{\{ top: 0, right: 0, left: 10, bottom: 0 \}\}>/,
  '<BarChart data={data.topTariffs} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>\n              <defs>' + glowFilter + '</defs>'
);
content = content.replace(
  /<Bar dataKey="revenue" fill="hsl\(var\(--primary\)\)" name="Доход" radius=\{\[0, 4, 4, 0\]\} \/>/g,
  '<Bar dataKey="revenue" fill="hsl(var(--primary))" name="Доход" radius={[0, 4, 4, 0]} style={{ filter: "url(#glow)" }} />'
);

fs.writeFileSync('frontend/src/pages/analytics.tsx', content, 'utf-8');
console.log('Patched frontend/src/pages/analytics.tsx');
