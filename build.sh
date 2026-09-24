#!/usr/bin/env bash
# Render build: one service builds both halves of the monolith.
# Migrations do NOT run here; they run in render.yaml's preDeployCommand so a
# failed build never leaves the database migrated for code that is not live.
set -euo pipefail
cd "$(dirname "$0")"

# The Python runtime must provide Node 22 for the Next.js build.
if ! command -v node >/dev/null 2>&1; then
  echo "build.sh: node is not available in this runtime" >&2; exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" != "22" ]; then
  echo "build.sh: expected Node 22, found $(node -v)" >&2; exit 1
fi
echo "node $(node -v), npm $(npm -v), $(python --version)"

pip install -r requirements.txt

pushd frontend
npm ci --include=dev
npm run build
# The standalone server needs static assets and public/ next to server.js.
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
popd

python manage.py collectstatic --noinput
