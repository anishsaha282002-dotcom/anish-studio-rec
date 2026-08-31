"""DexScreener client for pair data."""

from __future__ import annotations

from typing import Any

from http_client import get_client
from models import PairSnapshot

DEXSCREENER_BASE = "https://api.dexscreener.com"


def parse_pair(mint: str, raw: dict[str, Any]) -> PairSnapshot:
    liq = raw.get("liquidity") or {}
    volume = raw.get("volume") or {}
    price_change = raw.get("priceChange") or {}
    base = raw.get("baseToken") or {}

    return PairSnapshot(
        mint=mint,
        symbol=base.get("symbol", "?"),
        name=base.get("name", "?"),
        pair_address=raw.get("pairAddress", ""),
        liquidity_usd=float(liq.get("usd") or 0),
        market_cap_usd=float(raw.get("marketCap") or raw.get("fdv") or 0),
        volume_h1=float(volume.get("h1") or 0),
        volume_h24=float(volume.get("h24") or 0),
        price_change_h1=float(price_change.get("h1") or 0),
        price_change_h6=float(price_change.get("h6") or 0),
        pair_created_at_ms=raw.get("pairCreatedAt"),
        dex_id=raw.get("dexId", ""),
    )


def fetch_token_pairs(mint: str) -> list[PairSnapshot]:
    url = f"{DEXSCREENER_BASE}/token-pairs/v1/solana/{mint}"
    with get_client() as client:
        resp = client.get(url)
        resp.raise_for_status()
        data = resp.json()

    if not isinstance(data, list):
        return []

    pairs = [parse_pair(mint, p) for p in data if p.get("chainId") == "solana" or True]
    pairs.sort(key=lambda p: p.liquidity_usd, reverse=True)
    return pairs


def best_pair(mint: str) -> PairSnapshot | None:
    pairs = fetch_token_pairs(mint)
    return pairs[0] if pairs else None
