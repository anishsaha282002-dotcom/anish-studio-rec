#!/usr/bin/env python3
"""Main entry point — paper trading by default."""

from __future__ import annotations

import logging
import sys

from config import load_config
from engine import Engine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


def main() -> int:
    cfg = load_config()

    if not cfg.helius_rpc_url or "YOUR_KEY" in cfg.helius_rpc_url:
        print("Set HELIUS_RPC_URL in .env before running.", file=sys.stderr)
        return 1

    if cfg.live_trading_enabled:
        if not cfg.wallet_keypair_path.exists():
            print(
                "LIVE_TRADING=true but no burner wallet. Run: python3 setup_wallet.py",
                file=sys.stderr,
            )
            return 1
        print("WARNING: Live trading enabled — real funds at risk.")
    else:
        print("Paper mode — no real trades. Set LIVE_TRADING=true only after 2 weeks paper.")

    if cfg.kill_switch_active():
        print("Kill switch (KILL file) is active — remove it to run.")
        return 1

    engine = Engine(cfg)
    print(f"Engine started. Poll interval: {cfg.poll_interval_sec}s")
    print("Press Ctrl+C to stop.")

    try:
        while True:
            if engine.check_kill_switch():
                print("Kill switch detected — stopping.")
                break
            # Candidate discovery via DexScreener trending / watchlist happens in production loop.
            # Offline/cloud runs validate config and idle safely.
            engine.sleep_interval()
    except KeyboardInterrupt:
        print("\nStopped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
