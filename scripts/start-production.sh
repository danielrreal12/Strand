#!/usr/bin/env bash
# Production start for Render (and any host that sets PORT).
set -euo pipefail
DATA_DIR="${DATA_DIR:-.data}"
MAPS_DIR="${MAPS_DIR:-private/maps}"
mkdir -p "$DATA_DIR" "$MAPS_DIR"
exec npx next start --hostname 0.0.0.0 --port "${PORT:-3847}"
