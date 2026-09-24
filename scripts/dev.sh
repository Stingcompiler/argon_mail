#!/usr/bin/env bash
# Local development: Django (runserver) + Next.js dev server, one origin.
# Usage: scripts/dev.sh   (reads .env; ports via DJANGO_PORT / NEXT_PORT)
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; [ -f .env ] && . ./.env; set +a
DJANGO_PORT="${DJANGO_PORT:-8108}"
NEXT_PORT="${NEXT_PORT:-3108}"
export DJANGO_INTERNAL_URL="http://127.0.0.1:${DJANGO_PORT}"

.venv/bin/python manage.py migrate --noinput
.venv/bin/python manage.py runserver "127.0.0.1:${DJANGO_PORT}" &
DJANGO_PID=$!
trap 'kill $DJANGO_PID 2>/dev/null || true' EXIT
cd frontend && npx next dev --port "$NEXT_PORT" --hostname 127.0.0.1
