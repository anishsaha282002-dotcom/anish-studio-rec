# Solana Memecoin Signal Scanner

A **read-only** monitoring service that polls Solana DEX market data, filters new and trending token pairs through configurable rules and on-chain safety checks, scores survivors, and pushes formatted alerts to a Telegram chat.

> **Research tool only. Not financial advice.** Solana memecoins are extremely high risk and the large majority of tokens surfaced here will lose most or all of their value. Nothing this bot outputs is a recommendation to buy, sell, or hold anything.

## What it does

1. Discovers candidate pairs from DexScreener (Solana only)
2. Prefilters on liquidity, volume, age, and quote-pair rules
3. Enriches survivors with Birdeye holder data and on-chain safety checks via Helius RPC
4. Scores each candidate (0–100) with itemised reasons and flags
5. Deduplicates against recent alerts (SQLite)
6. Sends Telegram alerts for strong/high-tier signals (or logs them in dry-run mode)

This system **never signs, submits, or simulates transactions**. There are no wallet adapters, keypairs, or private keys anywhere in the codebase.

## Prerequisites

- Node.js 20+
- npm

## Quick start

```bash
cp .env.example .env
# Fill in API keys (see below)
npm install
npm run dev        # development with hot reload
npm start          # production (after npm run build)
```

`DRY_RUN=true` is the default — the full pipeline runs but alerts are logged instead of sent to Telegram.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `HELIUS_API_KEY` | Yes | Helius RPC API key for on-chain reads |
| `BIRDEYE_API_KEY` | Yes | Birdeye free-tier API key for holder enrichment |
| `TELEGRAM_BOT_TOKEN` | Yes (for live alerts) | Bot token from [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_ID` | Yes (for live alerts) | Target chat/channel ID |
| `LOG_LEVEL` | No | Pino log level (default: `info`) |
| `TICK_INTERVAL_MS` | No | Pipeline tick interval in ms (default: `60000`) |
| `DRY_RUN` | No | Log alerts instead of sending (default: `true`) |

## Getting API keys

### Helius (Solana RPC)

1. Sign up at [helius.dev](https://helius.dev)
2. Create a free API key
3. Set `HELIUS_API_KEY` in `.env`

### Birdeye

1. Sign up at [birdeye.so](https://birdeye.so)
2. Generate a free API key from the dashboard
3. Set `BIRDEYE_API_KEY` in `.env`

### Telegram bot

1. Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy the token
2. Add the bot to your target chat/channel
3. Find your chat ID (send a message, then visit `https://api.telegram.org/bot<TOKEN>/getUpdates`)
4. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env`

### DexScreener / Jupiter

No account needed — public APIs only.

## Configuration

Scoring thresholds and weights live in `config/rules.yaml` (hot-reloadable). A denylist of mints is in `config/denylist.txt`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with tsx watch |
| `npm start` | Run compiled output |
| `npm run build` | Compile TypeScript |
| `npm run typecheck` | Type-check without emit |
| `npm test` | Run unit tests (fixtures only, no network) |
| `npm run lint` | ESLint |
| `npm run lint:readonly` | Grep check for forbidden signing patterns |
| `npm run check` | typecheck + lint + readonly + test |

## Docker

> Coming in a later step — Dockerfile and docker-compose.yml will be added once the pipeline is complete.

## Project structure

```
src/
  config/       # Env + rules loading
  sources/      # DexScreener, Birdeye, Helius, Jupiter adapters
  pipeline/     # discover → normalize → prefilter → enrich → score → alert
  lib/          # Shared utilities (logger, retry, rate limiter)
  telegram/     # Bot sender + commands
data/           # SQLite database (gitignored)
config/         # rules.yaml, denylist.txt
```

## License

MIT
