const fs = require('fs');

const layoutPath = 'frontend/src/components/layout/dashboard-layout.tsx';
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

// Sidebar: reduce primary color opacity back to something subtle but with glass effect
layoutContent = layoutContent.replace(
  /bg-primary\/20 dark:bg-primary\/30 backdrop-blur-3xl shadow-\[20px_0_40px_-10px_rgba\(0,0,0,0\.5\)\] dark:shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.2\),inset_0_0_40px_hsl\(var\(--primary\)\/0\.2\),0_0_40px_hsl\(var\(--primary\)\/0\.2\)\]/g,
  'bg-white/5 dark:bg-white/5 backdrop-blur-3xl shadow-[20px_0_40px_-10px_rgba(0,0,0,0.5)] dark:shadow-[inset_-1px_1px_0_rgba(255,255,255,0.1),0_0_20px_hsl(var(--primary)/0.1)]'
);

fs.writeFileSync(layoutPath, layoutContent);

const dashboardPath = 'frontend/src/pages/dashboard.tsx';
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

// Revert dashboard cards to be less "green block" and more glassmorphism
dashboardContent = dashboardContent.replace(/dark:bg-primary\/20/g, 'dark:bg-white/5');
dashboardContent = dashboardContent.replace(/dark:bg-primary\/15/g, 'dark:bg-white/5');
dashboardContent = dashboardContent.replace(/dark:shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.2\)\]/g, 'dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]');
dashboardContent = dashboardContent.replace(/dark:border-primary\/40/g, 'dark:border-white/10');

// Make the main background a bit brighter but neutral
dashboardContent = dashboardContent.replace(/dark:bg-\[\#050507\]/g, 'dark:bg-[#0A0A0C]');

fs.writeFileSync(dashboardPath, dashboardContent);

console.log("Fixed colors to look less terrible!");
