#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.local}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups/db}"
BACKUP_FILE="${1:-}"

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

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore is required but was not found on PATH." >&2
  exit 1
fi

if [[ -z "$BACKUP_FILE" ]]; then
  if [[ ! -f "$BACKUP_DIR/latest-backup.json" ]]; then
    echo "No backup file was provided and no latest-backup.json exists." >&2
    exit 1
  fi

  LATEST_NAME="$(LATEST_JSON_PATH="$BACKUP_DIR/latest-backup.json" python3 - <<'PY'
import json, pathlib
import os
path = pathlib.Path(os.environ["LATEST_JSON_PATH"])
data = json.loads(path.read_text())
print(data["backupFile"])
PY
)"
  BACKUP_FILE="$BACKUP_DIR/$LATEST_NAME"
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

echo "Restoring backup: $BACKUP_FILE"
echo "Target database will be overwritten."

pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="$DATABASE_URL" \
  "$BACKUP_FILE"

echo "Restore complete."
