const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/cabinet/client-tariffs.tsx', 'utf8');

const oldCode = `<Wifi className="h-3 w-3 text-primary" />
                                      {t.trafficLimitBytes != null && t.trafficLimitBytes > 0 ? \`\${(t.trafficLimitBytes / 1024 / 1024 / 1024).toFixed(1)} ГБ\` : "∞"}
                                    </span>
                                  </div>`;

const newCode = `<Wifi className="h-3 w-3 text-primary" />
                                      {t.trafficLimitBytes != null && t.trafficLimitBytes > 0 ? \`\${(t.trafficLimitBytes / 1024 / 1024 / 1024).toFixed(1)} ГБ\` : "∞"}
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md border border-border/50">
                                      <Smartphone className="h-3 w-3 text-primary" />
                                      {t.deviceLimit != null && t.deviceLimit > 0 ? \`\${t.deviceLimit}\` : "∞"}
                                    </span>
                                  </div>`;

content = content.replace(oldCode, newCode);

fs.writeFileSync('frontend/src/pages/cabinet/client-tariffs.tsx', content);
