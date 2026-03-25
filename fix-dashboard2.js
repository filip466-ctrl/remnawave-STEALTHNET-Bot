const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/dashboard.tsx', 'utf8');

// Replace left over hex/rgb colors with primary
content = content.replace(/rgba\(6,\s*182,\s*212,\s*([0-9.]+)\)/g, 'hsl(var(--primary)/$1)');
content = content.replace(/rgba\(34,\s*211,\s*238,\s*([0-9.]+)\)/g, 'hsl(var(--primary)/$1)');

// Reduce padding and gaps in Remna Nodes
content = content.replace(/<CardContent className="p-6 relative">/g, '<CardContent className="p-4 sm:p-5 relative">');
content = content.replace(/<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">/g, '<div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">');
content = content.replace(/<div className="grid grid-cols-2 gap-6 mt-4">/g, '<div className="grid grid-cols-2 gap-4 mt-4">');
content = content.replace(/<div className="lg:col-span-2 space-y-6">/g, '<div className="xl:col-span-2 space-y-4">');

// For Server Command Center, let's also tighten it slightly just in case it shares the same string
// wait, ServerCommandCenter has:
// <CardContent className="p-6 relative">
// <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
// So those replacements will affect ServerCommandCenter too, making it `xl:grid-cols-3 gap-4 sm:gap-6` and `p-4 sm:p-5`. That's good, more compact.

// Ensure all "lg:col-span-2" are updated to "xl:col-span-2" if they are inside the xl:grid-cols-3
content = content.replace(/className="lg:col-span-2 /g, 'className="xl:col-span-2 ');

// Change the Hex Dump / Mini logs container to be smaller
content = content.replace(/className="mt-6 p-3/g, 'className="mt-4 p-3');

// Actions section padding
content = content.replace(/className="flex flex-col gap-4">/g, 'className="flex flex-col gap-3">');
content = content.replace(/bg-white\/50 dark:bg-primary\/10 p-5 rounded-lg/g, 'bg-white/50 dark:bg-primary/10 p-4 rounded-lg');

fs.writeFileSync('frontend/src/pages/dashboard.tsx', content, 'utf8');
