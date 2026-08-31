"""Live trading via burner wallet keypair — never Phantom automation."""

from __future__ import annotations

import json
from pathlib import Path

from solders.keypair import Keypair


def load_burner_keypair(path: Path) -> Keypair:
    if not path.exists():
        raise FileNotFoundError(
            f"Burner keypair not found at {path}. Run: python3 setup_wallet.py"
        )
    data = json.loads(path.read_text())
    secret = bytes(data if isinstance(data, list) else data.get("secret_key", data))
    return Keypair.from_bytes(secret)


def pubkey_str(keypair: Keypair) -> str:
    return str(keypair.pubkey())


class LiveTrader:
    """Placeholder for live execution — quotes validated, signing via burner only."""

    def __init__(self, keypair_path: Path) -> None:
        self.keypair = load_burner_keypair(keypair_path)
        self.pubkey = pubkey_str(self.keypair)

    def ready(self) -> bool:
        return self.keypair is not None
