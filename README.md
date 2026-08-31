# Solana Momentum Bot

Paper-first momentum trader for **established** Solana tokens — not launch sniping.

## Design principles

1. **Burner wallet only** — Phantom is for watching; the bot signs with its own keypair (`setup_wallet.py`). Never put your main seed phrase in this project.
2. **$100 validates the system** — priority fees, Jito tips, failed txs, and slippage eat 10–40% over ~20 round trips. Treat the stake as tuition.
3. **Filters, not prediction** — edge comes from speed to on-chain signals and rejecting rugs (mint/freeze authority, holder concentration, exit routes).
4. **Telegram is input, not trigger** — call channels are often exit liquidity. Mentions add up to 20 bonus points; they cannot trigger a buy alone.

## Strategy

Momentum on tokens that **survived their first day**, in pools **≥ $150k** liquidity. Round-trip friction ~1.3% vs ~3–8% per snipe attempt on retail infra.

**Scoring:** on-chain momentum is the base score (trigger). Social/Telegram adds 0–20 bonus points. Zero mentions = zero bonus, **never a penalty**.

## Safety (fail-closed)

- Mint/freeze authority read from chain via RPC
- Jupiter exit-route quote before every entry (honeypot test)
- Top-10 holder concentration cap
- Liquidity-to-market-cap floor
- RugCheck — if unavailable in live mode, trading stops

## Quick start (on your Mac)

```bash
cd ~/Documents/solana-bot   # or clone this repo
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # paste a free Helius RPC URL
python3 verify_apis.py      # proves endpoints work from YOUR machine
python3 run.py              # paper only by default
```

**Paper trade for two weeks** before funding anything.

When ready for live:

```bash
python3 setup_wallet.py     # fresh burner — fund from Phantom via send
# set LIVE_TRADING=true in .env
python3 run.py
```

**Kill switch:** `touch KILL` in the project folder stops new entries.

## Offline tests

```bash
pytest -q
```

Cloud CI cannot reach crypto APIs — `verify_apis.py` is the live-network check.

## Disclaimer

Not financial advice. Assume the $100 is gone; anything left is a bonus.
