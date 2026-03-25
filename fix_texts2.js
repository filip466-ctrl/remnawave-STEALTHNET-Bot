const fs = require('fs');
const dashboardPath = 'frontend/src/pages/dashboard.tsx';
let content = fs.readFileSync(dashboardPath, 'utf8');

// Ensure section icons are also not exclusively primary
content = content.replace(
  /<Icon className="h-5 w-5 text-slate-800 dark:text-primary drop-shadow-\[0_0_8px_hsl\(var\(--primary\)\/0\.8\)\]" \/>/,
  '<Icon className="h-5 w-5 text-slate-800 dark:text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />'
);

fs.writeFileSync(dashboardPath, content);
console.log("Made icons white too.");
