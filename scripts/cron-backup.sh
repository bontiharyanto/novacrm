#!/bin/sh
set -eu

# BusyBox crond does not inherit Docker env (DATABASE_URL). PID 1 still has it.
if [ -r /proc/1/environ ]; then
  tmp="$(mktemp)"
  tr '\0' '\n' < /proc/1/environ > "$tmp"
  while IFS= read -r line; do
    case "$line" in
      [A-Za-z_]*=*) export "$line" ;;
    esac
  done < "$tmp"
  rm -f "$tmp"
fi

export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"
export TZ="${TZ:-Asia/Jakarta}"
exec /scripts/backup.sh
