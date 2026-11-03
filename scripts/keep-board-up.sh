#!/usr/bin/env bash
# Keep the Optimum board reachable from a phone.
#
# The local server is restarted if it stops answering. The public tunnel is an
# SSH connection to localhost.run with keepalives. A Cloudflare quick tunnel is
# not used: when that name expires, the process retries the dead name forever
# and the phone stays on a page that never loads.
#
# The live address is written to /tmp/splicer-public-url.txt. A free tunnel
# name lasts for the life of this connection. If the connection has to be
# rebuilt, localhost.run issues a new name and this script records it.
set -u

PORT=3847
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY="$ROOT/.data/tunnel_ed25519"
LOG=/tmp/splicer-keep.log
SSH_LOG=/tmp/splicer-ssh.log
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

ssh_pid() {
  ps -eo pid,cmd | awk '/nokey@localhost.run/ && !/awk/ { print $1; exit }'
}

current_url() {
  [[ -f "$URL_FILE" ]] || return 1
  local url
  url="$(tr -d '[:space:]' < "$URL_FILE")"
  [[ "$url" == https://*.lhr.life ]] || return 1
  printf '%s\n' "$url"
}

public_ok() {
  local url code
  url="$(current_url)" || return 1
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 12 "$url/" || true)"
  [[ "$code" == "200" ]]
}

ensure_key() {
  if [[ -f "$KEY" ]]; then
    return 0
  fi
  mkdir -p "$ROOT/.data"
  ssh-keygen -t ed25519 -f "$KEY" -N '' -C 'splicer-tunnel' >/dev/null
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
  if [[ -n "$(ssh_pid)" ]]; then
    kill "$(ssh_pid)" 2>/dev/null || true
    sleep 1
  fi
  : > "$SSH_LOG"
  log "opening a tunnel"
  nohup ssh -i "$KEY" \
    -o StrictHostKeyChecking=accept-new \
    -o ServerAliveInterval=15 \
    -o ServerAliveCountMax=3 \
    -o ExitOnForwardFailure=yes \
    -o TCPKeepAlive=yes \
    -R 80:127.0.0.1:${PORT} \
    nokey@localhost.run >> "$SSH_LOG" 2>&1 &
  local i url
  for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
    sleep 1
    url="$(grep -oE 'https://[a-z0-9]+\.lhr\.life' "$SSH_LOG" | tail -1 || true)"
    if [[ -n "$url" ]]; then
      printf '%s\n' "$url" > "$URL_FILE"
      log "tunnel address is ${url}"
      return 0
    fi
    if [[ -z "$(ssh_pid)" ]]; then
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
ensure_key
while true; do
  start_next || true
  if ! local_ok; then
    log "board is down; skipping the public check"
    sleep 5
    continue
  fi
  if [[ -z "$(ssh_pid)" ]]; then
    log "tunnel process is gone"
    start_tunnel || true
    FAILS=0
    sleep 5
    continue
  fi
  if public_ok; then
    if [[ "$FAILS" != "0" ]]; then
      log "public link recovered $(current_url)"
    fi
    FAILS=0
  else
    FAILS=$((FAILS + 1))
    log "public check failed (${FAILS}) $(current_url || true)"
    if [[ "$FAILS" -ge 3 ]]; then
      start_tunnel || true
      if public_ok; then
        log "public link recovered after a new tunnel $(current_url)"
        FAILS=0
      fi
    fi
  fi
  sleep 20
done
