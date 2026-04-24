#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.local}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups/db}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
KEEP_LATEST="${KEEP_LATEST:-10}"
COMPRESSION_LEVEL="${COMPRESSION_LEVEL:-9}"

mkdir -p "$BACKUP_DIR"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set. Checked $ENV_FILE" >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required but was not found on PATH." >&2
  exit 1
fi

TIMESTAMP="$(date '+%Y-%m-%d_%H-%M-%S')"
HOSTNAME_VALUE="$(hostname 2>/dev/null || echo unknown-host)"
BACKUP_FILE="$BACKUP_DIR/siteflo_${TIMESTAMP}.dump"
METADATA_FILE="$BACKUP_DIR/siteflo_${TIMESTAMP}.json"
LATEST_FILE="$BACKUP_DIR/latest-backup.json"

echo "Creating backup: $BACKUP_FILE"
pg_dump \
  --format=custom \
  --compress="$COMPRESSION_LEVEL" \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_FILE" \
  "$DATABASE_URL"

FILE_SIZE="$(wc -c < "$BACKUP_FILE" | tr -d ' ')"
CREATED_AT="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

cat > "$METADATA_FILE" <<EOF
{
  "createdAt": "$CREATED_AT",
  "hostname": "$HOSTNAME_VALUE",
  "backupFile": "$(basename "$BACKUP_FILE")",
  "sizeBytes": $FILE_SIZE,
  "retentionDays": $RETENTION_DAYS,
  "compressionLevel": $COMPRESSION_LEVEL
}
EOF

cp "$METADATA_FILE" "$LATEST_FILE"

find "$BACKUP_DIR" -type f \( -name 'siteflo_*.dump' -o -name 'siteflo_*.json' \) -mtime +"$RETENTION_DAYS" -delete

mapfile -t OLD_DUMPS < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'siteflo_*.dump' | sort -r)
if (( ${#OLD_DUMPS[@]} > KEEP_LATEST )); then
  for dump_file in "${OLD_DUMPS[@]:KEEP_LATEST}"; do
    rm -f "$dump_file"
    rm -f "${dump_file%.dump}.json"
  done
fi

echo "Backup complete."
echo "Created: $BACKUP_FILE"
echo "Metadata: $METADATA_FILE"
echo "Compression level: $COMPRESSION_LEVEL"
