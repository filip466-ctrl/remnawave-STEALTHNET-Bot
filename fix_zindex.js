const fs = require('fs');
const path = 'frontend/src/components/layout/dashboard-layout.tsx';
let content = fs.readFileSync(path, 'utf-8');

content = content.replace(
  'header className="sticky top-0 z-10 flex h-14',
  'header className="sticky top-0 z-40 flex h-14'
);

fs.writeFileSync(path, content, 'utf-8');
console.log("z-index fixed in layout");
