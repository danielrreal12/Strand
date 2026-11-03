#!/usr/bin/env bash
# Keep the Optimum board reachable from a phone.
#
# The local server is restarted if it stops answering. The public link is a
# Cloudflare quick tunnel. A new address is opened only when that process has
# exited. A slow check or an error in the log must not replace the address,
# because the phone is already on the current one.
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
FAILS=0

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"
}

port_open() {
  python3 - "$PORT" << 'PY'
import socket, sys
sock = socket.socket()
sock.settimeout(1)
try:
    sock.connect(("127.0.0.1", int(sys.argv[1])))
except OSError:
    raise SystemExit(1)
finally:
    sock.close()
PY
}

listener_pid() {
  python3 - "$PORT" << 'PY'
import os, sys
port = int(sys.argv[1])
inode = None
for name in ("/proc/net/tcp", "/proc/net/tcp6"):
    try:
        lines = open(name)
    except OSError:
        continue
    for line in lines:
        parts = line.split()
        if len(parts) < 10 or ":" not in parts[1]:
            continue
        if int(parts[1].split(":")[1], 16) == port and parts[3] == "0A":
            inode = parts[9]
            break
    if inode:
        break
if not inode:
    raise SystemExit
for pid in os.listdir("/proc"):
    if not pid.isdigit():
        continue
    folder = f"/proc/{pid}/fd"
    try:
        names = os.listdir(folder)
    except OSError:
        continue
    for name in names:
        try:
            if os.readlink(f"{folder}/{name}") == f"socket:[{inode}]":
                print(pid)
                raise SystemExit
        except OSError:
            pass
PY
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

current_url() {
  [[ -f "$URL_FILE" ]] || return 1
  local url
  url="$(tr -d '[:space:]' < "$URL_FILE")"
  [[ "$url" == https://*.trycloudflare.com ]] || return 1
  printf '%s\n' "$url"
}

# ok: the phone link answered. dead: the name is gone. slow: still connected.
public_status() {
  local url code
  url="$(current_url)" || {
    printf '%s\n' dead
    return
  }
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$url/" || true)"
  if [[ "$code" == "200" ]]; then
    printf '%s\n' ok
  elif [[ "$code" == "502" || "$code" == "503" || "$code" == "530" || "$code" == "404" || "$code" == "403" ]]; then
    printf '%s\n' dead
  else
    printf '%s\n' slow
  fi
}

start_next() {
  if port_open && local_ok; then
    return 0
  fi
  if port_open; then
    log "board port is open but not answering; restarting it"
    local pid
    pid="$(listener_pid || true)"
    if [[ -n "${pid:-}" ]]; then
      kill "$pid" 2>/dev/null || true
      sleep 1
    fi
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
    kill "$(cf_pid)" 2>/dev/null || true
    sleep 1
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
  if ! local_ok; then
    log "board is down; skipping the public check"
    sleep 5
    continue
  fi
  if [[ -z "$(cf_pid)" ]]; then
    log "tunnel process is gone"
    start_tunnel || true
    FAILS=0
    sleep 5
    continue
  fi
  remembered="$(latest_url || true)"
  if [[ -n "$remembered" && "$(current_url || true)" != "$remembered" ]]; then
    printf '%s\n' "$remembered" > "$URL_FILE"
    log "tunnel address is ${remembered}"
  fi
  # Leave the running tunnel alone. Replacing it gives the phone a name that
  # no longer exists, which Safari reports as "server can't be found."
  sleep 20
done
