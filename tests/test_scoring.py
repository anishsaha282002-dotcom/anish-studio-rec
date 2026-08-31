"""Tests for social scoring — bonus only, never penalty."""

from config import SOCIAL_BONUS_MAX, load_config
from pathlib import Path
from signals.social import compute_social_bonus
from scoring import score_token, assert_social_is_bonus_only
from tests.fixtures import GOOD_MOMENTUM, FLAT_TOKEN
from models import RejectReason, SafetyResult


ROOT = Path(__file__).resolve().parent.parent


def test_zero_mentions_no_penalty():
    cfg = load_config(ROOT)
    zero = compute_social_bonus("mint", mention_count=0, telegram_mentioned=False)
    assert zero.bonus_points == 0.0

    ev_zero = score_token(cfg, GOOD_MOMENTUM, mention_count=0, skip_rpc=True)
    ev_max = score_token(
        cfg,
        GOOD_MOMENTUM,
        mention_count=10,
        telegram_mentioned=True,
        skip_rpc=True,
    )

    assert ev_zero.social_bonus == 0.0
    assert ev_max.social_bonus == SOCIAL_BONUS_MAX
    assert ev_max.total_score - ev_zero.total_score == SOCIAL_BONUS_MAX
    assert ev_zero.base_score == ev_max.base_score


def test_social_bonus_capped():
    social = compute_social_bonus("mint", mention_count=100, telegram_mentioned=True)
    assert social.bonus_points <= SOCIAL_BONUS_MAX


def test_assert_social_is_bonus_only_helper():
    assert assert_social_is_bonus_only(50.0, 0.0) == 50.0
    assert assert_social_is_bonus_only(50.0, 20.0) == 70.0


def test_max_social_cannot_rescue_failing_token():
    """Maxed social score must not approve a token that fails safety gates."""
    cfg = load_config(ROOT)
    failing_safety = SafetyResult(False, RejectReason.INSUFFICIENT_LIQUIDITY)

    ev = score_token(
        cfg,
        FLAT_TOKEN,
        mention_count=100,
        telegram_mentioned=True,
        skip_rpc=True,
        safety_override=failing_safety,
    )

    assert ev.social_bonus == SOCIAL_BONUS_MAX
    assert ev.approved is False
    assert ev.reject_reason == RejectReason.INSUFFICIENT_LIQUIDITY
