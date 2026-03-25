const fs = require('fs');
const dashboardPath = 'frontend/src/pages/dashboard.tsx';
let content = fs.readFileSync(dashboardPath, 'utf8');

// Section Titles main wrapper
// e.g. <h1 className="text-2xl font-bold tracking-widest uppercase text-slate-900 dark:text-primary flex items-center gap-3">
content = content.replace(
  /className="text-2xl font-bold tracking-widest uppercase text-slate-900 dark:text-primary flex items-center gap-3"/,
  'className="text-2xl font-bold tracking-widest uppercase text-slate-900 dark:text-white flex items-center gap-3"'
);

// Uptime inside Command Center
content = content.replace(
  /div className="text-2xl sm:text-3xl font-bold tracking-widest text-slate-800 dark:text-primary dark:drop-shadow-\[0_0_15px_hsl\(var\(--primary\)\/0\.8\)\] text-center z-10"/,
  'div className="text-2xl sm:text-3xl font-bold tracking-widest text-slate-800 dark:text-white dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] text-center z-10"'
);

// Mini logs text
content = content.replace(
  /<span className="text-slate-900 dark:text-primary font-medium">WAITING FOR COMMANDS_<\/span>/g,
  '<span className="text-slate-900 dark:text-white font-medium">WAITING FOR COMMANDS_</span>'
);
content = content.replace(
  /<span className="text-slate-900 dark:text-primary font-medium">SYSTEM_ONLINE_<\/span>/g,
  '<span className="text-slate-900 dark:text-white font-medium">SYSTEM_ONLINE_</span>'
);

// Mini chart values
content = content.replace(
  /span className="text-slate-900 dark:text-primary"/g,
  'span className="text-slate-900 dark:text-white"'
);

// Stat card titles (total users, etc) are already handled (valueGlow) 

fs.writeFileSync(dashboardPath, content);
console.log("Made main texts white!");
