"""Jupiter exit-route quote — honeypot test before every entry."""

from __future__ import annotations

from config import Config, SOL_MINT
from http_client import get_client
from models import RejectReason, SafetyResult

JUPITER_QUOTE_URLS = [
    "https://lite-api.jup.ag/swap/v1/quote",
    "https://api.jup.ag/swap/v2/build",
]


def check_exit_route(
    cfg: Config,
    token_mint: str,
    amount_lamports: int = 1_000_000,
) -> SafetyResult:
    """Verify we can quote token -> SOL before entering."""
    params = {
        "inputMint": token_mint,
        "outputMint": SOL_MINT,
        "amount": str(amount_lamports),
        "slippageBps": "500",
    }
    headers = {}
    if cfg.jupiter_api_key:
        headers["x-api-key"] = cfg.jupiter_api_key

    last_error = None
    for base in JUPITER_QUOTE_URLS:
        try:
            with get_client() as client:
                resp = client.get(base, params=params, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    out_amount = data.get("outAmount") or data.get("out_amount")
                    if out_amount and int(out_amount) > 0:
                        return SafetyResult(True, details={"route": base, "outAmount": out_amount})
                    return SafetyResult(False, RejectReason.NO_EXIT_ROUTE, {"route": base})
                last_error = f"{resp.status_code}: {resp.text[:200]}"
        except Exception as exc:
            last_error = str(exc)

    return SafetyResult(
        False,
        RejectReason.NO_EXIT_ROUTE,
        {"error": last_error or "no route"},
    )
