#!/usr/bin/env bash
# Keep the Optimum board answering on this machine.
#
# Do not open a phone address from here. A new name leaves the phone on a
# dead page. The address in use is /tmp/splicer-public-url.txt.
set -u

PORT=3847
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG=/tmp/splicer-keep.log
PID_FILE=/tmp/splicer-keep.pid

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"
}

local_ok() {
  curl -sf -o /dev/null --max-time 8 "http://127.0.0.1:${PORT}/"
}

if [[ -f "$PID_FILE" ]]; then
  old_pid="$(tr -d '[:space:]' < "$PID_FILE" || true)"
  if [[ -n "${old_pid:-}" && "$old_pid" != "$$" ]] && kill -0 "$old_pid" 2>/dev/null; then
    log "keeper already running (${old_pid})"
    exit 0
  fi
fi
printf '%s\n' "$$" > "$PID_FILE"
log "keeper started; the phone address will not be replaced"
while true; do
  if ! local_ok; then
    log "starting the board on port ${PORT}"
    (
      cd "$ROOT"
      nohup npx next start --port "$PORT" --hostname 0.0.0.0 >> /tmp/splicer-next.log 2>&1 &
    )
  fi
  sleep 20
done
