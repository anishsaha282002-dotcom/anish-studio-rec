"""Tests for paper ledger."""

import tempfile
from pathlib import Path

from trading.paper import PaperLedger


def test_paper_ledger_round_trip():
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "ledger.json"
        ledger = PaperLedger(path)
        assert ledger.open_position("mint1", "TOK", 0.001, 12.0) is True
        assert ledger.cash_usd == 88.0
        pos = ledger.close_position("mint1", 0.0012)
        assert pos is not None
        assert pos.pnl_usd is not None
