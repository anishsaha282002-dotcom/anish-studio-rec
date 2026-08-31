"""Tests for paper ledger partial exits and P&L."""

import tempfile
from pathlib import Path

from models import ExitReason
from trading.paper import PaperLedger


def test_partial_exit_take_profit():
    with tempfile.TemporaryDirectory() as tmp:
        ledger = PaperLedger(Path(tmp) / "ledger.json")
        ledger.open_position("m", "T", 1.0, 12.0, 200_000)
        pos = ledger.reduce_position("m", 1.15, 0.4, ExitReason.TAKE_PROFIT_1)
        assert pos is not None
        assert pos.tp1_taken is True
        assert pos.remaining_fraction == 0.6
        assert pos.realized_pnl_usd > 0
        assert pos.pnl_usd is None


def test_full_close_sets_pnl():
    with tempfile.TemporaryDirectory() as tmp:
        ledger = PaperLedger(Path(tmp) / "ledger.json")
        ledger.open_position("m", "T", 1.0, 12.0, 200_000)
        pos = ledger.close_position("m", 0.92, ExitReason.STOP_LOSS)
        assert pos is not None
        assert pos.pnl_usd is not None
        assert pos.pnl_usd < 0
        assert len(ledger.open_positions) == 0
