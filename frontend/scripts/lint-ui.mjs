// Text check for the banned UI patterns (docs/ui-profile.md, «الأنماط الممنوعة»).
// Lists every hit and exits 1; prints nothing and exits 0 when clean.
// A documented exception carries «ui-allow: <reason>» in a comment on the
// same line (CSS here is one rule per line).   npm run lint:ui
//
// It catches known shapes only and can be worked around; it does not replace
// the visual review. Its value is stopping accidental regressions cheaply.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CSS = ['app/globals.css', 'app/admin/admin.css', 'app/admin/workspace.css'].filter((f) => fs.existsSync(path.join(ROOT, f)));
const TSX_DIRS = ['app', 'src/components'];
const TINT = String.raw`var\(--(?:neutral|accent|brand|success|warning|danger|info)-(?:25|50|100|150|200)\)|var\(--tint-[a-z]+-bg\)`;

const RULES = [
  // A solid coloured edge on a box. Chevrons drawn with borders (rotated) and
  // dashed connectors are not stripes.
  { name: 'شريط ملوّن على حافة الكرت', css: true,
    test: (line) => /border-(?:left|right|top|inline-start|inline-end|block-start)(?:-width)?:\s*[2-9]px(?![^;]*dashed)|box-shadow:\s*inset\s+-?[2-9]px\s+0\s/.test(line) && !/rotate\(/.test(line) },
  // An icon in a lightly tinted circle or rounded square. Interactive controls
  // (.icon-button) are not decoration.
  { name: 'أيقونة داخل دائرة أو مربع مصبوغ', css: true,
    test: (line) => {
      const selector = line.split('{')[0];
      return /icon/.test(selector) && !/icon-button/.test(selector) && /border-radius:/.test(line)
        && new RegExp(`background:(?:${TINT})`).test(line);
    } },
  { name: 'تدرج على زر أو عنوان', css: true,
    test: (line) => /gradient\(/.test(line) && /(?:^|[\s,}])(?:\.button|\.text-button|h1|h2|h3)\b[^{]*\{/.test(line) },
  { name: 'نص بتدرج (background-clip:text)', css: true, re: /background-clip:\s*text/ },
  { name: 'حركة مستمرة', css: true, re: /animation[^;{}]*\binfinite\b|animation-iteration-count:\s*infinite/ },
  { name: 'كرت إحصائية لكل رقم', tsx: true, re: /className=["'{`][^"'}`]*\bstats?-(?:grid|cards?)\b/ },
];

const hits = [];
const scan = (file, kind) => {
  fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n').forEach((line, i) => {
    if (line.includes('ui-allow:')) return;
    for (const r of RULES) {
      if ((kind === 'css' && !r.css) || (kind === 'tsx' && !r.tsx)) continue;
      if (r.re ? r.re.test(line) : r.test(line)) hits.push(`${file}:${i + 1}: ${r.name}\n    ${line.trim().slice(0, 160)}`);
    }
  });
};
CSS.forEach((f) => scan(f, 'css'));
const walk = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).forEach((e) => {
  const rel = path.join(dir, e.name);
  if (e.isDirectory()) walk(rel); else if (/\.tsx$/.test(e.name)) scan(rel, 'tsx');
});
TSX_DIRS.forEach(walk);

if (hits.length) {
  console.log(hits.join('\n'));
  console.log(`\n${hits.length} مخالفة. وثّق الاستثناء الوظيفي بتعليق «ui-allow: السبب» في السطر نفسه.`);
  process.exit(1);
}
