"""Tests for trading engine."""

import tempfile
from pathlib import Path

from config import Config
from engine import Engine
from tests.fixtures import GOOD_MOMENTUM


def _cfg(root: Path) -> Config:
    return Config(
        helius_rpc_url="http://localhost",
        rugcheck_api_key="",
        jupiter_api_key="",
        telegram_bot_token="",
        telegram_channel_ids=[],
        live_trading=False,
        wallet_keypair_path=root / "burner-keypair.json",
        min_liquidity_usd=150_000,
        min_token_age_hours=24,
        max_top10_holder_pct=30,
        min_score_to_buy=60,
        position_size_usd=12,
        poll_interval_sec=60,
        project_root=root,
    )


def test_engine_respects_kill_switch():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "KILL").touch()
        engine = Engine(_cfg(root))
        assert engine.check_kill_switch() is True
        ev = engine.evaluate_candidate(GOOD_MOMENTUM, skip_rpc=True)
        assert engine.maybe_enter(ev) is False


def test_engine_uses_live_trading_enabled():
    import json
    from solders.keypair import Keypair

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        kp_path = root / "burner-keypair.json"
        kp = Keypair()
        kp_path.write_text(json.dumps(list(bytes(kp))))

        cfg = _cfg(root)
        cfg = Config(
            helius_rpc_url=cfg.helius_rpc_url,
            rugcheck_api_key=cfg.rugcheck_api_key,
            jupiter_api_key=cfg.jupiter_api_key,
            telegram_bot_token=cfg.telegram_bot_token,
            telegram_channel_ids=cfg.telegram_channel_ids,
            live_trading=True,
            wallet_keypair_path=kp_path,
            min_liquidity_usd=cfg.min_liquidity_usd,
            min_token_age_hours=cfg.min_token_age_hours,
            max_top10_holder_pct=cfg.max_top10_holder_pct,
            min_score_to_buy=cfg.min_score_to_buy,
            position_size_usd=cfg.position_size_usd,
            poll_interval_sec=cfg.poll_interval_sec,
            project_root=root,
        )
        assert cfg.live_trading_enabled is True
        engine = Engine(cfg)
        assert engine.cfg.live_trading_enabled is True
        assert engine.live_trader is not None


def test_paper_entry_on_approved():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        engine = Engine(_cfg(root))
        ev = engine.evaluate_candidate(GOOD_MOMENTUM, skip_rpc=True)
        if ev.approved:
            assert engine.maybe_enter(ev) is True
            assert len(engine.ledger.open_positions) == 1
