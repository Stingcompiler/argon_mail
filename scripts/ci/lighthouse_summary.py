"""Print Lighthouse category scores (from `lhci upload --target=filesystem`) as a Markdown table."""
import json
import sys
from pathlib import Path
from urllib.parse import unquote

out = Path(sys.argv[1] if len(sys.argv) > 1 else "lighthouse")
rows = []
for manifest in out.glob("manifest.json"):
    for entry in json.loads(manifest.read_text()):
        s = entry["summary"]
        report = json.loads(Path(entry["jsonPath"]).read_text())
        audits = report["audits"]
        rows.append((unquote(entry["url"]), s.get("performance"), s.get("accessibility"), s.get("best-practices"), s.get("seo"),
                     audits["largest-contentful-paint"]["displayValue"], audits["cumulative-layout-shift"]["displayValue"],
                     audits["total-blocking-time"]["displayValue"]))
print("### Lighthouse (mobile, CI)\n")
print("| URL | Perf | A11y | Best practices | SEO | LCP | CLS | TBT |")
print("| --- | --- | --- | --- | --- | --- | --- | --- |")
pct = lambda v: "—" if v is None else str(round(v * 100))
for r in rows:
    print(f"| {r[0]} | {pct(r[1])} | {pct(r[2])} | {pct(r[3])} | {pct(r[4])} | {r[5]} | {r[6]} | {r[7]} |")
