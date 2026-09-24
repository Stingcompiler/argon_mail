#!/usr/bin/env bash
# Tests start.sh process supervision with stub gunicorn/node/python.
# Needs bash >= 5.1 (wait -n with PIDs); runs in CI on Ubuntu.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin"
for name in gunicorn node python; do
  cat > "$T/bin/$name" <<STUB
#!/usr/bin/env bash
echo "started $name" >> "$T/log"
trap 'echo "stopped $name" >> "$T/log"; exit 0' TERM
if [ "$name" = "\${CRASH:-}" ]; then sleep 1; echo "crashed $name" >> "$T/log"; exit 3; fi
while true; do sleep 0.2; done
STUB
  chmod +x "$T/bin/$name"
done
export PATH="$T/bin:$PATH" SITE_URL=https://x.example DATABASE_URL=postgres:///x DJANGO_SECRET_KEY=k \
  JWT_SIGNING_KEY=j INTERNAL_SECRET=s DATA_ROOT="$T/data"

fail() { echo "FAIL: $*"; cat "$T/log" 2>/dev/null; exit 1; }

# 1. SIGTERM (deploy): every child is stopped and start.sh exits 0.
: > "$T/log"
bash "$ROOT/start.sh" & PID=$!
sleep 1.5
kill -TERM "$PID"
wait "$PID"; code=$?
[ "$code" = 0 ] || fail "graceful stop exited $code"
for n in gunicorn node python; do grep -q "stopped $n" "$T/log" || fail "$n not stopped on SIGTERM"; done
echo "ok: graceful shutdown"

# 2. A child crashes: the others are stopped and start.sh exits non-zero.
: > "$T/log"
set +e
CRASH=node bash "$ROOT/start.sh"; code=$?
set -e
[ "$code" != 0 ] || fail "crash did not make start.sh fail"
grep -q "crashed node" "$T/log" || fail "stub did not crash"
for n in gunicorn python; do grep -q "stopped $n" "$T/log" || fail "$n not stopped after crash"; done
echo "ok: crash stops the service"

# 3. Missing configuration: refuses to start.
set +e
SITE_URL= bash "$ROOT/start.sh" 2> "$T/err"; code=$?
set -e
[ "$code" != 0 ] && grep -q "missing required env var SITE_URL" "$T/err" || fail "missing env not rejected"
echo "ok: missing env rejected"
