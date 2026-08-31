"""Composite safety gate — all checks fail closed."""

from __future__ import annotations

from config import Config
from models import PairSnapshot, RejectReason, SafetyResult
from safety.chain_checks import check_mint_authorities, check_top10_concentration
from safety.jupiter import check_exit_route
from safety.rugcheck import check_rugcheck
from signals.onchain import token_age_hours

MIN_LIQ_TO_MCAP_RATIO = 0.05


def check_liquidity_and_age(cfg: Config, pair: PairSnapshot) -> SafetyResult:
    if pair.liquidity_usd < cfg.min_liquidity_usd:
        return SafetyResult(
            False,
            RejectReason.INSUFFICIENT_LIQUIDITY,
            {"liquidity_usd": pair.liquidity_usd},
        )

    age = token_age_hours(pair)
    if age is None:
        return SafetyResult(False, RejectReason.TOKEN_TOO_YOUNG, {"age_hours": None})
    if age < cfg.min_token_age_hours:
        return SafetyResult(
            False,
            RejectReason.TOKEN_TOO_YOUNG,
            {"age_hours": round(age, 2)},
        )

    if pair.market_cap_usd > 0:
        ratio = pair.liquidity_usd / pair.market_cap_usd
        if ratio < MIN_LIQ_TO_MCAP_RATIO:
            return SafetyResult(
                False,
                RejectReason.LIQ_TO_MCAP_FLOOR,
                {"ratio": round(ratio, 4)},
            )

    return SafetyResult(True, details={"age_hours": round(age, 2)})


def run_all_safety_checks(
    cfg: Config,
    pair: PairSnapshot,
    *,
    live_mode: bool,
    skip_rpc: bool = False,
) -> SafetyResult:
    """Run every safety gate. First failure wins."""
    checks = [
        check_liquidity_and_age(cfg, pair),
    ]

    if not skip_rpc:
        checks.extend([
            check_mint_authorities(cfg, pair.mint),
            check_top10_concentration(cfg, pair.mint, cfg.max_top10_holder_pct),
            check_exit_route(cfg, pair.mint),
            check_rugcheck(cfg, pair.mint, live_mode=live_mode),
        ])

    for result in checks:
        if not result.passed:
            return result
    return SafetyResult(True)
