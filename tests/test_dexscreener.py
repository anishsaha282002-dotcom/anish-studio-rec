"""Tests for DexScreener parsing — offline."""

from clients.dexscreener import parse_pair


def test_parse_pair_from_fixture():
    raw = {
        "chainId": "solana",
        "dexId": "raydium",
        "pairAddress": "abc123",
        "baseToken": {"address": "mint", "symbol": "JUP", "name": "Jupiter"},
        "liquidity": {"usd": 500000},
        "marketCap": 2000000,
        "volume": {"h1": 10000, "h24": 80000},
        "priceChange": {"h1": 2.5, "h6": 5.0},
        "pairCreatedAt": 1700000000000,
    }
    pair = parse_pair("mint", raw)
    assert pair.symbol == "JUP"
    assert pair.liquidity_usd == 500000
    assert pair.volume_h1 == 10000
