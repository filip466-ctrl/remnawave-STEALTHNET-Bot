const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/analytics.tsx', 'utf-8');

const glowFilter = `
              <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>`;

content = content.replace(
  /<PieChart>\s*<Pie\s*data=\{data\.providerSeries\}/,
  '<PieChart>\n' + glowFilter + '\n                <Pie\n                  data={data.providerSeries}'
);

fs.writeFileSync('frontend/src/pages/analytics.tsx', content, 'utf-8');
