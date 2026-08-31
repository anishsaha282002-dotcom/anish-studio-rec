"""Offline test fixtures — representative pair snapshots."""

from models import PairSnapshot

# Established momentum candidate — deep pool, >24h old, strong volume
GOOD_MOMENTUM = PairSnapshot(
    mint="GoodMint1111111111111111111111111111111111",
    symbol="GOOD",
    name="Good Token",
    pair_address="pair_good",
    price_usd=0.002,
    liquidity_usd=250_000,
    market_cap_usd=2_000_000,
    volume_h1=80_000,
    volume_h24=200_000,
    price_change_h1=5.0,
    price_change_h6=12.0,
    pair_created_at_ms=1_700_000_000_000,
    dex_id="raydium",
)

LOW_LIQUIDITY = PairSnapshot(
    mint="LowLiqMint11111111111111111111111111111111",
    symbol="LOW",
    name="Low Liq",
    pair_address="pair_low",
    price_usd=0.001,
    liquidity_usd=50_000,
    market_cap_usd=500_000,
    volume_h1=10_000,
    volume_h24=30_000,
    price_change_h1=8.0,
    price_change_h6=15.0,
    pair_created_at_ms=1_700_000_000_000,
)

FRESH_LAUNCH = PairSnapshot(
    mint="FreshMint111111111111111111111111111111111",
    symbol="FRESH",
    name="Fresh Launch",
    pair_address="pair_fresh",
    price_usd=0.003,
    liquidity_usd=200_000,
    market_cap_usd=1_000_000,
    volume_h1=100_000,
    volume_h24=100_000,
    price_change_h1=20.0,
    price_change_h6=30.0,
    pair_created_at_ms=int(__import__("time").time() * 1000) - 3_600_000,
)

FLAT_TOKEN = PairSnapshot(
    mint="JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    symbol="FLAT",
    name="Flat Token",
    pair_address="pair_flat",
    price_usd=0.85,
    liquidity_usd=180_000,
    market_cap_usd=1_500_000,
    volume_h1=5_000,
    volume_h24=120_000,
    price_change_h1=0.5,
    price_change_h6=1.0,
    pair_created_at_ms=1_700_000_000_000,
)

BAD_LIQ_MCAP = PairSnapshot(
    mint="BadRatio1111111111111111111111111111111111",
    symbol="BAD",
    name="Bad Ratio",
    pair_address="pair_bad",
    price_usd=0.01,
    liquidity_usd=160_000,
    market_cap_usd=10_000_000,
    volume_h1=50_000,
    volume_h24=150_000,
    price_change_h1=6.0,
    price_change_h6=10.0,
    pair_created_at_ms=1_700_000_000_000,
)


def pair_at_price(base: PairSnapshot, price_usd: float, **kwargs) -> PairSnapshot:
    fields = base.__dict__.copy()
    fields["price_usd"] = price_usd
    fields.update(kwargs)
    return PairSnapshot(**fields)
