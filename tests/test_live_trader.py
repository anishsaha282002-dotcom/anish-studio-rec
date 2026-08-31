"""Tests for LiveTrader — mocked Jupiter and RPC."""

import json
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

from solders.keypair import Keypair

from tests.conftest import make_config
from trading.live import LiveTrader


def _keypair_file(tmp: Path) -> Path:
    kp = Keypair()
    path = tmp / "burner.json"
    path.write_text(json.dumps(list(bytes(kp))))
    return path


def test_live_buy_fails_without_quote():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        kp = _keypair_file(root)
        cfg = make_config(root, wallet_keypair_path=kp, helius_rpc_url="http://rpc")

        with patch("trading.live.get_quote", return_value=None):
            trader = LiveTrader(cfg)
            result = trader.buy_token("TokenMint", 12.0)
            assert result.success is False
            assert result.error == "no quote"


def test_live_swap_success_path():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        kp = _keypair_file(root)
        cfg = make_config(root, wallet_keypair_path=kp, helius_rpc_url="http://rpc")
        trader = LiveTrader(cfg)

        with patch("trading.live.get_quote", return_value={"outAmount": "1000"}):
            with patch("trading.live.build_swap_transaction", return_value="c2lnbg=="):
                with patch.object(trader, "_sign_transaction", return_value=MagicMock()):
                    with patch.object(trader, "_simulate", return_value=(True, None)):
                        with patch.object(trader, "_send", return_value="sig123"):
                            result = trader.swap("A", "B", 1000)
        assert result.success is True
        assert result.signature == "sig123"


def test_live_simulation_failure():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        kp = _keypair_file(root)
        cfg = make_config(root, wallet_keypair_path=kp, helius_rpc_url="http://rpc")
        trader = LiveTrader(cfg)

        with patch("trading.live.get_quote", return_value={"outAmount": "100"}):
            with patch("trading.live.build_swap_transaction", return_value="c2lnbg=="):
                with patch.object(trader, "_sign_transaction", return_value=MagicMock()):
                    with patch.object(trader, "_simulate", return_value=(False, "slippage")):
                        result = trader.swap("A", "B", 1000)
                        assert result.success is False
                        assert "simulation failed" in (result.error or "")
