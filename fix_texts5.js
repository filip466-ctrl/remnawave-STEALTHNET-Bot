const fs = require('fs');
const dashboardPath = 'frontend/src/pages/dashboard.tsx';
let content = fs.readFileSync(dashboardPath, 'utf8');

// Fix node text specifically: <span className="text-slate-900 dark:text-primary font-medium">STATUS:
content = content.replace(
  /<span className="text-slate-900 dark:text-primary font-medium">STATUS: /g,
  '<span className="text-slate-900 dark:text-white font-medium">STATUS: '
);

// We made ServerCommandCenter text-white globally, but let's check DataBarSegmented in layout
content = content.replace(
  /<span className="opacity-50">0x0000<\/span><span>NODE_UUID:/g,
  '<span className="opacity-50">0x0000</span><span className="text-white font-medium">NODE_UUID:'
);

content = content.replace(
  /<span className="opacity-50">0x0010<\/span><span>TRAFFIC_LIMIT:/g,
  '<span className="opacity-50">0x0010</span><span className="text-white font-medium">TRAFFIC_LIMIT:'
);

content = content.replace(
  /<span className="opacity-50">0x0020<\/span><span>VER:/g,
  '<span className="opacity-50">0x0020</span><span className="text-white font-medium">VER:'
);

// We need to do the same for the ServerCommandCenter component
content = content.replace(
  /<span className="opacity-50">0x0000<\/span><span>SYSTEM_ARCH:/g,
  '<span className="opacity-50">0x0000</span><span className="text-white font-medium">SYSTEM_ARCH:'
);

content = content.replace(
  /<span className="opacity-50">0x0010<\/span><span>KERNEL:/g,
  '<span className="opacity-50">0x0010</span><span className="text-white font-medium">KERNEL:'
);

content = content.replace(
  /<span className="opacity-50">0x0020<\/span><span>UPTIME_SEC:/g,
  '<span className="opacity-50">0x0020</span><span className="text-white font-medium">UPTIME_SEC:'
);

fs.writeFileSync(dashboardPath, content);
console.log("Fixed Hex dump texts to be white!");
