#!/usr/bin/env bash
# End-to-end smoke test against a running stack (Next public port).
#   BASE=http://127.0.0.1:3108 scripts/smoke.sh
# Expects the demo catalogue (manage.py seed_demo). Exits non-zero on failure.
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:3108}"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
pass=0
check() { local name="$1"; shift; if "$@"; then echo "ok   $name"; pass=$((pass+1)); else echo "FAIL $name"; exit 1; fi; }
code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
enc() { python3 -c "import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))" "$1"; }

SLUG="إرسال-الطرود-والمستندات"; S="$(enc "$SLUG")"
if [ "$(code "$BASE/api/v1/health/")" != 200 ]; then echo "FAIL health: $(curl -s "$BASE/api/v1/health/")"; exit 1; fi
echo "ok   health"; pass=$((pass+1))
check "home renders services (SSR)" grep -q "إرسال الطرود والمستندات" <(curl -s "$BASE/")
curl -s "$BASE/services/$S" > "$T/svc.html"
check "service page title"          grep -q "<title>إرسال الطرود والمستندات" "$T/svc.html"
check "service canonical"           grep -q 'rel="canonical"' "$T/svc.html"
check "service JSON-LD"             grep -q '"@type":"Service"' "$T/svc.html"
GB="$(curl -s -A 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' "$BASE/services/$S" | sed 's#</head>.*##')"
check "metadata in <head> for Googlebot" grep -q 'name="description"' <<<"$GB"
check "unknown service is 404"      [ "$(code "$BASE/services/no-such-service")" = 404 ]
check "malformed slug not 500"      [ "$(code "$BASE/services/%E0%A4%A")" != 500 ]
check "sitemap lists service"       grep -q "$S" <(curl -s "$BASE/sitemap.xml")
check "robots blocks admin"         grep -q "Disallow: /admin" <(curl -s "$BASE/robots.txt")
check "admin is noindex"            grep -qi "x-robots-tag: noindex" <(curl -sI "$BASE/admin")
check "CSP header"                  grep -qi "content-security-policy" <(curl -sI "$BASE/")
check "favicon (no 404)"            [ "$(code "$BASE/favicon.ico")" = 200 ]
check "share image"                 [ "$(curl -s -o /dev/null -w '%{content_type}' "$BASE/opengraph-image")" = image/png ]
check "og:image on service page"    grep -q 'property="og:image"' "$T/svc.html"
check "privacy page from CMS"       [ "$(code "$BASE/privacy")" = 200 ]
check "unknown custom page is 404"  [ "$(code "$BASE/p/no-such-page")" = 404 ]

P="{\"service\":\"$SLUG\",\"customer_name\":\"اختبار دخان\",\"customer_phone\":\"+249911000111\",\"answers\":{\"destination\":\"بورتسودان\",\"kind\":\"مستندات\"},\"consent\":true}"
R="$(curl -s -H 'Content-Type: application/json' -H "Idempotency-Key: $(uuidgen 2>/dev/null || python3 -c 'import uuid;print(uuid.uuid4())')" -d "$P" "$BASE/api/v1/public/orders/")"
CODE="$(python3 -c "import sys,json;print(json.loads(sys.argv[1])['code'])" "$R")"
check "order created"               [ -n "$CODE" ]
check "tracking works"              grep -q "\"code\":\"$CODE\"" <(curl -s "$BASE/api/v1/public/track/$CODE/")
check "tracking hides customer"     bash -c "! curl -s '$BASE/api/v1/public/track/$CODE/' | grep -q 'اختبار دخان'"
LK="$(curl -s -H 'Content-Type: application/json' -d '{"full_name":"اختبار  دخان","phone":"+249911000111"}' "$BASE/api/v1/public/track/lookup/")"
check "lookup by name + phone"      grep -q "\"code\":\"$CODE\"" <<<"$LK"
check "lookup needs the phone too"  [ "$(curl -s -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' -d '{"full_name":"اختبار دخان","phone":"+249900000000"}' "$BASE/api/v1/public/track/lookup/")" = 404 ]
python3 -c "print('{\"x\":\"'+'a'*1_200_000+'\"}')" > "$T/big.json"
BIG="$(curl -s -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' --data-binary @"$T/big.json" "$BASE/api/v1/public/inquiries/")"
check "oversized JSON rejected (got $BIG)" [ "$BIG" = 413 ]
# A chunked body has no Content-Length: refused with 411 (after being drained, so
# the proxy never sees EPIPE and turns it into a 500).
CH="$(curl -s -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' -H 'Transfer-Encoding: chunked' --data-binary @"$T/big.json" "$BASE/api/v1/public/inquiries/")"
check "chunked body refused (got $CH)" [ "$CH" = 411 ]

# Upload above Next's old 10 MB proxy limit (needs a service with a file field).
# The 12 MB file goes to the first file field; every other required file or
# image field gets a small valid file, so the check keeps working when the
# owner adds fields to the service in the dashboard.
FS="$(curl -s "$BASE/api/v1/public/services/" | T="$T" BASE="$BASE" python3 -c "
import json, os, struct, sys, urllib.parse, urllib.request, zlib
base, t = os.environ['BASE'], os.environ['T']
def png(path):  # 1×1 white PNG
    chunk = lambda k, d: struct.pack('>I', len(d)) + k + d + struct.pack('>I', zlib.crc32(k + d))
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(b'\x00\xff\xff\xff')) + chunk(b'IEND', b''))
for s in json.load(sys.stdin):
    d = json.load(urllib.request.urlopen(base + '/api/v1/public/services/' + urllib.parse.quote(s['slug']) + '/'))
    files = [x for x in d['fields'] if x['type'] == 'file']
    if not files: continue
    answers = {x['key']: (x['options'][:1] if x['type'] == 'multiselect' else (x['options'][0] if x['options'] else 'x'))
               for x in d['fields'] if x['type'] not in ('file', 'image') and x['required']}
    json.dump({'service': s['slug'], 'customer_name': 'رفع كبير', 'customer_phone': '+249911000222', 'answers': answers, 'consent': True},
              open(t + '/payload.json', 'w'), ensure_ascii=False)
    open(t + '/12mb.pdf', 'wb').write(b'%PDF-1.4\n' + b'0' * (12 * 1024 * 1024))
    open(t + '/small.pdf', 'wb').write(b'%PDF-1.4\n' + b'0' * 1024)
    png(t + '/small.png')
    args = ['file.%s=@%s/12mb.pdf;type=application/pdf' % (files[0]['key'], t)]
    for x in d['fields'][:]:
        if x is files[0] or not x['required']: continue
        if x['type'] == 'file': args.append('file.%s=@%s/small.pdf;type=application/pdf' % (x['key'], t))
        if x['type'] == 'image': args.append('file.%s=@%s/small.png;type=image/png' % (x['key'], t))
    open(t + '/files.txt', 'w').write('\n'.join(args) + '\n')
    print(s['slug']); break
")"
if [ -n "$FS" ]; then
  UPLOAD=(-H "Idempotency-Key: $(python3 -c 'import uuid;print(uuid.uuid4())')" -F "payload=<$T/payload.json")
  while IFS= read -r f; do UPLOAD+=(-F "$f"); done < "$T/files.txt"
  UP_CODE="$(curl -s -o "$T/upload.json" -w '%{http_code}' "${UPLOAD[@]}" "$BASE/api/v1/public/orders/")"
  [ "$UP_CODE" = 201 ] || echo "     $FS → $UP_CODE $(head -c 300 "$T/upload.json")"
  check "12 MB upload through proxy" [ "$UP_CODE" = 201 ]
else
  echo "skip 12 MB upload (no service with a file field)"
fi
echo "smoke: $pass checks passed"
