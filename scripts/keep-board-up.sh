#!/usr/bin/env bash
# Keep the Optimum board answering on this machine.
#
# The phone address is http://bore.pub:18473/. That name is not a Cloudflare
# quick-tunnel name, so it is not deleted out from under the phone.
# If the connection drops, reconnect the same port. Do not pick a new one.
set -u

PORT=3847
REMOTE_PORT=18473
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG=/tmp/splicer-keep.log
PID_FILE=/tmp/splicer-keep.pid
URL_FILE=/tmp/splicer-public-url.txt
BORE_BIN=/home/ubuntu/.local/bin/bore

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"
}

local_ok() {
  curl -sf -o /dev/null --max-time 8 "http://127.0.0.1:${PORT}/"
}

bore_running() {
  pgrep -f "bore local ${PORT} --local-host 127.0.0.1 --to bore.pub --port ${REMOTE_PORT}" >/dev/null
}

if [[ -f "$PID_FILE" ]]; then
  old_pid="$(tr -d '[:space:]' < "$PID_FILE" || true)"
  if [[ -n "${old_pid:-}" && "$old_pid" != "$$" ]] && kill -0 "$old_pid" 2>/dev/null; then
    log "keeper already running (${old_pid})"
    exit 0
  fi
fi
printf '%s\n' "$$" > "$PID_FILE"
printf 'http://bore.pub:%s/\n' "$REMOTE_PORT" > "$URL_FILE"
log "keeper started; phone address is http://bore.pub:${REMOTE_PORT}/"
while true; do
  if ! local_ok; then
    log "starting the board on port ${PORT}"
    (
      cd "$ROOT"
      nohup npx next start --port "$PORT" --hostname 0.0.0.0 >> /tmp/splicer-next.log 2>&1 &
    )
  fi
  if ! bore_running; then
    if [[ -x "$BORE_BIN" ]]; then
      log "reconnecting http://bore.pub:${REMOTE_PORT}/"
      nohup "$BORE_BIN" local "$PORT" --local-host 127.0.0.1 --to bore.pub --port "$REMOTE_PORT" >> /tmp/splicer-bore.log 2>&1 &
    else
      log "bore client is missing"
    fi
  fi
  sleep 20
done
