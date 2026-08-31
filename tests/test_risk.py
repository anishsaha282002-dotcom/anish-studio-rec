"""Tests for risk caps."""

import tempfile
from pathlib import Path

from models import RejectReason
from tests.conftest import make_config
from tests.fixtures import GOOD_MOMENTUM
from trading.paper import PaperLedger
from trading.risk import RiskManager


def test_max_concurrent_positions():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        cfg = make_config(root, max_concurrent_positions=2)
        ledger = PaperLedger(root / "ledger.json")
        ledger.open_position("a", "A", 1.0, 12, 100_000)
        ledger.open_position("b", "B", 1.0, 12, 100_000)
        risk = RiskManager(cfg, ledger)
        ok, reason = risk.can_enter()
        assert ok is False
        assert reason == RejectReason.RISK_MAX_POSITIONS


def test_max_trades_per_day():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        cfg = make_config(root, max_trades_per_day=2)
        ledger = PaperLedger(root / "ledger.json")
        risk = RiskManager(cfg, ledger)
        risk.record_entry()
        risk.record_entry()
        ok, reason = risk.can_enter()
        assert ok is False
        assert reason == RejectReason.RISK_TRADES_PER_DAY


def test_max_total_loss():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        cfg = make_config(root, max_total_loss_usd=5.0)
        ledger = PaperLedger(root / "ledger.json", starting_cash=100)
        ledger.open_position("a", "A", 1.0, 12, 100_000)
        ledger.close_position("a", 0.5, "stop_loss")
        ledger.positions[0].pnl_usd = -6.0
        risk = RiskManager(cfg, ledger)
        ok, reason = risk.can_enter()
        assert ok is False
        assert reason == RejectReason.RISK_TOTAL_LOSS
