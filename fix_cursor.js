const fs = require('fs');
const path = 'frontend/src/pages/dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// The original line in SectionHeader:
// <span className="text-primary/50 hidden sm:inline">&gt;</span> {title} <motion.span animate={{opacity:[0,1]}} transition={{repeat:Infinity, duration:0.9}} className="w-2 h-4 bg-primary/50 inline-block drop-shadow-[0_0_8px_hsl(var(--primary)/0.8)]"></motion.span>

// Replace it by removing the motion.span cursor
content = content.replace(
  /<span className="text-primary\/50 hidden sm:inline">&gt;<\/span> \{title\} <motion\.span animate=\{\{opacity:\[0,1\]\}\} transition=\{\{repeat:Infinity, duration:0\.9\}\} className="w-2 h-4 bg-primary\/50 inline-block drop-shadow-\[0_0_8px_hsl\(var\(--primary\)\/0\.8\)\]"><\/motion\.span>/g,
  '<span className="text-primary/50 hidden sm:inline">&gt;</span> {title}'
);

fs.writeFileSync(path, content);
console.log("Cursor removed from SectionHeader!");
