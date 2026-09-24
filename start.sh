#!/usr/bin/env bash
# Render start: Gunicorn (Django) on an internal port, Next.js on $PORT, and
# the e-mail alert worker. If any process exits, the others are stopped and
# Render restarts the service.
set -euo pipefail
cd "$(dirname "$0")"
DJANGO_PORT="${DJANGO_PORT:-8000}"
PUBLIC_PORT="${PORT:-3000}"

# Refuse to start with missing configuration (Django also validates these).
for var in SITE_URL DATABASE_URL DJANGO_SECRET_KEY JWT_SIGNING_KEY INTERNAL_SECRET; do
  if [ -z "${!var:-}" ]; then echo "start.sh: missing required env var $var" >&2; exit 1; fi
done

export DJANGO_INTERNAL_URL="http://127.0.0.1:${DJANGO_PORT}"
# Django calls Next on this address to revalidate cached pages; it must be
# exported before Gunicorn starts, not only for the node process.
export NEXT_INTERNAL_URL="http://127.0.0.1:${PUBLIC_PORT}"
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.prod}"
mkdir -p "${DATA_ROOT:-var}/public" "${DATA_ROOT:-var}/private"

# Threaded workers: a slow upload or download must not block the whole API.
PIDS=()
# Graceful stop on deploy: forward SIGTERM to every process and wait for them
# (Gunicorn finishes in-flight requests within --graceful-timeout).
shutdown() {
  trap - TERM INT
  kill -TERM "${PIDS[@]}" 2>/dev/null || true
  wait
  exit 0
}
trap shutdown TERM INT

gunicorn config.wsgi:application \
  --bind "127.0.0.1:${DJANGO_PORT}" \
  --workers "${WEB_CONCURRENCY:-2}" \
  --worker-class gthread --threads "${GUNICORN_THREADS:-4}" \
  --timeout 120 --graceful-timeout 25 \
  --max-requests 1000 --max-requests-jitter 100 \
  --access-logfile - &
PIDS+=($!)

HOSTNAME=0.0.0.0 PORT="$PUBLIC_PORT" node frontend/.next/standalone/server.js &
PIDS+=($!)

python manage.py send_notifications --loop &
PIDS+=($!)

# If any process dies, stop the rest and exit non-zero so Render restarts us.
set +e
wait -n "${PIDS[@]}"
status=$?
echo "start.sh: a process exited (status $status); stopping the service" >&2
kill -TERM "${PIDS[@]}" 2>/dev/null
wait
exit 1
