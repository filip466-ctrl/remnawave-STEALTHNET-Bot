const fs = require('fs');
const dashboardPath = 'frontend/src/pages/dashboard.tsx';
let dContent = fs.readFileSync(dashboardPath, 'utf8');

// The active green backgrounds on the cards are looking like green bricks. 
// We need to change `dark:bg-white/5` and `dark:bg-primary/20` back to subtle transparency.

dContent = dContent.replace(/dark:bg-primary\/20/g, 'dark:bg-white/5');
dContent = dContent.replace(/dark:border-primary\/40/g, 'dark:border-white/10');
dContent = dContent.replace(/dark:shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.2\)\]/g, 'dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]');
dContent = dContent.replace(/dark:bg-primary\/15/g, 'dark:bg-white/5');
dContent = dContent.replace(/dark:bg-primary\/5/g, 'dark:bg-white/5');

// Make the main wrapper less dark, more elegant
// currently: bg-white/70 dark:bg-[#0A0A0C]
dContent = dContent.replace(/dark:bg-\[\#0A0A0C\]/g, 'dark:bg-[#0c0c0f]');

// Soften the ambient green glow we added earlier back to original values so it's not overpowering
dContent = dContent.replace(/hsl\(var\(--primary\)\/0\.25\)/g, 'hsl(var(--primary)/0.15)');

fs.writeFileSync(dashboardPath, dContent);
console.log("Final softening applied.");
