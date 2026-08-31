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
        )

    @property
    def live_trading_enabled(self) -> bool:
        """Whether live trading is enabled (burner wallet required)."""
        return self.live_trading

    @property
    def kill_switch_path(self) -> Path:
        return self.project_root / "KILL"

    def kill_switch_active(self) -> bool:
        return self.kill_switch_path.exists()


def load_config(project_root: Path | None = None) -> Config:
    return Config.from_env(project_root)
