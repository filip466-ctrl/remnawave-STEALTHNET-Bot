const fs = require('fs');
const dashboardPath = 'frontend/src/pages/dashboard.tsx';
let content = fs.readFileSync(dashboardPath, 'utf8');

// The little brackets texts like [ ACTIONS ], [ SYS_UPTIME ]
content = content.replace(
  /span className="text-slate-500 dark:text-primary\/50 text-xs tracking-\[0\.2em\] mb-2 z-10 font-semibold"/g,
  'span className="text-slate-500 dark:text-white/60 text-xs tracking-[0.2em] mb-2 z-10 font-semibold"'
);

content = content.replace(
  /span className="text-slate-500 dark:text-primary\/50 text-xs tracking-\[0\.2em\] z-10 font-semibold"/g,
  'span className="text-slate-500 dark:text-white/60 text-xs tracking-[0.2em] z-10 font-semibold"'
);

fs.writeFileSync(dashboardPath, content);
console.log("Fixed bracket texts to white/60");
