const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/dashboard.tsx', 'utf8');

// 1. Remove AmbientBackground component and its usage
content = content.replace(/\/\* ── Ambient Background Blobs[^\*]*\*\/\s*function AmbientBackground\(\) \{[\s\S]*?\}\s*(?=\/\* ── Utility)/, '');
content = content.replace(/<AmbientBackground \/>\s*/g, '');

// 2. Wrap Remna Nodes mapping in grid lg:grid-cols-2
content = content.replace(
  /<motion\.div\s+className="flex flex-col gap-6"\s+variants=\{staggerContainer\}\s+initial="hidden"\s+animate="visible"\s*>/g,
  '<motion.div\n              className="grid gap-4 lg:grid-cols-2"\n              variants={staggerContainer}\n              initial="hidden"\n              animate="visible"\n            >'
);

// 3. Colors replacement
content = content.replace(/text-cyan-400/g, 'text-primary');
content = content.replace(/text-cyan-500/g, 'text-primary');
content = content.replace(/text-cyan-600/g, 'text-primary/80');
content = content.replace(/text-cyan-700/g, 'text-primary/60');
content = content.replace(/text-cyan-900/g, 'text-primary/40');

content = content.replace(/bg-cyan-400/g, 'bg-primary');
content = content.replace(/bg-cyan-500\/10/g, 'bg-primary/10');
content = content.replace(/bg-cyan-500\/20/g, 'bg-primary/20');
content = content.replace(/bg-cyan-500\/30/g, 'bg-primary/30');
content = content.replace(/bg-cyan-500\/50/g, 'bg-primary/50');
content = content.replace(/bg-cyan-500/g, 'bg-primary');

content = content.replace(/bg-cyan-900\/20/g, 'bg-primary/20');
content = content.replace(/bg-cyan-950\/10/g, 'bg-primary/10');
content = content.replace(/bg-cyan-950\/20/g, 'bg-primary/20');
content = content.replace(/bg-cyan-950\/30/g, 'bg-primary/30');
content = content.replace(/bg-cyan-950/g, 'bg-primary/10');

content = content.replace(/border-cyan-500\/10/g, 'border-primary/10');
content = content.replace(/border-cyan-500\/20/g, 'border-primary/20');
content = content.replace(/border-cyan-500\/30/g, 'border-primary/30');
content = content.replace(/border-cyan-500\/40/g, 'border-primary/40');
content = content.replace(/border-cyan-500\/50/g, 'border-primary/50');
content = content.replace(/border-cyan-500/g, 'border-primary');

// Replace specific shadow strings to use hsl(var(--primary))
// rgba(6,182,212,0.15) -> hsl(var(--primary)/0.15)
content = content.replace(/rgba\(6,182,212,([0-9.]+)\)/g, 'hsl(var(--primary)/$1)');
// rgba(34,211,238,0.8) -> hsl(var(--primary)/0.8)
content = content.replace(/rgba\(34,211,238,([0-9.]+)\)/g, 'hsl(var(--primary)/$1)');
// hex cyan #06b6d4 -> primary
content = content.replace(/%2306b6d4/g, 'var(--primary)');
content = content.replace(/#06b6d4/g, 'hsl(var(--primary))');
// shadow-[0_0_20px_rgba(6,182,212,0.3)]
content = content.replace(/shadow-\[([^\]]+)rgba\((6,182,212|34,211,238),([0-9.]+)\)\]/g, 'shadow-[$1hsl(var(--primary)/$3)]');
// drop-shadow
content = content.replace(/drop-shadow-\[([^\]]+)rgba\((6,182,212|34,211,238),([0-9.]+)\)\]/g, 'drop-shadow-[$1hsl(var(--primary)/$3)]');

fs.writeFileSync('frontend/src/pages/dashboard.tsx', content, 'utf8');
