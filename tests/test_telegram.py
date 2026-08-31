"""Tests for Telegram ingest — input only, never trigger."""

from signals.telegram import TelegramWatchlist


def test_telegram_ingest_mints():
    watch = TelegramWatchlist()
    text = "Check this call: JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN going parabolic"
    found = watch.ingest_message(text)
    assert "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" in found
    assert watch.is_mentioned("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN")


def test_telegram_never_triggers_without_onchain():
    """Telegram alone does not satisfy on-chain trigger requirement."""
    from config import load_config
    from pathlib import Path
    from engine import Engine
    from tests.fixtures import FLAT_TOKEN

    cfg = load_config(Path(__file__).resolve().parent.parent)
    engine = Engine(cfg)
    engine.ingest_telegram(f"Call: {FLAT_TOKEN.mint}")
    ev = engine.evaluate_candidate(FLAT_TOKEN, skip_rpc=True)
    assert ev.social.telegram_mentioned is True
    assert ev.onchain.triggered is False
    assert ev.approved is False
