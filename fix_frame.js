const fs = require('fs');

const path = 'frontend/src/pages/dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Also tone down SectionHeader
content = content.replace(
  /border border-white\/20 dark:border-white\/10 bg-white\/10 dark:bg-white\/5 shadow-\[0_0_15px_hsl\(var\(--primary\)\/0\.25\)\]/,
  'border border-white/20 dark:border-white/10 bg-white/10 dark:bg-white/5 shadow-[0_0_15px_hsl(var(--primary)/0.15)]'
);

fs.writeFileSync(path, content);
console.log("Fixed SectionHeader shadow too.");
