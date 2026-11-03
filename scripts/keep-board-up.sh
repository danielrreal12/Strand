#!/usr/bin/env bash
# Keep the Optimum board reachable from a phone.
#
# The phone address is https://paigesplicer.loca.lt/go. Reconnecting asks for
# that same name. Do not open a localhost.run, trycloudflare.com, or Serveo
# address. Those names are thrown away while the phone still has them.
#
# The live address is written to /tmp/splicer-public-url.txt.
set -u

PORT=3847
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG=/tmp/splicer-keep.log
LT_LOG=/tmp/splicer-lt.log
URL_FILE=/tmp/splicer-public-url.txt
PID_FILE=/tmp/splicer-keep.pid
PHONE_URL="https://paigesplicer.loca.lt/go"

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"
}

local_ok() {
  curl -sf -o /dev/null --max-time 8 "http://127.0.0.1:${PORT}/go"
}

lt_pid() {
  ps -eo pid,cmd | awk '/localtunnel/ && /paigesplicer/ && !/awk/ { print $1; exit }'
}

public_ok() {
  local code
  code="$(curl -sS -o /tmp/splicer-public-body --max-time 15 -w '%{http_code}' -H 'bypass-tunnel-reminder: 1' -A 'SplicerBoard/1' "$PHONE_URL" || true)"
  [[ "$code" == "200" ]] || return 1
  grep -q 'Access code\|Splicer' /tmp/splicer-public-body
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
  if [[ -n "$(lt_pid)" ]]; then
    return 0
  fi
  log "opening the phone tunnel"
  (
    cd "$ROOT"
    nohup npx --yes localtunnel --port "$PORT" --subdomain paigesplicer >> "$LT_LOG" 2>&1 &
  )
  local i
  for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do
    sleep 1
    if public_ok; then
      printf '%s\n' "$PHONE_URL" > "$URL_FILE"
      log "phone address is ${PHONE_URL}"
      return 0
    fi
    if [[ -z "$(lt_pid)" ]]; then
      log "phone tunnel process exited"
      return 1
    fi
  done
  log "phone tunnel did not answer"
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
printf '%s\n' "$PHONE_URL" > "$URL_FILE"
log "keeper started"
while true; do
  start_next || true
  if public_ok; then
    printf '%s\n' "$PHONE_URL" > "$URL_FILE"
  elif [[ -z "$(lt_pid)" ]]; then
    log "phone tunnel process is gone"
    start_tunnel || true
  else
    log "phone tunnel is still open; leaving the address alone"
  fi
  sleep 20
done
