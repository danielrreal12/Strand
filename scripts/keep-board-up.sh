#!/usr/bin/env bash
# Keep the Optimum board answering on this machine.
#
# Do not open a new phone address. A new name leaves the phone on a dead link.
# The current address is read from the Cloudflare log and written to
# /tmp/splicer-public-url.txt only while that address still serves the phone page.
set -u

PORT=3847
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG=/tmp/splicer-keep.log
CF_LOG=/tmp/try-cf.log
URL_FILE=/tmp/splicer-public-url.txt
PID_FILE=/tmp/splicer-keep.pid

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"
}

local_ok() {
  curl -sf -o /dev/null --max-time 8 "http://127.0.0.1:${PORT}/go"
}

latest_url() {
  [[ -f "$CF_LOG" ]] || return 1
  local url
  url="$(grep -aoE 'https://[a-z0-9-]+\.trycloudflare\.com' "$CF_LOG" | tail -1 || true)"
  [[ -n "$url" ]] || return 1
  printf '%s/\n' "$url"
}

public_ok() {
  local url="$1" code
  code="$(curl -sS -o /tmp/splicer-public-body --max-time 12 -w '%{http_code}' -A 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1' "$url" || true)"
  [[ "$code" == "200" ]] || return 1
  grep -q 'Access code\|Loading your operation\|Splicer' /tmp/splicer-public-body
}

start_next() {
  if local_ok; then
    return 0
  fi
  log "starting the board on port ${PORT}"
  (
    cd "$ROOT"
    nohup npx next start --port "$PORT" --hostname 0.0.0.0 >> /tmp/splicer-next.log 2>&1 &
  )
  local i
  for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
    sleep 1
    if local_ok; then
      log "board is answering"
      return 0
    fi
  done
  log "board did not answer after start"
  return 1
}

if [[ -f "$PID_FILE" ]]; then
  old_pid="$(tr -d '[:space:]' < "$PID_FILE" || true)"
  if [[ -n "${old_pid:-}" && "$old_pid" != "$$" ]] && kill -0 "$old_pid" 2>/dev/null; then
    log "keeper already running (${old_pid})"
    exit 0
  fi
fi
printf '%s\n' "$$" > "$PID_FILE"
log "keeper started"
while true; do
  start_next || true
  url="$(latest_url || true)"
  if [[ -n "$url" ]] && public_ok "$url"; then
    printf '%s\n' "$url" > "$URL_FILE"
  else
    log "phone address is not being replaced"
  fi
  sleep 20
done
