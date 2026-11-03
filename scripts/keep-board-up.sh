#!/usr/bin/env bash
# Keep the Optimum board reachable from a phone.
#
# Restart the local server if it stops answering. Leave a running Cloudflare
# tunnel alone. Replacing it deletes the name the phone is already using, and
# Safari then says the server cannot be found.
#
# The live address is written to /tmp/splicer-public-url.txt.
set -u

PORT=3847
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CF=/tmp/cloudflared
LOG=/tmp/splicer-keep.log
CF_LOG=/tmp/cloudflared-splicer.log
URL_FILE=/tmp/splicer-public-url.txt
PID_FILE=/tmp/splicer-keep.pid

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"
}

local_ok() {
  curl -sf -o /dev/null --max-time 8 "http://127.0.0.1:${PORT}/"
}

cf_pid() {
  ps -eo pid,cmd | awk '/cloudflared tunnel/ && !/awk/ { print $1; exit }'
}

latest_url() {
  [[ -f "$CF_LOG" ]] || return 1
  local url
  url="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$CF_LOG" | tail -1 || true)"
  [[ -n "$url" ]] || return 1
  printf '%s\n' "$url"
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

start_tunnel() {
  if [[ -n "$(cf_pid)" ]]; then
    return 0
  fi
  : > "$CF_LOG"
  log "opening a tunnel"
  nohup "$CF" tunnel --url "http://127.0.0.1:${PORT}" --no-autoupdate --protocol http2 --logfile "$CF_LOG" --loglevel info >> "$CF_LOG" 2>&1 &
  local i url
  for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
    sleep 1
    url="$(latest_url || true)"
    if [[ -n "$url" ]]; then
      printf '%s\n' "$url" > "$URL_FILE"
      log "tunnel address is ${url}"
      return 0
    fi
    if [[ -z "$(cf_pid)" ]]; then
      log "tunnel process exited"
      return 1
    fi
  done
  log "tunnel did not print an address"
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
  if [[ -z "$(cf_pid)" ]]; then
    log "tunnel process is gone"
    start_tunnel || true
  else
    url="$(latest_url || true)"
    if [[ -n "$url" ]]; then
      printf '%s\n' "$url" > "$URL_FILE"
    fi
  fi
  sleep 20
done
