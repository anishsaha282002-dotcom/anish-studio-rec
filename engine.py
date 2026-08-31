"""Trading engine — momentum strategy on established tokens."""

from __future__ import annotations

import logging
import time
from pathlib import Path

from config import Config
from models import PairSnapshot, RejectReason, TokenEvaluation
from scoring import score_token
from signals.telegram import TelegramWatchlist
from trading.live import LiveTrader
from trading.paper import PaperLedger

logger = logging.getLogger(__name__)


class Engine:
    def __init__(self, cfg: Config) -> None:
        self.cfg = cfg
        self.telegram = TelegramWatchlist()
        self.ledger = PaperLedger(cfg.project_root / "paper_ledger.json")
        self.live_trader: LiveTrader | None = None

        if cfg.live_trading_enabled:
            self.live_trader = LiveTrader(cfg.wallet_keypair_path)

    def check_kill_switch(self) -> bool:
        return self.cfg.kill_switch_active()

    def evaluate_candidate(
        self,
        pair: PairSnapshot,
        *,
        mention_count: int = 0,
        skip_rpc: bool = False,
    ) -> TokenEvaluation:
        telegram_mentioned = self.telegram.is_mentioned(pair.mint)
        return score_token(
            self.cfg,
            pair,
            mention_count=mention_count,
            telegram_mentioned=telegram_mentioned,
            onchain_trigger_required=True,
            live_mode=self.cfg.live_trading_enabled,
            skip_rpc=skip_rpc,
        )

    def maybe_enter(self, evaluation: TokenEvaluation) -> bool:
        if self.check_kill_switch():
            logger.warning("Kill switch active — no new entries")
            return False

        if not evaluation.approved:
            logger.info(
                "Rejected %s: %s",
                evaluation.pair.symbol,
                evaluation.reject_reason,
            )
            return False

        pair = evaluation.pair
        price = self._estimate_price(pair)
        if price <= 0:
            return False

        if self.cfg.live_trading_enabled:
            if not self.live_trader or not self.live_trader.ready():
                logger.error("Live trading enabled but burner wallet not ready")
                return False
            logger.info(
                "LIVE entry signal %s score=%.1f wallet=%s",
                pair.symbol,
                evaluation.total_score,
                self.live_trader.pubkey,
            )
            # Execution wired through Jupiter in production; paper validates logic first.
            return True

        ok = self.ledger.open_position(
            pair.mint,
            pair.symbol,
            price,
            self.cfg.position_size_usd,
        )
        if ok:
            logger.info(
                "PAPER buy %s score=%.1f size=$%.2f",
                pair.symbol,
                evaluation.total_score,
                self.cfg.position_size_usd,
            )
        return ok

    def ingest_telegram(self, text: str) -> list[str]:
        """Telegram mentions add watchlist entries only — never trigger buys."""
        return self.telegram.ingest_message(text)

    @staticmethod
    def _estimate_price(pair: PairSnapshot) -> float:
        if pair.market_cap_usd > 0 and pair.liquidity_usd > 0:
            return max(pair.market_cap_usd / 1_000_000_000, 1e-12)
        return 0.0001

    def run_once(self, candidates: list[PairSnapshot], *, skip_rpc: bool = False) -> None:
        if self.check_kill_switch():
            logger.warning("Kill switch active — engine idle")
            return

        for pair in candidates:
            ev = self.evaluate_candidate(pair, skip_rpc=skip_rpc)
            if ev.approved:
                self.maybe_enter(ev)

    def sleep_interval(self) -> None:
        time.sleep(self.cfg.poll_interval_sec)
