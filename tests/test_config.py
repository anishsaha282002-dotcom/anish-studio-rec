"""Tests for configuration."""

from pathlib import Path

import json
import tempfile

from config import Config, load_config
from solders.keypair import Keypair
from tests.conftest import ROOT, make_config


def test_live_trading_enabled_requires_wallet():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        cfg = make_config(root, live_trading=True)
        assert cfg.live_trading is True
        assert cfg.live_trading_enabled is False

        kp = Keypair()
        kp_path = root / "burner.json"
        kp_path.write_text(json.dumps(list(bytes(kp))))
        cfg2 = make_config(root, live_trading=True, wallet_keypair_path=kp_path)
        assert cfg2.live_trading_enabled is True


def test_live_trading_disabled_by_default():
    cfg = load_config(ROOT)
    assert cfg.live_trading_enabled is False
