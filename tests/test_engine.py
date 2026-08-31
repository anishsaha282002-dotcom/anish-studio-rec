"""Tests for engine exit wiring and live fallback."""

import json
import tempfile
from pathlib import Path
from unittest.mock import patch

from solders.keypair import Keypair

from models import ExitReason
from tests.conftest import make_config
from tests.fixtures import GOOD_MOMENTUM, pair_at_price
from engine import Engine


def test_engine_manage_exits_stop_loss():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        cfg = make_config(root, stop_loss_pct=8.0)
        engine = Engine(cfg)
        engine.ledger.open_position("m1", "T", 1.0, 12, 200_000)
        crash = pair_at_price(GOOD_MOMENTUM, 0.90, mint="m1", symbol="T")
        closed = engine.manage_exits({"m1": crash})
        assert len(closed) == 1
        assert closed[0][1] == ExitReason.STOP_LOSS
        assert engine.ledger.total_realized_pnl() != 0


def test_live_requested_without_wallet_falls_back_to_paper():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        cfg = make_config(root, live_trading=True)
        assert cfg.live_trading_enabled is False
        engine = Engine(cfg)
        assert engine.live_mode is False
        assert engine.live_trader is None


def test_live_mode_records_paper_ledger_on_success():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        kp = Keypair()
        kp_path = root / "burner.json"
        kp_path.write_text(json.dumps(list(bytes(kp))))
        cfg = make_config(root, live_trading=True, wallet_keypair_path=kp_path)

        with patch("trading.live.LiveTrader.buy_token") as mock_buy:
            from models import TradeResult

            mock_buy.return_value = TradeResult(True, signature="abc")
            engine = Engine(cfg)
            assert engine.live_mode is True
            ev = engine.evaluate_candidate(GOOD_MOMENTUM, skip_rpc=True)
            ok = engine.maybe_enter(ev)
            assert ok is True
            assert len(engine.ledger.open_positions) == 1


def test_live_failure_does_not_open_ledger():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        kp = Keypair()
        kp_path = root / "burner.json"
        kp_path.write_text(json.dumps(list(bytes(kp))))
        cfg = make_config(root, live_trading=True, wallet_keypair_path=kp_path)

        with patch("trading.live.LiveTrader.buy_token") as mock_buy:
            from models import TradeResult

            mock_buy.return_value = TradeResult(False, error="simulation failed")
            engine = Engine(cfg)
            ev = engine.evaluate_candidate(GOOD_MOMENTUM, skip_rpc=True)
            ok = engine.maybe_enter(ev)
            assert ok is False
            assert len(engine.ledger.open_positions) == 0


def test_no_entry_without_price():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        engine = Engine(make_config(root))
        no_price = pair_at_price(GOOD_MOMENTUM, 0.0)
        from models import OnChainSignal, SafetyResult, SocialSignal, TokenEvaluation
        from signals.onchain import compute_momentum

        ev = TokenEvaluation(
            pair=no_price,
            onchain=compute_momentum(no_price),
            social=SocialSignal(mint=no_price.mint, mention_count=0, telegram_mentioned=False),
            safety=SafetyResult(True),
            base_score=80,
            social_bonus=0,
            total_score=80,
            approved=True,
        )
        assert engine.maybe_enter(ev) is False
