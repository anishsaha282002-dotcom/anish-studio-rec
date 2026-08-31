"""Paper trading ledger — no real funds."""

from __future__ import annotations

import json
import time
from dataclasses import asdict
from pathlib import Path

from models import PaperPosition


class PaperLedger:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.positions: list[PaperPosition] = []
        self.cash_usd = 100.0
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        data = json.loads(self.path.read_text())
        self.cash_usd = data.get("cash_usd", 100.0)
        self.positions = [PaperPosition(**p) for p in data.get("positions", [])]

    def save(self) -> None:
        payload = {
            "cash_usd": self.cash_usd,
            "positions": [asdict(p) for p in self.positions],
        }
        self.path.write_text(json.dumps(payload, indent=2))

    def open_position(self, mint: str, symbol: str, price_usd: float, size_usd: float) -> bool:
        if size_usd > self.cash_usd:
            return False
        self.cash_usd -= size_usd
        self.positions.append(
            PaperPosition(
                mint=mint,
                symbol=symbol,
                entry_price_usd=price_usd,
                size_usd=size_usd,
                entry_time_ms=int(time.time() * 1000),
            )
        )
        self.save()
        return True

    def close_position(self, mint: str, exit_price_usd: float) -> PaperPosition | None:
        for pos in self.positions:
            if pos.mint == mint and pos.exit_price_usd is None:
                pos.exit_price_usd = exit_price_usd
                pos.exit_time_ms = int(time.time() * 1000)
                tokens = pos.size_usd / pos.entry_price_usd if pos.entry_price_usd else 0
                proceeds = tokens * exit_price_usd
                pos.pnl_usd = proceeds - pos.size_usd
                self.cash_usd += proceeds
                self.save()
                return pos
        return None

    @property
    def open_positions(self) -> list[PaperPosition]:
        return [p for p in self.positions if p.exit_price_usd is None]
