const fs = require('fs');
const path = 'frontend/src/pages/dashboard.tsx';
let content = fs.readFileSync(path, 'utf-8');

// Update colorMap in StatCard
content = content.replace(/title: "text-slate-700 dark:text-primary",/g, 'title: "text-slate-900 dark:text-white",');
content = content.replace(/title: "text-slate-700 dark:text-[a-z]+-500",/g, 'title: "text-slate-900 dark:text-white",');

content = content.replace(/subtitle: "dark:text-primary\/70",/g, 'subtitle: "text-primary/70 dark:text-primary",');
content = content.replace(/subtitle: "dark:text-[a-z]+-500\/70 text-[a-z]+-600\/70",/g, 'subtitle: "text-primary/70 dark:text-primary",');

content = content.replace(/valueGlow: "text-slate-900 dark:text-white dark:drop-shadow-\[0_0_12px_rgba\(255,255,255,0\.4\)\]",/g, 'valueGlow: "text-slate-900 dark:text-white dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]",');
content = content.replace(/valueGlow: "text-[a-z]+-600 dark:text-[a-z]+-400 dark:drop-shadow-\[0_0_12px_rgba\([0-9,]+\,0\.5\)\]",/g, 'valueGlow: "text-slate-900 dark:text-white dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]",');


// Update Sales Section
content = content.replace(/text-\[10px\] tracking-widest uppercase text-slate-500 dark:text-primary\/70 group-hover:text-slate-800 dark:group-hover:text-primary transition-colors/g, 'text-[10px] tracking-widest uppercase text-slate-900 dark:text-white transition-colors');
content = content.replace(/text-2xl font-bold tabular-nums tracking-widest mt-1 text-emerald-600 dark:text-emerald-400 dark:drop-shadow-\[0_0_10px_rgba\(16,185,129,0\.5\)\]/g, 'text-2xl font-bold tabular-nums tracking-widest mt-1 text-slate-900 dark:text-white dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]');

fs.writeFileSync(path, content, 'utf-8');
console.log("Colors fixed");
