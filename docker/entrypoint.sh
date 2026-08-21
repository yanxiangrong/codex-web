#!/bin/sh
set -eu

requested_uid="${PUID:-1000}"
requested_gid="${PGID:-1000}"

if [ "$(id -g codex)" != "$requested_gid" ]; then
  groupmod --non-unique --gid "$requested_gid" codex
fi
if [ "$(id -u codex)" != "$requested_uid" ]; then
  usermod --non-unique --uid "$requested_uid" codex
fi

install -d -o codex -g codex /home/codex /home/codex/.codex /workspace
chown codex:codex /home/codex /home/codex/.codex /workspace

exec gosu codex "$@"
