"""Shared data models."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class RejectReason(str, Enum):
    KILL_SWITCH = "kill_switch"
    LIVE_DISABLED = "live_disabled"
    INSUFFICIENT_LIQUIDITY = "insufficient_liquidity"
    TOKEN_TOO_YOUNG = "token_too_young"
    MINT_AUTHORITY_ACTIVE = "mint_authority_active"
    FREEZE_AUTHORITY_ACTIVE = "freeze_authority_active"
    TOP10_CONCENTRATION = "top10_concentration"
    NO_EXIT_ROUTE = "no_exit_route"
    RUGCHECK_UNAVAILABLE = "rugcheck_unavailable"
    RUGCHECK_FAILED = "rugcheck_failed"
    LIQ_TO_MCAP_FLOOR = "liq_to_mcap_floor"
    SCORE_TOO_LOW = "score_too_low"
    TELEGRAM_ONLY = "telegram_only"
    SAFETY_UNKNOWN = "safety_unknown"


@dataclass
class PairSnapshot:
    mint: str
    symbol: str
    name: str
    pair_address: str
    liquidity_usd: float
    market_cap_usd: float
    volume_h1: float
    volume_h24: float
    price_change_h1: float
    price_change_h6: float
    pair_created_at_ms: int | None
    dex_id: str = ""


@dataclass
class OnChainSignal:
    mint: str
    momentum_score: float
    volume_surge: bool
    price_momentum: bool
    triggered: bool


@dataclass
class SocialSignal:
    mint: str
    mention_count: int
    telegram_mentioned: bool
    bonus_points: float = 0.0


@dataclass
class SafetyResult:
    passed: bool
    reason: RejectReason | None = None
    details: dict[str, Any] = field(default_factory=dict)


@dataclass
class TokenEvaluation:
    pair: PairSnapshot
    onchain: OnChainSignal
    social: SocialSignal
    safety: SafetyResult
    base_score: float
    social_bonus: float
    total_score: float
    approved: bool
    reject_reason: RejectReason | None = None


@dataclass
class PaperPosition:
    mint: str
    symbol: str
    entry_price_usd: float
    size_usd: float
    entry_time_ms: int
    exit_price_usd: float | None = None
    exit_time_ms: int | None = None
    pnl_usd: float | None = None
