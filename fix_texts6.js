const fs = require('fs');
const dashboardPath = 'frontend/src/pages/dashboard.tsx';
let content = fs.readFileSync(dashboardPath, 'utf8');

// ServerCommandCenter logs
content = content.replace(
  /<span className="opacity-50">0x0000<\/span><span>48 65/g,
  '<span className="opacity-50">0x0000</span><span className="text-white font-medium">48 65'
);

content = content.replace(
  /<span className="opacity-50">0x0010<\/span><span>53 79/g,
  '<span className="opacity-50">0x0010</span><span className="text-white font-medium">53 79'
);

content = content.replace(
  /<span className="opacity-50">0x0020<\/span><span>\{serverStats/g,
  '<span className="opacity-50">0x0020</span><span className="text-white font-medium">{serverStats'
);

fs.writeFileSync(dashboardPath, content);
console.log("Fixed main server logs to white.");
