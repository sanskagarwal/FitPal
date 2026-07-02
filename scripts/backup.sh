#!/usr/bin/env bash
# Copy the FitPal SQLite database out of the running container to a local
# timestamped file. Run this on the host machine to create an instance-level
# backup that complements the per-user ZIP backups the app itself can export.
#
# Usage:
#   ./scripts/backup.sh
#
# Environment:
#   FITPAL_CONTAINER   Container name or ID (default: fitpal)
#   FITPAL_BACKUP_DIR  Output directory (default: ./backups)
set -euo pipefail

CONTAINER="${FITPAL_CONTAINER:-fitpal}"
BACKUP_DIR="${FITPAL_BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUT="$BACKUP_DIR/fitpal-$TIMESTAMP.db"

mkdir -p "$BACKUP_DIR"
docker cp "$CONTAINER:/app/data/fitpal.db" "$OUT"
echo "Backup saved: $OUT"
