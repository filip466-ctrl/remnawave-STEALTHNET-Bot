const fs = require('fs');

const layoutPath = 'frontend/src/components/layout/dashboard-layout.tsx';
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

layoutContent = layoutContent.replace(
  /bg-background\/60 backdrop-blur-3xl border-r border-white\/10 shadow-\[20px_0_40px_-10px_rgba\(0,0,0,0\.5\)\]/,
  'bg-primary/10 dark:bg-primary/20 backdrop-blur-3xl border-r border-white/20 dark:border-primary/30 shadow-[20px_0_40px_-10px_rgba(0,0,0,0.5)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_30px_hsl(var(--primary)/0.25)]'
);

fs.writeFileSync(layoutPath, layoutContent);
console.log("Mobile menu updated!");
