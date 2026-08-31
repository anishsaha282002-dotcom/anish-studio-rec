"""On-chain momentum signals — the only source that can trigger a buy."""

from __future__ import annotations

import time

from models import OnChainSignal, PairSnapshot


def compute_momentum(pair: PairSnapshot) -> OnChainSignal:
    """Score momentum from volume and price action on an established pool."""
    volume_surge = pair.volume_h1 > 0 and pair.volume_h24 > 0 and (
        pair.volume_h1 * 24 > pair.volume_h24 * 2
    )
    price_momentum = pair.price_change_h1 > 3.0 or pair.price_change_h6 > 8.0

    score = 0.0
    if volume_surge:
        score += 35.0
    if price_momentum:
        score += 35.0
    if pair.price_change_h1 > 0 and pair.price_change_h6 > 0:
        score += 15.0
    if pair.liquidity_usd >= 300_000:
        score += 10.0
    elif pair.liquidity_usd >= 150_000:
        score += 5.0

    triggered = score >= 50.0 and (volume_surge or price_momentum)

    return OnChainSignal(
        mint=pair.mint,
        momentum_score=min(score, 80.0),
        volume_surge=volume_surge,
        price_momentum=price_momentum,
        triggered=triggered,
    )


def token_age_hours(pair: PairSnapshot) -> float | None:
    if pair.pair_created_at_ms is None:
        return None
    age_ms = time.time() * 1000 - pair.pair_created_at_ms
    return max(age_ms / 3_600_000, 0.0)
