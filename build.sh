#!/usr/bin/env bash
# Render build: one service builds both halves of the monolith.
set -euo pipefail
cd "$(dirname "$0")"

pip install --upgrade pip
pip install -r requirements.txt

pushd frontend
npm ci
npm run build
# The standalone server needs static assets and public/ next to server.js.
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
popd

python manage.py collectstatic --noinput
python manage.py migrate --noinput
python manage.py createcachetable
