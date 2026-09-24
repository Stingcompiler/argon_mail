#!/usr/bin/env bash
# Run the built monolith locally the way start.sh runs it on Render, but with
# dev settings (HTTP, local DB). Requires `npm run build` in frontend/ first.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; [ -f .env ] && . ./.env; set +a
DJANGO_PORT="${DJANGO_PORT:-8108}"; NEXT_PORT="${NEXT_PORT:-3108}"
export DJANGO_INTERNAL_URL="http://127.0.0.1:${DJANGO_PORT}"
.venv/bin/gunicorn config.wsgi:application --env DJANGO_SETTINGS_MODULE=config.settings.dev \
  --bind "127.0.0.1:${DJANGO_PORT}" --workers 2 --access-logfile - &
G=$!
.venv/bin/python manage.py send_notifications --loop &
W=$!
trap 'kill $G $W 2>/dev/null || true' EXIT
HOSTNAME=127.0.0.1 PORT="$NEXT_PORT" exec node frontend/.next/standalone/server.js
