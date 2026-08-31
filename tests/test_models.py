"""Additional config and model tests."""

from config import SOCIAL_BONUS_MAX, SOL_MINT, USDC_MINT
from models import RejectReason, PaperPosition


def test_mint_constants():
    assert len(SOL_MINT) >= 32
    assert len(USDC_MINT) >= 32


def test_reject_reasons_are_strings():
    assert RejectReason.KILL_SWITCH.value == "kill_switch"
    assert RejectReason.TELEGRAM_ONLY.value == "telegram_only"


def test_paper_position_defaults():
    pos = PaperPosition(
        mint="m",
        symbol="S",
        entry_price_usd=1.0,
        size_usd=12.0,
        entry_time_ms=0,
    )
    assert pos.exit_price_usd is None
    assert pos.pnl_usd is None
