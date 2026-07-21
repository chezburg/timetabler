#!/bin/sh
set -e

PUID="${PUID:-1000}"
PGID="${PGID:-1000}"

CURRENT_UID="$(id -u app)"
CURRENT_GID="$(id -g app)"

if [ "$CURRENT_UID" != "$PUID" ] || [ "$CURRENT_GID" != "$PGID" ]; then
  deluser app 2>/dev/null || true
  delgroup app 2>/dev/null || true
  addgroup -g "$PGID" app
  adduser -D -H -u "$PUID" -G app app
fi

chown -R app:app /app/data /app/uploads

echo "Running as app uid=$(id -u app) gid=$(id -g app)"
exec su-exec app:app "$@"
