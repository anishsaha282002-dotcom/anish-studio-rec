"""Jupiter exit-route quote — honeypot test before every entry."""

from __future__ import annotations

from clients.jupiter import get_quote, quote_has_route
from config import Config, SOL_MINT
from models import RejectReason, SafetyResult


def check_exit_route(
    cfg: Config,
    token_mint: str,
    amount_lamports: int = 1_000_000,
) -> SafetyResult:
    """Verify we can quote token -> SOL before entering."""
    quote = get_quote(
        token_mint,
        SOL_MINT,
        amount_lamports,
        slippage_bps=500,
        api_key=cfg.jupiter_api_key,
    )
    if quote_has_route(quote):
        out = quote.get("outAmount") or quote.get("out_amount")
        return SafetyResult(True, details={"outAmount": out})
    return SafetyResult(False, RejectReason.NO_EXIT_ROUTE, {"error": "no route"})
