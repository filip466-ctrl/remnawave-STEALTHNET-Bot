const fs = require('fs');

// DASHBOARD LAYOUT (Sidebar)
const layoutPath = 'frontend/src/components/layout/dashboard-layout.tsx';
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

// The desktop sidebar (line 196) currently is:
// border-y border-r border-white/20 dark:border-primary/30 bg-white/5 dark:bg-white/5 backdrop-blur-3xl shadow-[20px_0_40px_-10px_rgba(0,0,0,0.5)] dark:shadow-[inset_-1px_1px_0_rgba(255,255,255,0.1),0_0_20px_hsl(var(--primary)/0.1)]
// We need to match it more closely to the user request. A subtle bright glass effect.

layoutContent = layoutContent.replace(
  /border-y border-r border-white\/20 dark:border-primary\/30 bg-white\/5 dark:bg-white\/5 backdrop-blur-3xl shadow-\[20px_0_40px_-10px_rgba\(0,0,0,0\.5\)\] dark:shadow-\[inset_-1px_1px_0_rgba\(255,255,255,0\.1\),0_0_20px_hsl\(var\(--primary\)\/0\.1\)\]/,
  'border-y border-r border-white/20 dark:border-white/10 bg-white/10 dark:bg-white/5 backdrop-blur-3xl shadow-[20px_0_40px_-10px_rgba(0,0,0,0.5)] dark:shadow-[inset_-1px_1px_0_rgba(255,255,255,0.15)]'
);

// For mobile menu
layoutContent = layoutContent.replace(
  /bg-white\/5 dark:bg-white\/5 backdrop-blur-3xl border-r border-white\/30 dark:border-primary\/40 shadow-\[20px_0_40px_-10px_rgba\(0,0,0,0\.5\)\] dark:shadow-\[inset_-1px_1px_0_rgba\(255,255,255,0\.1\),0_0_20px_hsl\(var\(--primary\)\/0\.1\)\]/,
  'bg-white/10 dark:bg-white/5 backdrop-blur-3xl border-r border-white/20 dark:border-white/10 shadow-[20px_0_40px_-10px_rgba(0,0,0,0.5)] dark:shadow-[inset_-1px_1px_0_rgba(255,255,255,0.15)]'
);

fs.writeFileSync(layoutPath, layoutContent);

// DASHBOARD (Main wrapper + cards)
const dashboardPath = 'frontend/src/pages/dashboard.tsx';
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

// Make main wrapper brighter and have a nice glow edge
// Original: border-t-white/40 dark:border-t-primary/50 border-l-white/20 dark:border-l-primary/20
dashboardContent = dashboardContent.replace(
  /border-t-white\/40 dark:border-t-primary\/50 border-l border-l-white\/20 dark:border-l-primary\/20/,
  'border-t-white/40 dark:border-t-white/30 border-l border-l-white/20 dark:border-l-white/20'
);

dashboardContent = dashboardContent.replace(
  /dark:shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.2\)\] bg-gradient-to-b from-white\/10 via-transparent to-transparent dark:from-primary\/10/,
  'dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] bg-gradient-to-b from-white/10 via-transparent to-transparent dark:from-white/5'
);

fs.writeFileSync(dashboardPath, dashboardContent);

console.log("Patched sidebars and borders!");
