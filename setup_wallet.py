#!/usr/bin/env python3
"""Create a fresh burner wallet — never import your Phantom seed here."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from solders.keypair import Keypair

from config import load_config


def main() -> int:
    cfg = load_config()
    path = cfg.wallet_keypair_path

    if path.exists():
        print(f"Burner wallet already exists: {path}")
        print("Delete it first if you want a new one.")
        data = json.loads(path.read_text())
        kp = Keypair.from_bytes(bytes(data))
        print(f"Public key: {kp.pubkey()}")
        return 0

    kp = Keypair()
    path.write_text(json.dumps(list(bytes(kp))))
    print(f"Created burner wallet: {path}")
    print(f"Public key: {kp.pubkey()}")
    print()
    print("Fund this address with your $100 from Phantom (send, don't import seed).")
    print("Watch it in Phantom as a watched address — the bot signs with this keypair.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
