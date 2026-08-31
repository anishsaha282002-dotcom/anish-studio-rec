"""Paper trading ledger — tracks positions and P&L for paper and live."""

from __future__ import annotations

import json
import time
from dataclasses import asdict
from pathlib import Path

from models import ExitReason, PaperPosition


class PaperLedger:
    def __init__(self, path: Path, starting_cash: float = 100.0) -> None:
        self.path = path
        self.starting_cash = starting_cash
        self.cash_usd = starting_cash
        self.positions: list[PaperPosition] = []
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        data = json.loads(self.path.read_text())
        self.cash_usd = data.get("cash_usd", self.starting_cash)
        self.positions = [PaperPosition(**p) for p in data.get("positions", [])]

    def save(self) -> None:
        payload = {
            "cash_usd": self.cash_usd,
            "positions": [asdict(p) for p in self.positions],
        }
        self.path.write_text(json.dumps(payload, indent=2))

    def open_position(
        self,
        mint: str,
        symbol: str,
        price_usd: float,
        size_usd: float,
        entry_liquidity_usd: float = 0.0,
        *,
        entry_time_ms: int | None = None,
    ) -> bool:
        if size_usd > self.cash_usd:
            return False
        self.cash_usd -= size_usd
        now = entry_time_ms or int(time.time() * 1000)
        self.positions.append(
            PaperPosition(
                mint=mint,
                symbol=symbol,
                entry_price_usd=price_usd,
                size_usd=size_usd,
                entry_time_ms=now,
                entry_liquidity_usd=entry_liquidity_usd,
                high_water_mark_usd=price_usd,
            )
        )
        self.save()
        return True

    def _find_open(self, mint: str) -> PaperPosition | None:
        for pos in self.positions:
            if pos.mint == mint and pos.remaining_fraction > 0.001 and pos.exit_price_usd is None:
                return pos
        return None

    def reduce_position(
        self,
        mint: str,
        exit_price_usd: float,
        fraction: float,
        reason: ExitReason | str,
        *,
        exit_time_ms: int | None = None,
    ) -> PaperPosition | None:
        """Close a fraction of an open position (fraction of original size_usd)."""
        pos = self._find_open(mint)
        if not pos:
            return None

        fraction = min(max(fraction, 0.0), pos.remaining_fraction)
        if fraction <= 0:
            return None

        close_usd = pos.size_usd * fraction
        tokens = close_usd / pos.entry_price_usd if pos.entry_price_usd else 0
        proceeds = tokens * exit_price_usd
        partial_pnl = proceeds - close_usd

        pos.realized_pnl_usd += partial_pnl
        pos.remaining_fraction -= fraction
        self.cash_usd += proceeds
        now = exit_time_ms or int(time.time() * 1000)

        reason_str = reason.value if isinstance(reason, ExitReason) else str(reason)

        if pos.remaining_fraction <= 0.001:
            pos.remaining_fraction = 0.0
            pos.exit_price_usd = exit_price_usd
            pos.exit_time_ms = now
            pos.pnl_usd = pos.realized_pnl_usd
            pos.exit_reason = reason_str

        if reason == ExitReason.TAKE_PROFIT_1:
            pos.tp1_taken = True
        elif reason == ExitReason.TAKE_PROFIT_2:
            pos.tp2_taken = True

        self.save()
        return pos

    def close_position(
        self,
        mint: str,
        exit_price_usd: float,
        reason: ExitReason | str = ExitReason.TIME_STOP,
        *,
        exit_time_ms: int | None = None,
    ) -> PaperPosition | None:
        pos = self._find_open(mint)
        if not pos:
            return None
        return self.reduce_position(
            mint,
            exit_price_usd,
            pos.remaining_fraction,
            reason,
            exit_time_ms=exit_time_ms,
        )

    @property
    def open_positions(self) -> list[PaperPosition]:
        return [p for p in self.positions if p.remaining_fraction > 0.001 and p.exit_price_usd is None]

    def total_realized_pnl(self) -> float:
        total = 0.0
        for pos in self.positions:
            if pos.pnl_usd is not None:
                total += pos.pnl_usd
            else:
                total += pos.realized_pnl_usd
        return total
