"""Trading engine — entries, exits, risk caps, paper/live execution."""

from __future__ import annotations

import logging
import time

from config import Config
from models import ExitReason, PairSnapshot, RejectReason, TokenEvaluation
from scoring import score_token
from signals.telegram import TelegramWatchlist
from trading.exits import evaluate_exit
from trading.live import LiveTrader
from trading.paper import PaperLedger
from trading.risk import RiskManager

logger = logging.getLogger(__name__)


class Engine:
    def __init__(self, cfg: Config) -> None:
        self.cfg = cfg
        self.telegram = TelegramWatchlist()
        self.ledger = PaperLedger(
            cfg.project_root / "paper_ledger.json",
            starting_cash=cfg.starting_cash_usd,
        )
        self.risk = RiskManager(cfg, self.ledger)
        self.live_trader: LiveTrader | None = None
        self.live_mode = False

        if cfg.live_trading and not cfg.wallet_keypair_path.exists():
            logger.warning(
                "LIVE_TRADING=true but no burner wallet at %s — falling back to paper",
                cfg.wallet_keypair_path,
            )
        elif cfg.live_trading_enabled:
            try:
                self.live_trader = LiveTrader(cfg)
                self.live_mode = True
                logger.info("Live trading active — wallet %s", self.live_trader.pubkey)
            except Exception as exc:
                logger.warning("Live trader init failed (%s) — falling back to paper", exc)
        elif cfg.live_trading:
            logger.warning("LIVE_TRADING=true but wallet missing — paper mode")

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
            live_mode=self.live_mode,
            skip_rpc=skip_rpc,
        )

    def _pair_price(self, pair: PairSnapshot) -> float:
        return pair.price_usd

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

        can, risk_reason = self.risk.can_enter()
        if not can:
            logger.info("Risk cap blocked entry: %s", risk_reason)
            return False

        pair = evaluation.pair
        price = self._pair_price(pair)
        if price <= 0:
            logger.warning("No priceUsd for %s — skipping entry", pair.symbol)
            return False

        if self.live_mode and self.live_trader:
            result = self.live_trader.buy_token(pair.mint, self.cfg.position_size_usd)
            if not result.success:
                logger.error("Live buy failed for %s: %s", pair.symbol, result.error)
                return False
            logger.info(
                "LIVE buy %s sig=%s",
                pair.symbol,
                result.signature,
            )

        ok = self.ledger.open_position(
            pair.mint,
            pair.symbol,
            price,
            self.cfg.position_size_usd,
            entry_liquidity_usd=pair.liquidity_usd,
        )
        if ok:
            self.risk.record_entry()
            mode = "LIVE" if self.live_mode else "PAPER"
            logger.info(
                "%s entry %s score=%.1f size=$%.2f price=$%.8f",
                mode,
                pair.symbol,
                evaluation.total_score,
                self.cfg.position_size_usd,
                price,
            )
        return ok

    def manage_exits(
        self,
        price_by_mint: dict[str, PairSnapshot],
        *,
        now_ms: int | None = None,
    ) -> list[tuple[str, ExitReason]]:
        """Evaluate and execute exits for all open positions."""
        closed: list[tuple[str, ExitReason]] = []

        for pos in list(self.ledger.open_positions):
            pair = price_by_mint.get(pos.mint)
            current_price = pair.price_usd if pair else 0.0
            if current_price <= 0:
                continue

            decision = evaluate_exit(self.cfg, pos, current_price, pair, now_ms=now_ms)
            if not decision.should_exit or not decision.reason:
                continue

            if self.live_mode and self.live_trader:
                # Sell full remaining — partial live sells need token balance lookup
                sell_frac = decision.fraction if decision.fraction >= pos.remaining_fraction else pos.remaining_fraction
                token_amount = int(
                    (pos.size_usd * sell_frac / pos.entry_price_usd) * 1_000_000
                )
                result = self.live_trader.sell_token(pos.mint, max(token_amount, 1))
                if not result.success:
                    logger.error("Live sell failed for %s: %s", pos.symbol, result.error)
                    continue
                logger.info("LIVE sell %s sig=%s reason=%s", pos.symbol, result.signature, decision.reason)

            self.ledger.reduce_position(
                pos.mint,
                current_price,
                decision.fraction,
                decision.reason,
                exit_time_ms=now_ms,
            )
            closed.append((pos.mint, decision.reason))
            logger.info(
                "Exit %s reason=%s fraction=%.2f price=$%.8f",
                pos.symbol,
                decision.reason.value,
                decision.fraction,
                current_price,
            )

        return closed

    def ingest_telegram(self, text: str) -> list[str]:
        return self.telegram.ingest_message(text)

    def run_once(
        self,
        candidates: list[PairSnapshot],
        *,
        skip_rpc: bool = False,
    ) -> None:
        if self.check_kill_switch():
            logger.warning("Kill switch active — engine idle")
            return

        price_by_mint = {p.mint: p for p in candidates}
        for pos in self.ledger.open_positions:
            if pos.mint not in price_by_mint:
                price_by_mint[pos.mint] = PairSnapshot(
                    mint=pos.mint,
                    symbol=pos.symbol,
                    name=pos.symbol,
                    pair_address="",
                    price_usd=pos.entry_price_usd,
                    liquidity_usd=pos.entry_liquidity_usd,
                    market_cap_usd=0,
                    volume_h1=0,
                    volume_h24=0,
                    price_change_h1=0,
                    price_change_h6=0,
                    pair_created_at_ms=None,
                )

        self.manage_exits(price_by_mint)

        for pair in candidates:
            ev = self.evaluate_candidate(pair, skip_rpc=skip_rpc)
            if ev.approved:
                self.maybe_enter(ev)

    def sleep_interval(self) -> None:
        time.sleep(self.cfg.poll_interval_sec)
