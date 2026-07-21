#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${BACKEND_PORT:-5001}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
[[ -f "$ROOT/.env" ]] || { echo "Missing .env; copy .env.example." >&2; exit 1; }
case "${1:-backend}" in
  backend) cd "$ROOT/backend"; exec env BACKEND_PORT="$BACKEND_PORT" PORT="$BACKEND_PORT" npm start;;
  frontend) cd "$ROOT/frontend"; exec npm run dev -- --host 127.0.0.1 --port "$FRONTEND_PORT";;
  *) echo "Usage: $0 [backend|frontend]" >&2; exit 64;;
esac
