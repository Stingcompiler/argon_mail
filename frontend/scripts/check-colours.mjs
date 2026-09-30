// Fails when app CSS uses a literal colour outside the token block.
// Every colour comes from the scales in app/globals.css (:root), so the brand
// can change in one place.   node scripts/check-colours.mjs
import fs from 'fs';

const FILES = ['app/globals.css', 'app/admin/admin.css'];
const COLOUR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\brgba?\(|\bhsla?\(|\boklch\(/g;
let bad = 0;
for (const file of FILES) {
  fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (line.startsWith(':root{--white:')) return; // the token definitions
    for (const m of line.matchAll(COLOUR)) {
      bad++;
      console.error(`${file}:${i + 1}: literal colour ${m[0]} — use a token from :root`);
    }
  });
}
if (bad) process.exit(1);
console.log('colours: every CSS colour comes from a token');
