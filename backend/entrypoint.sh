#!/bin/sh
set -e

PUID="${PUID:-1000}"
PGID="${PGID:-1000}"

CURRENT_UID="$(id -u app)"
CURRENT_GID="$(id -g app)"

# -o (non-unique) lets us reassign to an ID even if it's already claimed by some
# other dormant account — e.g. node:alpine ships a built-in "node" user/group at
# uid/gid 1000, which is also the most common PUID/PGID default. We don't care
# about that account, so sharing the numeric id is harmless.
if [ "$CURRENT_GID" != "$PGID" ]; then
  groupmod -o -g "$PGID" app
fi

if [ "$CURRENT_UID" != "$PUID" ]; then
  usermod -o -u "$PUID" app
fi

chown -R app:app /app/data /app/uploads

echo "Running as app uid=$(id -u app) gid=$(id -g app)"
exec su-exec app:app "$@"
