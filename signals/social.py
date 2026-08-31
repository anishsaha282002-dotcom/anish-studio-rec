"""Social signal — bonus only, never a penalty for zero mentions."""

from __future__ import annotations

from config import SOCIAL_BONUS_MAX
from models import SocialSignal


def compute_social_bonus(
    mint: str,
    mention_count: int = 0,
    telegram_mentioned: bool = False,
) -> SocialSignal:
    """
    Social mentions add up to SOCIAL_BONUS_MAX points.
    Zero mentions contribute 0 — they never reduce the score.
    """
    bonus = 0.0
    if mention_count > 0:
        bonus += min(mention_count * 3.0, 12.0)
    if telegram_mentioned:
        bonus += 8.0
    bonus = min(bonus, float(SOCIAL_BONUS_MAX))

    return SocialSignal(
        mint=mint,
        mention_count=mention_count,
        telegram_mentioned=telegram_mentioned,
        bonus_points=bonus,
    )
