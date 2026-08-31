"""On-chain safety checks via RPC."""

from __future__ import annotations

import base64
import struct
from typing import Any

from config import Config
from http_client import get_client
from models import RejectReason, SafetyResult


def _rpc_call(cfg: Config, method: str, params: list[Any]) -> Any:
    payload = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
    with get_client() as client:
        resp = client.post(cfg.helius_rpc_url, json=payload)
        resp.raise_for_status()
        body = resp.json()
    if "error" in body:
        raise RuntimeError(body["error"])
    return body["result"]


def _parse_mint_account(data_b64: str) -> tuple[bool, bool]:
    """Return (mint_authority_active, freeze_authority_active). SPL mint layout."""
    raw = base64.b64decode(data_b64)
    if len(raw) < 82:
        raise ValueError("mint account too short")

    # COption<Pubkey>: u32 tag (0=None, 1=Some) + 32-byte pubkey
    mint_active = struct.unpack_from("<I", raw, 0)[0] == 1
    freeze_active = struct.unpack_from("<I", raw, 46)[0] == 1
    return mint_active, freeze_active


def check_mint_authorities(cfg: Config, mint: str) -> SafetyResult:
    try:
        result = _rpc_call(cfg, "getAccountInfo", [mint, {"encoding": "base64"}])
        value = result.get("value")
        if not value or not value.get("data"):
            return SafetyResult(False, RejectReason.SAFETY_UNKNOWN, {"error": "no mint account"})

        data_field = value["data"]
        data_b64 = data_field[0] if isinstance(data_field, list) else data_field
        mint_active, freeze_active = _parse_mint_account(data_b64)

        if mint_active:
            return SafetyResult(False, RejectReason.MINT_AUTHORITY_ACTIVE)
        if freeze_active:
            return SafetyResult(False, RejectReason.FREEZE_AUTHORITY_ACTIVE)
        return SafetyResult(True)
    except Exception as exc:
        return SafetyResult(False, RejectReason.SAFETY_UNKNOWN, {"error": str(exc)})


def check_top10_concentration(cfg: Config, mint: str, max_pct: float) -> SafetyResult:
    try:
        result = _rpc_call(
            cfg,
            "getTokenLargestAccounts",
            [mint, {"commitment": "confirmed"}],
        )
        accounts = result.get("value") or []
        if not accounts:
            return SafetyResult(False, RejectReason.SAFETY_UNKNOWN, {"error": "no holders"})

        supply_result = _rpc_call(cfg, "getTokenSupply", [mint])
        total = float(supply_result["value"]["uiAmount"] or 0)
        if total <= 0:
            return SafetyResult(False, RejectReason.SAFETY_UNKNOWN, {"error": "zero supply"})

        top10 = sum(float(a["uiAmount"] or 0) for a in accounts[:10])
        pct = (top10 / total) * 100.0
        if pct > max_pct:
            return SafetyResult(
                False,
                RejectReason.TOP10_CONCENTRATION,
                {"top10_pct": round(pct, 2)},
            )
        return SafetyResult(True, details={"top10_pct": round(pct, 2)})
    except Exception as exc:
        return SafetyResult(False, RejectReason.SAFETY_UNKNOWN, {"error": str(exc)})
