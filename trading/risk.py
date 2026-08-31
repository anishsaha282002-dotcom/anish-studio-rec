"""Risk caps — max positions, daily/total loss, trades per day."""

from __future__ import annotations

import time
from dataclasses import dataclass, field

from config import Config
from models import RejectReason
from trading.paper import PaperLedger


@dataclass
class RiskManager:
    cfg: Config
    ledger: PaperLedger
    _entry_timestamps_ms: list[int] = field(default_factory=list)

    def record_entry(self, *, now_ms: int | None = None) -> None:
        self._entry_timestamps_ms.append(now_ms or int(time.time() * 1000))

    def realized_pnl(self) -> float:
        total = 0.0
        for pos in self.ledger.positions:
            if pos.pnl_usd is not None:
                total += pos.pnl_usd
            else:
                total += pos.realized_pnl_usd
        return total

    def _today_start_ms(self, now_ms: int) -> int:
        day_sec = now_ms // 1000
        midnight = day_sec - (day_sec % 86400)
        return midnight * 1000

    def daily_realized_pnl(self, *, now_ms: int | None = None) -> float:
        now = now_ms or int(time.time() * 1000)
        start = self._today_start_ms(now)
        total = 0.0
        for pos in self.ledger.positions:
            if pos.exit_time_ms and pos.exit_time_ms >= start and pos.pnl_usd is not None:
                total += pos.pnl_usd
            elif pos.realized_pnl_usd and pos.exit_time_ms and pos.exit_time_ms >= start:
                total += pos.realized_pnl_usd
        return total

    def entries_today(self, *, now_ms: int | None = None) -> int:
        now = now_ms or int(time.time() * 1000)
        start = self._today_start_ms(now)
        return sum(1 for ts in self._entry_timestamps_ms if ts >= start)

    def can_enter(self, *, now_ms: int | None = None) -> tuple[bool, RejectReason | None]:
        if len(self.ledger.open_positions) >= self.cfg.max_concurrent_positions:
            return False, RejectReason.RISK_MAX_POSITIONS

        daily = self.daily_realized_pnl(now_ms=now_ms)
        if daily <= -self.cfg.max_daily_loss_usd:
            return False, RejectReason.RISK_DAILY_LOSS

        total = self.realized_pnl()
        if total <= -self.cfg.max_total_loss_usd:
            return False, RejectReason.RISK_TOTAL_LOSS

        if self.entries_today(now_ms=now_ms) >= self.cfg.max_trades_per_day:
            return False, RejectReason.RISK_TRADES_PER_DAY

        return True, None
