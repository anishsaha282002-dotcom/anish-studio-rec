"""Token scoring — on-chain base score plus capped social bonus."""

from __future__ import annotations

from config import Config, SOCIAL_BONUS_MAX
from models import (
    OnChainSignal,
    PairSnapshot,
    RejectReason,
    SafetyResult,
    SocialSignal,
    TokenEvaluation,
)
from safety.filters import run_all_safety_checks
from signals.onchain import compute_momentum
from signals.social import compute_social_bonus


def score_token(
    cfg: Config,
    pair: PairSnapshot,
    *,
    mention_count: int = 0,
    telegram_mentioned: bool = False,
    onchain_trigger_required: bool = True,
    live_mode: bool = False,
    skip_rpc: bool = False,
    safety_override: SafetyResult | None = None,
) -> TokenEvaluation:
    onchain = compute_momentum(pair)
    social = compute_social_bonus(pair.mint, mention_count, telegram_mentioned)

    safety = safety_override or run_all_safety_checks(
        cfg, pair, live_mode=live_mode, skip_rpc=skip_rpc
    )

    base_score = onchain.momentum_score
    social_bonus = social.bonus_points  # 0..SOCIAL_BONUS_MAX, never negative
    total_score = base_score + social_bonus

    reject_reason: RejectReason | None = None
    approved = True

    if not safety.passed:
        approved = False
        reject_reason = safety.reason
    elif onchain_trigger_required and not onchain.triggered:
        approved = False
        reject_reason = RejectReason.SCORE_TOO_LOW
    elif total_score < cfg.min_score_to_buy:
        approved = False
        reject_reason = RejectReason.SCORE_TOO_LOW

    return TokenEvaluation(
        pair=pair,
        onchain=onchain,
        social=social,
        safety=safety,
        base_score=base_score,
        social_bonus=social_bonus,
        total_score=total_score,
        approved=approved,
        reject_reason=reject_reason,
    )


def assert_social_is_bonus_only(base: float, social: float) -> float:
    """Social never subtracts — zero mentions means zero bonus, not a penalty."""
    assert social >= 0
    assert social <= SOCIAL_BONUS_MAX
    return base + social
