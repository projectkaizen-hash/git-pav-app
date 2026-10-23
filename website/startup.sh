#!/bin/sh
set -eu
cd /Users/hhello/Downloads/yH8EosRG7yvY6v5K-grok-workspace
node scripts/preview.mjs stop || true
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
