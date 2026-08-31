"""Jupiter API client — quotes and swap transaction building."""

from __future__ import annotations

from typing import Any

from config import SOL_MINT
from http_client import get_client

JUPITER_QUOTE_URL = "https://lite-api.jup.ag/swap/v1/quote"
JUPITER_SWAP_URL = "https://lite-api.jup.ag/swap/v1/swap"
JUPITER_BUILD_URL = "https://api.jup.ag/swap/v2/build"


def jupiter_headers(api_key: str) -> dict[str, str]:
    if api_key:
        return {"x-api-key": api_key}
    return {}


def get_quote(
    input_mint: str,
    output_mint: str,
    amount: int,
    *,
    slippage_bps: int = 100,
    api_key: str = "",
) -> dict[str, Any] | None:
    params = {
        "inputMint": input_mint,
        "outputMint": output_mint,
        "amount": str(amount),
        "slippageBps": str(slippage_bps),
    }
    headers = jupiter_headers(api_key)

    with get_client() as client:
        resp = client.get(JUPITER_QUOTE_URL, params=params, headers=headers)
        if resp.status_code == 200:
            return resp.json()

        if api_key:
            resp = client.get(
                JUPITER_BUILD_URL,
                params={**params, "taker": "11111111111111111111111111111111"},
                headers=headers,
            )
            if resp.status_code == 200:
                return resp.json()
    return None


def build_swap_transaction(
    quote: dict[str, Any],
    user_pubkey: str,
    *,
    api_key: str = "",
) -> str | None:
    """Return base64-encoded swap transaction."""
    payload = {
        "quoteResponse": quote,
        "userPublicKey": user_pubkey,
        "wrapAndUnwrapSol": True,
        "dynamicComputeUnitLimit": True,
    }
    headers = jupiter_headers(api_key)
    with get_client() as client:
        resp = client.post(JUPITER_SWAP_URL, json=payload, headers=headers)
        if resp.status_code != 200:
            return None
        data = resp.json()
        return data.get("swapTransaction")


def quote_has_route(quote: dict[str, Any] | None) -> bool:
    if not quote:
        return False
    out = quote.get("outAmount") or quote.get("out_amount")
    return bool(out and int(out) > 0)
