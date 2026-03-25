const fs = require('fs');
const dashboardPath = 'frontend/src/pages/dashboard.tsx';
let content = fs.readFileSync(dashboardPath, 'utf8');

// 1. Change section titles to white
content = content.replace(
  /h2 className="text-lg font-bold tracking-widest uppercase text-slate-800 dark:text-primary dark:drop-shadow-\[0_0_8px_hsl\(var\(--primary\)\/0\.5\)\] flex items-center gap-2"/,
  'h2 className="text-lg font-bold tracking-widest uppercase text-slate-800 dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] flex items-center gap-2"'
);

// 2. Change "АНАЛИТИКА" to "МИКРОАНАЛИТИКА"
content = content.replace(
  /<SectionHeader icon=\{Activity\} title="Аналитика"/,
  '<SectionHeader icon={Activity} title="Микроаналитика"'
);

// 3. Make main node stats white (CPU/RAM and ONLINE users)
content = content.replace(
  /div className="text-lg font-bold tracking-widest text-slate-800 dark:text-primary"/g,
  'div className="text-lg font-bold tracking-widest text-slate-800 dark:text-white"'
);

// Do the same for ServerCommandCenter CPU/RAM & Conn stats
content = content.replace(
  /div className="text-xl sm:text-2xl font-bold tracking-widest text-slate-800 dark:text-primary mt-1"/g,
  'div className="text-xl sm:text-2xl font-bold tracking-widest text-slate-800 dark:text-white mt-1"'
);

// Make BANDWIDTH [ALLOC] values white
content = content.replace(
  /span className="text-xs sm:text-sm font-bold tracking-widest text-slate-800 dark:text-primary"/g,
  'span className="text-xs sm:text-sm font-bold tracking-widest text-slate-800 dark:text-white"'
);

// Same for DataBarSegmented Value
content = content.replace(
  /div className="text-xs font-bold tracking-wider text-slate-800 dark:text-primary"/g,
  'div className="text-xs font-bold tracking-wider text-slate-800 dark:text-white"'
);

fs.writeFileSync(dashboardPath, content);
console.log("Made texts white and renamed analytics to microanalytics!");
