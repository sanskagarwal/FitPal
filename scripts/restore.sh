#!/usr/bin/env bash
# Copy a previously saved SQLite database back into the running container,
# replacing the live database. The container must be restarted afterwards for
# the change to take effect.
#
# Usage:
#   ./scripts/restore.sh <backup-file.db>
#
# Environment:
#   FITPAL_CONTAINER   Container name or ID (default: fitpal)
set -euo pipefail

CONTAINER="${FITPAL_CONTAINER:-fitpal}"

if [[ -z "${1-}" ]]; then
  echo "Usage: $0 <backup-file.db>"
  exit 1
fi

BACKUP_FILE="$1"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Error: file not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will replace the database in container '$CONTAINER'."
echo "All current data will be overwritten. This cannot be undone."
echo ""
read -r -p "Type 'yes' to continue: " CONFIRM

if [[ "$CONFIRM" != "yes" ]]; then
  echo "Aborted."
  exit 0
fi

docker cp "$BACKUP_FILE" "$CONTAINER:/app/data/fitpal.db"
echo "Restored: $BACKUP_FILE -> $CONTAINER:/app/data/fitpal.db"
echo "Restart the container for the change to take effect:"
echo "  docker restart $CONTAINER"
