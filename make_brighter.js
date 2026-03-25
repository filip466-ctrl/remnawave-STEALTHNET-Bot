const fs = require('fs');

// 1. UPDATE SIDEBAR (dashboard-layout.tsx)
const layoutPath = 'frontend/src/components/layout/dashboard-layout.tsx';
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

// The sidebar wrapper
// Replace: border-y border-r border-white/10 bg-background/40 backdrop-blur-3xl shadow-[20px_0_40px_-10px_rgba(0,0,0,0.5)]
// With: border-y border-r border-white/20 dark:border-primary/30 bg-primary/10 dark:bg-primary/20 backdrop-blur-3xl shadow-[20px_0_40px_-10px_rgba(0,0,0,0.5)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_30px_hsl(var(--primary)/0.15)]
layoutContent = layoutContent.replace(
  /border-y border-r border-white\/10 bg-background\/40 backdrop-blur-3xl shadow-\[20px_0_40px_-10px_rgba\(0,0,0,0\.5\)\]/,
  'border-y border-r border-white/20 dark:border-primary/30 bg-primary/10 dark:bg-primary/20 backdrop-blur-3xl shadow-[20px_0_40px_-10px_rgba(0,0,0,0.5)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_30px_hsl(var(--primary)/0.15)]'
);

fs.writeFileSync(layoutPath, layoutContent);


// 2. UPDATE DASHBOARD CARDS (dashboard.tsx)
const dashboardPath = 'frontend/src/pages/dashboard.tsx';
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

// Replace dark:bg-black/40 with dark:bg-primary/10 to make it brighter and tinted with primary color
dashboardContent = dashboardContent.replace(/dark:bg-black\/40/g, 'dark:bg-primary/10');

// Replace dark:bg-black/20 with dark:bg-primary/5
dashboardContent = dashboardContent.replace(/dark:bg-black\/20/g, 'dark:bg-primary/5');

// Make ambient background glow stronger
dashboardContent = dashboardContent.replace(/hsl\(var\(--primary\)\/0\.15\)/g, 'hsl(var(--primary)/0.25)');
dashboardContent = dashboardContent.replace(/hsl\(var\(--primary\)\/0\.1\)/g, 'hsl(var(--primary)/0.15)');

fs.writeFileSync(dashboardPath, dashboardContent);

console.log("Made UI brighter!");
