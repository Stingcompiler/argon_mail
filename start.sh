#!/usr/bin/env bash
# Render start: Gunicorn (Django) on an internal port, Next.js on $PORT, and
# the e-mail alert worker. If any process exits, the others are stopped and
# Render restarts the service.
set -euo pipefail
cd "$(dirname "$0")"
DJANGO_PORT="${DJANGO_PORT:-8000}"
export DJANGO_INTERNAL_URL="http://127.0.0.1:${DJANGO_PORT}"
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.prod}"
mkdir -p "${DATA_ROOT:-var}/public" "${DATA_ROOT:-var}/private"

gunicorn config.wsgi:application \
  --bind "127.0.0.1:${DJANGO_PORT}" \
  --workers "${WEB_CONCURRENCY:-2}" \
  --timeout 30 --access-logfile - &
DJANGO_PID=$!

HOSTNAME=0.0.0.0 PORT="${PORT:-3000}" NEXT_INTERNAL_URL="http://127.0.0.1:${PORT:-3000}" \
  node frontend/.next/standalone/server.js &
NEXT_PID=$!

python manage.py send_notifications --loop &
WORKER_PID=$!

trap 'kill $DJANGO_PID $NEXT_PID $WORKER_PID 2>/dev/null || true' TERM INT
wait -n $DJANGO_PID $NEXT_PID $WORKER_PID
kill $DJANGO_PID $NEXT_PID $WORKER_PID 2>/dev/null || true
exit 1
