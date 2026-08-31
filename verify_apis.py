#!/usr/bin/env python3
"""
Verify every external API is reachable from YOUR machine.
Run this on your Mac after `pip install -r requirements.txt` and configuring .env.

This script is not run in CI — cloud agents cannot reach crypto APIs.
"""

from __future__ import annotations

import sys
from typing import Callable

from config import load_config, SOL_MINT, USDC_MINT
from http_client import get_client

# Well-known liquid token for smoke tests
TEST_MINT = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"  # JUP


def check(name: str, fn: Callable[[], tuple[bool, str]]) -> bool:
    try:
        ok, detail = fn()
    except Exception as exc:
        ok, detail = False, str(exc)
    status = "OK" if ok else "FAIL"
    print(f"  [{status}] {name}: {detail}")
    return ok


def verify_helius(cfg) -> tuple[bool, str]:
    if not cfg.helius_rpc_url or "YOUR_KEY" in cfg.helius_rpc_url:
        return False, "HELIUS_RPC_URL not configured"
    payload = {"jsonrpc": "2.0", "id": 1, "method": "getHealth", "params": []}
    with get_client() as client:
        resp = client.post(cfg.helius_rpc_url, json=payload)
        resp.raise_for_status()
        body = resp.json()
    if "result" in body or "error" not in body:
        return True, "RPC reachable"
    return False, str(body.get("error"))


def verify_dexscreener(_cfg) -> tuple[bool, str]:
    url = f"https://api.dexscreener.com/token-pairs/v1/solana/{TEST_MINT}"
    with get_client() as client:
        resp = client.get(url)
        resp.raise_for_status()
        data = resp.json()
    if isinstance(data, list) and len(data) > 0:
        liq = (data[0].get("liquidity") or {}).get("usd")
        return True, f"{len(data)} pairs, top liq=${liq}"
    return False, "empty response"


def verify_jupiter(cfg) -> tuple[bool, str]:
    headers = {}
    if cfg.jupiter_api_key:
        headers["x-api-key"] = cfg.jupiter_api_key

    params = {
        "inputMint": SOL_MINT,
        "outputMint": USDC_MINT,
        "amount": "100000000",
        "slippageBps": "50",
    }

    urls = [
        "https://lite-api.jup.ag/swap/v1/quote",
        "https://api.jup.ag/swap/v2/build",
    ]
    last_err = ""
    for url in urls:
        try:
            with get_client() as client:
                resp = client.get(url, params=params, headers=headers)
                if resp.status_code == 200:
                    out = resp.json().get("outAmount") or resp.json().get("out_amount")
                    return True, f"{url.split('/')[2]} outAmount={out}"
                last_err = f"{resp.status_code} from {url}"
        except Exception as exc:
            last_err = str(exc)
    return False, last_err or "no Jupiter endpoint responded"


def verify_rugcheck(cfg) -> tuple[bool, str]:
    url = f"https://api.rugcheck.xyz/v1/tokens/{TEST_MINT}/report/summary"
    headers = {}
    if cfg.rugcheck_api_key:
        headers["X-API-KEY"] = cfg.rugcheck_api_key
    with get_client() as client:
        resp = client.get(url, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            score = data.get("score")
            level = data.get("riskLevel") or data.get("risk_level")
            return True, f"score={score} risk={level}"
        if resp.status_code in (401, 403):
            return True, f"reachable but auth required ({resp.status_code}) — optional key"
        if resp.status_code == 404:
            return False, "404 — endpoint shape may have changed"
        return False, f"HTTP {resp.status_code}"


def main() -> int:
    cfg = load_config()
    print("Solana bot API verification\n")

    results = [
        check("Helius RPC", lambda: verify_helius(cfg)),
        check("DexScreener", lambda: verify_dexscreener(cfg)),
        check("Jupiter quote", lambda: verify_jupiter(cfg)),
        check("RugCheck", lambda: verify_rugcheck(cfg)),
    ]

    print()
    if all(results):
        print("All checks passed — APIs reachable from this machine.")
        return 0
    print("Some checks failed — fix .env or verify endpoint docs before live trading.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
