"""Exit rules — stop loss, tranched take-profit, trailing, time, LP-pull."""

from __future__ import annotations

import time

from config import Config
from models import ExitDecision, ExitReason, PaperPosition, PairSnapshot


def _pct_change(current: float, reference: float) -> float:
    if reference <= 0:
        return 0.0
    return ((current - reference) / reference) * 100.0


def update_high_water_mark(position: PaperPosition, current_price: float) -> None:
    if current_price > position.high_water_mark_usd:
        position.high_water_mark_usd = current_price


def evaluate_exit(
    cfg: Config,
    position: PaperPosition,
    current_price: float,
    current_pair: PairSnapshot | None = None,
    *,
    now_ms: int | None = None,
) -> ExitDecision:
    """Return first matching exit rule. Fraction is of original position size."""
    if position.remaining_fraction <= 0.001:
        return ExitDecision(False)

    entry = position.entry_price_usd
    if entry <= 0 or current_price <= 0:
        return ExitDecision(False)

    update_high_water_mark(position, current_price)
    now = now_ms if now_ms is not None else int(time.time() * 1000)

    # LP-pull emergency: liquidity collapsed vs entry
    if current_pair and position.entry_liquidity_usd > 0:
        drop_pct = (
            (position.entry_liquidity_usd - current_pair.liquidity_usd)
            / position.entry_liquidity_usd
            * 100.0
        )
        if drop_pct >= cfg.lp_pull_drop_pct:
            return ExitDecision(True, ExitReason.LP_PULL, position.remaining_fraction)

    change = _pct_change(current_price, entry)

    # Stop loss — full exit of remainder
    if change <= -cfg.stop_loss_pct:
        return ExitDecision(True, ExitReason.STOP_LOSS, position.remaining_fraction)

    # Tranched take-profit 1
    if not position.tp1_taken and change >= cfg.take_profit_1_pct:
        return ExitDecision(True, ExitReason.TAKE_PROFIT_1, cfg.take_profit_1_fraction)

    # Tranched take-profit 2 (fraction of original, capped to remaining)
    if position.tp1_taken and not position.tp2_taken and change >= cfg.take_profit_2_pct:
        frac = min(cfg.take_profit_2_fraction, position.remaining_fraction)
        return ExitDecision(True, ExitReason.TAKE_PROFIT_2, frac)

    # Trailing stop after activation
    activation_price = entry * (1 + cfg.trailing_activation_pct / 100.0)
    hwm = position.high_water_mark_usd or entry
    if hwm >= activation_price:
        trail_floor = hwm * (1 - cfg.trailing_stop_pct / 100.0)
        if current_price <= trail_floor:
            return ExitDecision(True, ExitReason.TRAILING_STOP, position.remaining_fraction)

    # Time stop
    age_hours = (now - position.entry_time_ms) / 3_600_000
    if age_hours >= cfg.time_stop_hours:
        return ExitDecision(True, ExitReason.TIME_STOP, position.remaining_fraction)

    return ExitDecision(False)
