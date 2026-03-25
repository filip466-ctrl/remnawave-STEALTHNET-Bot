const fs = require('fs');

const path = 'frontend/src/pages/dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const softGlowReplacement1 = `{/* Soft pulsing ambient glow in background */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <motion.div
                  animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-[50%] -right-[50%] w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.15)_0%,transparent_50%)]"
                />
                <motion.div
                  animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.15, 1] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute -bottom-[50%] -left-[50%] w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.1)_0%,transparent_50%)]"
                />
              </div>`;

// Replace first instance
content = content.replace(
  /\{\/\* Radar scan effect in background \*\/\}\s*<div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10 dark:opacity-20">\s*<motion\.div\s*animate=\{\{ rotate: 360 \}\}\s*transition=\{\{ duration: 8, repeat: Infinity, ease: "linear" \}\}\s*className="w-\[200%\] h-\[200%\] absolute -top-1\/2 -left-1\/2"\s*style=\{\{\s*background: "conic-gradient\(from 0deg, transparent 70%, hsl\(var\(--primary\)\/0\.4\) 100%\)"\s*\}\}\s*\/>\s*<\/div>/,
  softGlowReplacement1
);

const softGlowReplacement2 = `{/* Soft pulsing ambient glow in background */}
                              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                <motion.div
                                  animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
                                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                                  className="absolute -top-[50%] -right-[50%] w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.15)_0%,transparent_50%)]"
                                />
                                <motion.div
                                  animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.15, 1] }}
                                  transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                                  className="absolute -bottom-[50%] -left-[50%] w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.1)_0%,transparent_50%)]"
                                />
                              </div>`;

// Replace second instance (has rotate: -360)
content = content.replace(
  /\{\/\* Radar scan effect in background \*\/\}\s*<div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10 dark:opacity-20">\s*<motion\.div\s*animate=\{\{ rotate: -360 \}\}\s*transition=\{\{ duration: 10, repeat: Infinity, ease: "linear" \}\}\s*className="w-\[200%\] h-\[200%\] absolute -top-1\/2 -left-1\/2"\s*style=\{\{\s*background: "conic-gradient\(from 0deg, transparent 70%, hsl\(var\(--primary\)\/0\.4\) 100%\)"\s*\}\}\s*\/>\s*<\/div>/,
  softGlowReplacement2
);

fs.writeFileSync(path, content);
console.log("Replaced radars!");
