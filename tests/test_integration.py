"""Integration scoring tests."""

from config import load_config
from pathlib import Path
from scoring import score_token
from tests.fixtures import GOOD_MOMENTUM, FLAT_TOKEN, LOW_LIQUIDITY

ROOT = Path(__file__).resolve().parent.parent


def test_good_momentum_approves_offline():
    cfg = load_config(ROOT)
    ev = score_token(cfg, GOOD_MOMENTUM, skip_rpc=True)
    assert ev.onchain.triggered is True
    assert ev.total_score >= cfg.min_score_to_buy
    assert ev.approved is True


def test_flat_token_rejected():
    cfg = load_config(ROOT)
    ev = score_token(cfg, FLAT_TOKEN, skip_rpc=True)
    assert ev.approved is False


def test_low_liquidity_rejected_regardless_of_momentum():
    cfg = load_config(ROOT)
    ev = score_token(cfg, LOW_LIQUIDITY, mention_count=50, telegram_mentioned=True, skip_rpc=True)
    assert ev.approved is False
