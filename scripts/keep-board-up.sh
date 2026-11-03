#!/usr/bin/env bash
# Keep the Optimum board reachable from a phone.
#
# Restart the local server if it stops answering.
# Keep one localhost.run tunnel pointed at that server.
# Never replace a tunnel that still answers: a new SSH session gets a new
# name, and the phone then says "no tunnel" on the old address.
# Do not open trycloudflare.com names. Those DNS records get deleted and
# Safari says the server cannot be found.
#
# The live address (the /go phone page) is written to /tmp/splicer-public-url.txt.
set -u

PORT=3847
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG=/tmp/splicer-keep.log
SSH_LOG=/tmp/splicer-ssh.log
URL_FILE=/tmp/splicer-public-url.txt
PID_FILE=/tmp/splicer-keep.pid
KEY="$ROOT/.data/tunnel_ed25519"

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"
}

local_ok() {
  curl -sf -o /dev/null --max-time 8 "http://127.0.0.1:${PORT}/go"
}

ssh_pid() {
  ps -eo pid,cmd | awk '/ssh/ && /nokey@localhost.run/ && /-R 80:127.0.0.1:'"$PORT"'/ && !/awk/ { print $1; exit }'
}

latest_url() {
  [[ -f "$SSH_LOG" ]] || return 1
  local host
  host="$(grep -aoE '[a-z0-9]+\.lhr\.life' "$SSH_LOG" | tail -1 || true)"
  [[ -n "$host" ]] || return 1
  printf 'https://%s/go\n' "$host"
}

public_ok() {
  local url="$1" code
  code="$(curl -sS -o /tmp/splicer-public-body --max-time 12 -w '%{http_code}' -A 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' "$url" || true)"
  [[ "$code" == "200" ]] || return 1
  ! grep -q 'no tunnel' /tmp/splicer-public-body
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
  if [[ -n "$(ssh_pid)" ]]; then
    return 0
  fi
  if [[ ! -f "$KEY" ]]; then
    log "phone tunnel key is missing"
    return 1
  fi
  log "opening a phone tunnel"
  nohup ssh -i "$KEY" \
    -o StrictHostKeyChecking=accept-new \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=20 \
    -o ExitOnForwardFailure=yes \
    -o TCPKeepAlive=yes \
    -R "80:127.0.0.1:${PORT}" \
    nokey@localhost.run >> "$SSH_LOG" 2>&1 &
  local i url
  for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25; do
    sleep 1
    url="$(latest_url || true)"
    if [[ -n "$url" ]] && public_ok "$url"; then
      printf '%s\n' "$url" > "$URL_FILE"
      log "phone address is ${url}"
      return 0
    fi
    if [[ -z "$(ssh_pid)" ]]; then
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
log "keeper started"
while true; do
  start_next || true
  url="$(latest_url || true)"
  if [[ -n "$url" ]] && public_ok "$url"; then
    printf '%s\n' "$url" > "$URL_FILE"
  elif [[ -z "$(ssh_pid)" ]]; then
    log "phone tunnel process is gone"
    start_tunnel || true
  else
    log "phone tunnel is still open; leaving the address alone"
  fi
  sleep 20
done
