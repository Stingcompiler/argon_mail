#!/usr/bin/env bash
# Consistent backup of the database and the persistent disk.
#
#   DATABASE_URL=... DATA_ROOT=/var/data scripts/backup.sh [OUT_DIR]
#
# Order matters: the database is dumped first, then the files. Files are only
# ever added (never rewritten), so every row in the dump has its file in the
# archive; files uploaded in between become harmless orphans on restore.
# Copy the resulting directory OFF the server (see docs/backup-restore.md).
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${DATA_ROOT:?DATA_ROOT is required}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${1:-backups}/arjoon-$STAMP"
mkdir -p "$OUT"
SHA="$(command -v sha256sum || echo "shasum -a 256")"

pg_dump --format=custom --no-owner --no-privileges --dbname="$DATABASE_URL" --file="$OUT/db.dump"
tar -C "$DATA_ROOT" -czf "$OUT/files.tar.gz" --exclude='*.part' .

{
  echo "created_utc=$STAMP"
  echo "data_root=$DATA_ROOT"
  echo "private_files=$(find "$DATA_ROOT/private" -type f ! -name '*.part' 2>/dev/null | wc -l | tr -d ' ')"
  (cd "$OUT" && $SHA db.dump files.tar.gz)
} > "$OUT/manifest.txt"

echo "backup written to $OUT"
cat "$OUT/manifest.txt"
