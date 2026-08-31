"""Configuration loaded from environment."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

SOL_MINT = "So11111111111111111111111111111111111111112"
USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
SOCIAL_BONUS_MAX = 20
LAMPORTS_PER_SOL = 1_000_000_000


@dataclass(frozen=True)
class Config:
    helius_rpc_url: str
    rugcheck_api_key: str
    jupiter_api_key: str
    telegram_bot_token: str
    telegram_channel_ids: list[str]
    live_trading: bool
    wallet_keypair_path: Path
    min_liquidity_usd: float
    min_token_age_hours: float
    max_top10_holder_pct: float
    min_score_to_buy: int
    position_size_usd: float
    poll_interval_sec: int
    project_root: Path
    starting_cash_usd: float
    slippage_bps: int
    stop_loss_pct: float
    take_profit_1_pct: float
    take_profit_1_fraction: float
    take_profit_2_pct: float
    take_profit_2_fraction: float
    trailing_stop_pct: float
    trailing_activation_pct: float
    time_stop_hours: float
    lp_pull_drop_pct: float
    max_concurrent_positions: int
    max_daily_loss_usd: float
    max_total_loss_usd: float
    max_trades_per_day: int

    @classmethod
    def from_env(cls, project_root: Path | None = None) -> Config:
        root = project_root or Path(__file__).resolve().parent
        channels = os.getenv("TELEGRAM_CHANNEL_IDS", "")
        return cls(
            helius_rpc_url=os.getenv("HELIUS_RPC_URL", "").strip(),
            rugcheck_api_key=os.getenv("RUGCHECK_API_KEY", "").strip(),
            jupiter_api_key=os.getenv("JUPITER_API_KEY", "").strip(),
            telegram_bot_token=os.getenv("TELEGRAM_BOT_TOKEN", "").strip(),
            telegram_channel_ids=[c.strip() for c in channels.split(",") if c.strip()],
            live_trading=os.getenv("LIVE_TRADING", "false").lower() in ("1", "true", "yes"),
            wallet_keypair_path=root / os.getenv("WALLET_KEYPAIR_PATH", "./burner-keypair.json"),
            min_liquidity_usd=float(os.getenv("MIN_LIQUIDITY_USD", "150000")),
            min_token_age_hours=float(os.getenv("MIN_TOKEN_AGE_HOURS", "24")),
            max_top10_holder_pct=float(os.getenv("MAX_TOP10_HOLDER_PCT", "30")),
            min_score_to_buy=int(os.getenv("MIN_SCORE_TO_BUY", "60")),
            position_size_usd=float(os.getenv("POSITION_SIZE_USD", "12")),
            poll_interval_sec=int(os.getenv("POLL_INTERVAL_SEC", "60")),
            project_root=root,
            starting_cash_usd=float(os.getenv("STARTING_CASH_USD", "100")),
            slippage_bps=int(os.getenv("SLIPPAGE_BPS", "100")),
            stop_loss_pct=float(os.getenv("STOP_LOSS_PCT", "8")),
            take_profit_1_pct=float(os.getenv("TAKE_PROFIT_1_PCT", "15")),
            take_profit_1_fraction=float(os.getenv("TAKE_PROFIT_1_FRACTION", "0.4")),
            take_profit_2_pct=float(os.getenv("TAKE_PROFIT_2_PCT", "30")),
            take_profit_2_fraction=float(os.getenv("TAKE_PROFIT_2_FRACTION", "0.4")),
            trailing_stop_pct=float(os.getenv("TRAILING_STOP_PCT", "10")),
            trailing_activation_pct=float(os.getenv("TRAILING_ACTIVATION_PCT", "10")),
            time_stop_hours=float(os.getenv("TIME_STOP_HOURS", "48")),
            lp_pull_drop_pct=float(os.getenv("LP_PULL_DROP_PCT", "30")),
            max_concurrent_positions=int(os.getenv("MAX_CONCURRENT_POSITIONS", "3")),
            max_daily_loss_usd=float(os.getenv("MAX_DAILY_LOSS_USD", "15")),
            max_total_loss_usd=float(os.getenv("MAX_TOTAL_LOSS_USD", "30")),
            max_trades_per_day=int(os.getenv("MAX_TRADES_PER_DAY", "5")),
        )

    @property
    def live_trading_enabled(self) -> bool:
        """Live mode requires env flag AND an existing burner keypair."""
        return self.live_trading and self.wallet_keypair_path.exists()

    @property
    def kill_switch_path(self) -> Path:
        return self.project_root / "KILL"

    def kill_switch_active(self) -> bool:
        return self.kill_switch_path.exists()


def load_config(project_root: Path | None = None) -> Config:
    return Config.from_env(project_root)
