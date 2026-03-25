const fs = require('fs');
const dashboardPath = 'frontend/src/pages/dashboard.tsx';
let content = fs.readFileSync(dashboardPath, 'utf8');

// ServerCommandCenter dark:text-primary -> dark:text-white
content = content.replace(
  /font-mono text-slate-900 dark:text-primary group transition-colors/g,
  'font-mono text-slate-900 dark:text-white group transition-colors'
);

content = content.replace(
  /font-mono text-slate-900 dark:text-primary/g,
  'font-mono text-slate-900 dark:text-white'
);

// Node stats list
// e.g. text-slate-600 dark:text-primary font-medium
content = content.replace(
  /text-slate-600 dark:text-primary font-medium/g,
  'text-slate-600 dark:text-white font-medium'
);

// Top Bar Terminal Header address
content = content.replace(
  /text-slate-600 dark:text-primary\/70 tracking-widest uppercase/g,
  'text-slate-600 dark:text-white/70 tracking-widest uppercase'
);

// Port info
content = content.replace(
  /text-slate-500 dark:text-primary\/50 justify-between sm:justify-end/g,
  'text-slate-500 dark:text-white/50 justify-between sm:justify-end'
);

// Microanalytics buttons text
content = content.replace(
  /"text-slate-900 dark:text-primary border-primary\/50 shadow-\[0_0_12px_hsl\(var\(--primary\)\/0\.3\)\]"/g,
  '"text-slate-900 dark:text-white border-primary/50 shadow-[0_0_12px_hsl(var(--primary)/0.3)]"'
);

// Node Actions block specific strings
// Node UUID etc inside the block
// <span className="opacity-50">0x0000</span><span className="text-primary">NODE_UUID: 
content = content.replace(
  /<span className="text-primary">NODE_UUID: /g,
  '<span className="text-white">NODE_UUID: '
);

content = content.replace(
  /<span className="text-primary">TRAFFIC_LIMIT: /g,
  '<span className="text-white">TRAFFIC_LIMIT: '
);

content = content.replace(
  /<span className="text-primary">VER: /g,
  '<span className="text-white">VER: '
);

content = content.replace(
  /<span className="text-primary">STATUS: /g,
  '<span className="text-white">STATUS: '
);

// Make the stat values white in ServerCommandCenter
// text-slate-900 dark:text-primary 
content = content.replace(
  /className="text-slate-900 dark:text-primary"/g,
  'className="text-slate-900 dark:text-white"'
);


fs.writeFileSync(dashboardPath, content);
console.log("Made all node data texts white!");
