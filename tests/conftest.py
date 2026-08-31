"""Shared test helpers."""

from pathlib import Path

from config import Config

ROOT = Path(__file__).resolve().parent.parent


def make_config(root: Path | None = None, **overrides) -> Config:
    base = Config(
        helius_rpc_url="http://localhost",
        rugcheck_api_key="",
        jupiter_api_key="",
        telegram_bot_token="",
        telegram_channel_ids=[],
        live_trading=False,
        wallet_keypair_path=(root or ROOT) / "burner-keypair.json",
        min_liquidity_usd=150_000,
        min_token_age_hours=24,
        max_top10_holder_pct=30,
        min_score_to_buy=60,
        position_size_usd=12,
        poll_interval_sec=60,
        project_root=root or ROOT,
        starting_cash_usd=100.0,
        slippage_bps=100,
        stop_loss_pct=8.0,
        take_profit_1_pct=15.0,
        take_profit_1_fraction=0.4,
        take_profit_2_pct=30.0,
        take_profit_2_fraction=0.4,
        trailing_stop_pct=10.0,
        trailing_activation_pct=10.0,
        time_stop_hours=48.0,
        lp_pull_drop_pct=30.0,
        max_concurrent_positions=3,
        max_daily_loss_usd=15.0,
        max_total_loss_usd=30.0,
        max_trades_per_day=5,
    )
    if not overrides:
        return base
    fields = {name: getattr(base, name) for name in Config.__dataclass_fields__}
    fields.update(overrides)
    return Config(**fields)
