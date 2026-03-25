const fs = require('fs');

const layoutPath = 'frontend/src/components/layout/dashboard-layout.tsx';
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

// Desktop sidebar
layoutContent = layoutContent.replace(
  /bg-primary\/10 dark:bg-primary\/20 backdrop-blur-3xl shadow-\[20px_0_40px_-10px_rgba\(0,0,0,0\.5\)\] dark:shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.1\),0_0_30px_hsl\(var\(--primary\)\/0\.15\)\]/,
  'bg-primary/20 dark:bg-primary/30 backdrop-blur-3xl shadow-[20px_0_40px_-10px_rgba(0,0,0,0.5)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_0_40px_hsl(var(--primary)/0.2),0_0_40px_hsl(var(--primary)/0.2)]'
);

// Mobile sidebar
layoutContent = layoutContent.replace(
  /bg-primary\/10 dark:bg-primary\/20 backdrop-blur-3xl border-r border-white\/20 dark:border-primary\/30 shadow-\[20px_0_40px_-10px_rgba\(0,0,0,0\.5\)\] dark:shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.1\),0_0_30px_hsl\(var\(--primary\)\/0\.25\)\]/,
  'bg-primary/20 dark:bg-primary/30 backdrop-blur-3xl border-r border-white/30 dark:border-primary/40 shadow-[20px_0_40px_-10px_rgba(0,0,0,0.5)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_0_40px_hsl(var(--primary)/0.2),0_0_40px_hsl(var(--primary)/0.2)]'
);

fs.writeFileSync(layoutPath, layoutContent);

const dashboardPath = 'frontend/src/pages/dashboard.tsx';
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

// Make dashboard cards even brighter
dashboardContent = dashboardContent.replace(/dark:bg-primary\/10/g, 'dark:bg-primary/20');
dashboardContent = dashboardContent.replace(/dark:bg-primary\/5/g, 'dark:bg-primary/15');
dashboardContent = dashboardContent.replace(/dark:border-primary\/30/g, 'dark:border-primary/40');
dashboardContent = dashboardContent.replace(/dark:shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.1\)/g, 'dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)');

fs.writeFileSync(dashboardPath, dashboardContent);

console.log("Made UI EVEN brighter and more themed!");
