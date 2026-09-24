#!/usr/bin/env bash
# Restore a backup made by scripts/backup.sh, then verify it.
#
#   CONFIRM=yes DATABASE_URL=... DATA_ROOT=... scripts/restore.sh BACKUP_DIR
#
# DESTRUCTIVE: replaces every table in DATABASE_URL and the contents of
# DATA_ROOT. Stop the service (or run against a fresh database/disk) first.
set -euo pipefail
BACKUP="${1:?usage: restore.sh BACKUP_DIR}"
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${DATA_ROOT:?DATA_ROOT is required}"
if [ "${CONFIRM:-}" != "yes" ]; then
  echo "Refusing to restore without CONFIRM=yes (this overwrites $DATA_ROOT and the database)." >&2
  exit 1
fi

SHA="$(command -v sha256sum || echo "shasum -a 256")"
echo "== verifying checksums"
(cd "$BACKUP" && grep -E '^[0-9a-f]{64} ' manifest.txt | $SHA -c -)

echo "== restoring database"
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DATABASE_URL" "$BACKUP/db.dump"

echo "== restoring files into $DATA_ROOT"
mkdir -p "$DATA_ROOT"
find "$DATA_ROOT" -mindepth 1 -delete
tar -C "$DATA_ROOT" -xzf "$BACKUP/files.tar.gz"

echo "== reconciling database rows with files"
cd "$(dirname "$0")/.."
PYTHON="${PYTHON:-python}"
DATA_ROOT="$DATA_ROOT" DATABASE_URL="$DATABASE_URL" "$PYTHON" manage.py reconcile_files --checksums
echo "restore complete"
