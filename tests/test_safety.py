"""Tests for safety filters."""

from config import load_config
from pathlib import Path
from models import RejectReason
from safety.filters import check_liquidity_and_age
from tests.fixtures import GOOD_MOMENTUM, LOW_LIQUIDITY, FRESH_LAUNCH, BAD_LIQ_MCAP

ROOT = Path(__file__).resolve().parent.parent


def test_liquidity_gate():
    cfg = load_config(ROOT)
    assert check_liquidity_and_age(cfg, GOOD_MOMENTUM).passed is True
    r = check_liquidity_and_age(cfg, LOW_LIQUIDITY)
    assert r.passed is False
    assert r.reason == RejectReason.INSUFFICIENT_LIQUIDITY


def test_age_gate():
    cfg = load_config(ROOT)
    r = check_liquidity_and_age(cfg, FRESH_LAUNCH)
    assert r.passed is False
    assert r.reason == RejectReason.TOKEN_TOO_YOUNG


def test_liq_mcap_floor():
    cfg = load_config(ROOT)
    r = check_liquidity_and_age(cfg, BAD_LIQ_MCAP)
    assert r.passed is False
    assert r.reason == RejectReason.LIQ_TO_MCAP_FLOOR
