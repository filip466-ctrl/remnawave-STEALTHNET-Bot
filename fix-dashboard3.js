const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/dashboard.tsx', 'utf8');

content = content.replace(/shadow-cyan-500\/10/g, 'shadow-primary/10');
content = content.replace(/via-cyan-500\/50/g, 'via-primary/50');
content = content.replace(/via-cyan-500\/\[0\.05\]/g, 'via-primary/[0.05]');

fs.writeFileSync('frontend/src/pages/dashboard.tsx', content, 'utf8');
