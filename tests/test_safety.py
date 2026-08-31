"""Safety filter tests with mocked RPC responses."""

import base64
import struct
from unittest.mock import patch

from config import load_config
from models import RejectReason
from safety.chain_checks import check_mint_authorities, check_top10_concentration
from safety.filters import check_liquidity_and_age, run_all_safety_checks
from tests.conftest import ROOT
from tests.fixtures import GOOD_MOMENTUM, LOW_LIQUIDITY


def _mint_account_b64(mint_active: bool, freeze_active: bool) -> str:
    raw = bytearray(82)
    if mint_active:
        struct.pack_into("<I", raw, 0, 1)
    if freeze_active:
        struct.pack_into("<I", raw, 46, 1)
    return base64.b64encode(bytes(raw)).decode()


def test_mint_authority_rejected_via_rpc():
    cfg = load_config(ROOT)

    def fake_rpc(_cfg, method, params):
        if method == "getAccountInfo":
            return {"value": {"data": [_mint_account_b64(True, False), "base64"]}}
        raise AssertionError(method)

    with patch("safety.chain_checks._rpc_call", side_effect=fake_rpc):
        result = check_mint_authorities(cfg, "mint")
    assert result.passed is False
    assert result.reason == RejectReason.MINT_AUTHORITY_ACTIVE


def test_top10_concentration_rejected():
    cfg = load_config(ROOT)

    def fake_rpc(_cfg, method, params):
        if method == "getTokenLargestAccounts":
            return {"value": [{"uiAmount": "400"}, {"uiAmount": "300"}]}
        if method == "getTokenSupply":
            return {"value": {"uiAmount": "1000"}}
        raise AssertionError(method)

    with patch("safety.chain_checks._rpc_call", side_effect=fake_rpc):
        result = check_top10_concentration(cfg, "mint", 30)
    assert result.passed is False
    assert result.reason == RejectReason.TOP10_CONCENTRATION


def test_run_all_safety_checks_without_skip():
    cfg = load_config(ROOT)

    def fake_rpc(_cfg, method, params):
        if method == "getAccountInfo":
            return {"value": {"data": [_mint_account_b64(False, False), "base64"]}}
        if method == "getTokenLargestAccounts":
            return {"value": [{"uiAmount": "50"} for _ in range(10)]}
        if method == "getTokenSupply":
            return {"value": {"uiAmount": "10000"}}
        raise AssertionError(method)

    with patch("safety.chain_checks._rpc_call", side_effect=fake_rpc):
        with patch("safety.filters.check_exit_route") as mock_jup:
            from models import SafetyResult

            mock_jup.return_value = SafetyResult(True)
            with patch("safety.filters.check_rugcheck") as mock_rug:
                mock_rug.return_value = SafetyResult(True)
                ok = run_all_safety_checks(cfg, GOOD_MOMENTUM, live_mode=False, skip_rpc=False)
    assert ok.passed is True


def test_liquidity_gate_no_rpc_needed():
    cfg = load_config(ROOT)
    assert check_liquidity_and_age(cfg, LOW_LIQUIDITY).passed is False
