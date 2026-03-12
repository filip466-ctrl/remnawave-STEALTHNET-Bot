const fs = require('fs');

const file = fs.readFileSync('frontend/src/pages/landing.tsx', 'utf8');

const startMarker = 'const SIGNAL_CARDS = [';
const endMarker = '];\n';

const startIndex = file.indexOf(startMarker);
if (startIndex !== -1) {
  let endIndex = file.indexOf(endMarker, startIndex);
  if (endIndex !== -1) {
    const result = file.substring(0, startIndex) + file.substring(endIndex + endMarker.length);
    fs.writeFileSync('frontend/src/pages/landing.tsx', result, 'utf8');
    console.log("Successfully removed SIGNAL_CARDS.");
  }
}
