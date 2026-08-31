"""Tests for configuration."""

from config import Config, load_config
from pathlib import Path


def test_live_trading_enabled_property():
    cfg = Config(
        helius_rpc_url="http://localhost",
        rugcheck_api_key="",
        jupiter_api_key="",
        telegram_bot_token="",
        telegram_channel_ids=[],
        live_trading=True,
        wallet_keypair_path=Path("burner-keypair.json"),
        min_liquidity_usd=150_000,
        min_token_age_hours=24,
        max_top10_holder_pct=30,
        min_score_to_buy=60,
        position_size_usd=12,
        poll_interval_sec=60,
        project_root=Path("."),
    )
    assert cfg.live_trading_enabled is True
    assert cfg.live_trading_enabled == cfg.live_trading


def test_live_trading_disabled_by_default():
    cfg = load_config(Path(__file__).resolve().parent.parent)
    assert cfg.live_trading_enabled is False
