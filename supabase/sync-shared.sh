#!/usr/bin/env bash
# Copy the shared helper into each function folder: every Edge Function is bundled and deployed on its own.
set -euo pipefail
cd "$(dirname "$0")/functions"
for f in sales-lead sales-bot; do cp _shared/sales.ts "$f/sales.ts"; done
echo "synced _shared/sales.ts into sales-lead and sales-bot"
