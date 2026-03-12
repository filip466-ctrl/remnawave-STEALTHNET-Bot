const fs = require('fs');

const file = fs.readFileSync('frontend/src/pages/landing.tsx', 'utf8');

const startMarker = '<div className="relative overflow-hidden rounded-[36px] border border-slate-200/60 dark:border-white/10 bg-white/85 dark:bg-white/5 p-6 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/7 md:p-7">';
const endMarker = '              </div>\n            </motion.div>\n          </div>\n        </section>';

const newContent = `              <div className="relative overflow-hidden rounded-[32px] border border-slate-200/60 dark:border-white/10 bg-white/85 dark:bg-white/5 p-6 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/7 md:p-7">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-emerald-300/70" />

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">private network</p>
                    <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950 dark:text-white">
                      Один доступ — все нужные сервисы под рукой
                    </h2>
                  </div>
                  <div className="rounded-2xl border p-3" style={{ borderColor: withAlpha(accentTheme.primary, 0.28), backgroundColor: withAlpha(accentTheme.primary, 0.12), color: resolvedMode === "dark" ? accentTheme.tertiary : accentTheme.primary }}>
                    <Shield className="h-6 w-6" />
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  {featuresList.slice(0, 4).map(({ icon: Icon, label, sub }: any, index: number) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, x: 18 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.08 * index }}
                      className="flex items-center gap-4 rounded-3xl border border-slate-200 dark:border-white/15 bg-white/85 dark:bg-white/5 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/35"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ ...accentGlowStyle, color: resolvedMode === "dark" ? accentTheme.tertiary : accentTheme.primary }}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{label}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{sub}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[28px] border border-slate-200/80 dark:border-white/12 bg-slate-950 px-5 py-5 text-white shadow-xl shadow-slate-950/15 dark:border-white/12 dark:bg-slate-900/90">
                    <p className="text-xs uppercase tracking-[0.28em]" style={{ color: withAlpha(accentTheme.tertiary, 0.8) }}>от</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-4xl font-black tracking-[-0.05em]">
                        {lowestTariff ? lowestTariff.tariff.price : "∞"}
                      </span>
                      <span className="text-sm text-slate-300">
                        {lowestTariff ? lowestTariff.tariff.currency.toUpperCase() : "privacy"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300/90">
                      {lowestTariff
                        ? \`\${lowestTariff.tariff.name} · \${lowestTariff.tariff.durationDays} дней доступа\`
                        : "Тарифы и условия подтягиваются из админки автоматически"}
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-slate-200/80 dark:border-white/12 bg-white/95 dark:bg-white/5 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/6">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">быстрый старт</p>
                    <ul className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                      <li className="flex items-start gap-3"><Check className="mt-0.5 h-4 w-4" style={{ color: accentTheme.primary }} />Регистрация и вход через кабинет без лишней бюрократии</li>
                      <li className="flex items-start gap-3"><Check className="mt-0.5 h-4 w-4" style={{ color: accentTheme.primary }} />Моментальное получение тарифов, способов оплаты и инструкций</li>
                      <li className="flex items-start gap-3"><Check className="mt-0.5 h-4 w-4" style={{ color: accentTheme.primary }} />Поддержка, оферта и контакты доступны прямо на лендинге</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-4 rounded-[28px] border border-slate-200/80 dark:border-white/12 p-5 backdrop-blur-xl dark:border-white/10" style={accentGlowStyle}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">ощущение продукта</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">Не просто VPN, а аккуратно собранный сервис с человеческим UX</p>
                    </div>
                    <Button className="h-12 rounded-full px-5 text-white" style={primaryButtonStyle} asChild>
                      <Link to={lc.showTariffs ? "#tariffs" : "/cabinet/register"}>{lc.showTariffs ? "Смотреть тарифы" : "Начать"}</Link>
                    </Button>
                  </div>
                </div>`;

const startIndex = file.indexOf(startMarker);
const endIndex = file.indexOf(endMarker, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const result = file.substring(0, startIndex) + newContent + file.substring(endIndex);
  fs.writeFileSync('frontend/src/pages/landing.tsx', result, 'utf8');
  console.log("Successfully replaced block.");
} else {
  console.log("Could not find markers.");
  console.log("Start:", startIndex);
  console.log("End:", endIndex);
}
