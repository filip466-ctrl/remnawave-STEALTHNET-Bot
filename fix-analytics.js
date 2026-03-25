const fs = require('fs');
const filePath = 'frontend/src/pages/dashboard.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const analyticsOld = /\{\[\s*\{\s*label:\s*"Новые\s*\(сегодня\)"[\s\S]*?\}\s*\]\.map\(\(item,\s*idx\)\s*=>\s*\([\s\S]*?<\/motion\.div>\n\s*\)\)}/;
const analyticsNew = `{[
                { label: "Новые (сегодня)", val: stats?.users.newToday, max: analyticsMaxUsers, color: "hsl(var(--primary))", isMoney: false, theme: "primary" },
                { label: "Новые (7 дн.)", val: stats?.users.newLast7Days, max: analyticsMaxUsers, color: "hsl(var(--primary))", isMoney: false, theme: "primary" },
                { label: "Новые (30 дн.)", val: stats?.users.newLast30Days, max: analyticsMaxUsers, color: "hsl(var(--primary))", isMoney: false, theme: "violet" },
                { label: "Продажи (сегодня)", val: stats?.sales.todayAmount, max: analyticsMaxSales, color: "#10b981", isMoney: true, theme: "emerald" },
                { label: "Продажи (7 дн.)", val: stats?.sales.last7DaysAmount, max: analyticsMaxSales, color: "#10b981", isMoney: true, theme: "emerald" },
                { label: "Продажи (30 дн.)", val: stats?.sales.last30DaysAmount, max: analyticsMaxSales, color: "#10b981", isMoney: true, theme: "emerald" },
              ].map((item, idx) => {
                const isEmerald = item.theme === "emerald";
                const isViolet = item.theme === "violet";
                const borderClass = isEmerald ? "border-emerald-500/20 dark:border-emerald-500/30 hover:border-emerald-500/50" : isViolet ? "border-violet-500/20 dark:border-violet-500/30 hover:border-violet-500/50" : "border-white/[0.05] dark:border-primary/20 hover:border-white/20 dark:hover:border-primary/50";
                const bgClass = isEmerald ? "bg-emerald-500/5 dark:bg-emerald-500/10 hover:bg-emerald-500/10" : isViolet ? "bg-violet-500/5 dark:bg-violet-500/10 hover:bg-violet-500/10" : "bg-white/10 dark:bg-primary/10 hover:bg-white/20 dark:hover:bg-primary/20";
                const textClass = isEmerald ? "text-emerald-700 dark:text-emerald-400" : isViolet ? "text-violet-700 dark:text-violet-400" : "text-slate-900 dark:text-white";
                const titleGlow = isEmerald ? "dark:drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]" : isViolet ? "dark:drop-shadow-[0_0_10px_rgba(139,92,246,0.4)]" : "dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]";
                
                return (
                <motion.div
                  key={item.label}
                  className={\`rounded border backdrop-blur-sm p-4 space-y-2 transition-all duration-400 group \${borderClass} \${bgClass}\`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + idx * 0.06, duration: 0.5 }}
                >
                  <p className="text-[10px] tracking-widest uppercase text-slate-500 dark:text-primary/70 group-hover:text-slate-800 dark:group-hover:text-primary transition-colors">
                    &gt; {item.label}
                  </p>
                  <p className={\`text-xl font-bold tabular-nums tracking-widest \${textClass} \${titleGlow}\`}>
                    {stats ? (
                      item.isMoney ? (
                        <CountUpMoney value={item.val ?? 0} currency={defaultCurrency} />
                      ) : (
                        <CountUpNumber value={item.val ?? 0} />
                      )
                    ) : (
                      "—"
                    )}
                  </p>
                  <MiniBar value={item.val ?? 0} maxValue={item.max} color={item.color} />
                </motion.div>
              )})}`;
              
content = content.replace(analyticsOld, analyticsNew);
fs.writeFileSync(filePath, content, 'utf-8');
console.log("Analytics patch applied");
