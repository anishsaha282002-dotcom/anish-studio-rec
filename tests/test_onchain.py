"""Tests for on-chain momentum signals."""

from signals.onchain import compute_momentum, token_age_hours
from tests.fixtures import GOOD_MOMENTUM, FLAT_TOKEN, FRESH_LAUNCH


def test_momentum_triggers_on_good_candidate():
    sig = compute_momentum(GOOD_MOMENTUM)
    assert sig.triggered is True
    assert sig.momentum_score >= 50


def test_flat_token_no_trigger():
    sig = compute_momentum(FLAT_TOKEN)
    assert sig.triggered is False


def test_fresh_launch_age():
    age = token_age_hours(FRESH_LAUNCH)
    assert age is not None
    assert age < 24
