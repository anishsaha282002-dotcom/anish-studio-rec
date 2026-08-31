"""Telegram call-channel ingest — one input, never the buy trigger."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

SOLANA_MINT_RE = re.compile(r"\b[1-9A-HJ-NP-Za-km-z]{32,44}\b")


@dataclass
class TelegramWatchlist:
    """Tracks mints mentioned in call channels for social bonus only."""

    mentioned_mints: set[str] = field(default_factory=set)

    def ingest_message(self, text: str) -> list[str]:
        found = SOLANA_MINT_RE.findall(text or "")
        for mint in found:
            self.mentioned_mints.add(mint)
        return found

    def is_mentioned(self, mint: str) -> bool:
        return mint in self.mentioned_mints

    def clear(self) -> None:
        self.mentioned_mints.clear()
