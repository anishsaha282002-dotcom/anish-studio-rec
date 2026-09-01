#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — fill in your API keys before going live."
else
  echo ".env already exists — skipped copy."
fi

mkdir -p data

echo ""
echo "Setup complete. Next steps:"
echo "  1. Edit .env (at minimum: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)"
echo "  2. npm run dev     — start in development mode"
echo "  3. npm run check   — typecheck, lint, and test"
echo ""
