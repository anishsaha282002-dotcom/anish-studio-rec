"""Tests for exit rules."""

import time

from models import ExitReason, PaperPosition
from tests.conftest import make_config
from tests.fixtures import GOOD_MOMENTUM, pair_at_price
from trading.exits import evaluate_exit


def _position(entry_price: float = 0.002, entry_liq: float = 250_000) -> PaperPosition:
    return PaperPosition(
        mint="m",
        symbol="T",
        entry_price_usd=entry_price,
        size_usd=12.0,
        entry_time_ms=int(time.time() * 1000) - 3_600_000,
        entry_liquidity_usd=entry_liq,
        high_water_mark_usd=entry_price,
    )


def test_stop_loss_triggers():
    cfg = make_config()
    pos = _position()
    price = 0.002 * (1 - cfg.stop_loss_pct / 100 - 0.01)
    d = evaluate_exit(cfg, pos, price)
    assert d.should_exit is True
    assert d.reason == ExitReason.STOP_LOSS


def test_take_profit_1_partial():
    cfg = make_config()
    pos = _position()
    price = 0.002 * (1 + cfg.take_profit_1_pct / 100 + 0.01)
    d = evaluate_exit(cfg, pos, price)
    assert d.should_exit is True
    assert d.reason == ExitReason.TAKE_PROFIT_1
    assert d.fraction == cfg.take_profit_1_fraction


def test_take_profit_2_after_tp1():
    cfg = make_config()
    pos = _position()
    pos.tp1_taken = True
    pos.remaining_fraction = 0.6
    price = 0.002 * (1 + cfg.take_profit_2_pct / 100 + 0.01)
    d = evaluate_exit(cfg, pos, price)
    assert d.should_exit is True
    assert d.reason == ExitReason.TAKE_PROFIT_2


def test_trailing_stop_after_activation():
    cfg = make_config()
    pos = _position()
    peak = 0.002 * 1.20
    pos.high_water_mark_usd = peak
    price = peak * (1 - cfg.trailing_stop_pct / 100 - 0.01)
    d = evaluate_exit(cfg, pos, price)
    assert d.should_exit is True
    assert d.reason == ExitReason.TRAILING_STOP


def test_time_stop():
    cfg = make_config(time_stop_hours=1.0)
    pos = _position()
    old = int(time.time() * 1000) - int(2 * 3_600_000)
    pos.entry_time_ms = old
    d = evaluate_exit(cfg, pos, 0.002, now_ms=int(time.time() * 1000))
    assert d.should_exit is True
    assert d.reason == ExitReason.TIME_STOP


def test_lp_pull_emergency():
    cfg = make_config(lp_pull_drop_pct=30.0)
    pos = _position(entry_liq=250_000)
    pair = pair_at_price(GOOD_MOMENTUM, 0.002, liquidity_usd=150_000)
    d = evaluate_exit(cfg, pos, 0.002, pair)
    assert d.should_exit is True
    assert d.reason == ExitReason.LP_PULL


def test_no_exit_when_flat():
    cfg = make_config()
    pos = _position()
    d = evaluate_exit(cfg, pos, 0.002)
    assert d.should_exit is False
