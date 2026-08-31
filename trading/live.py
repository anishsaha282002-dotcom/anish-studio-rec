"""Live trading via burner wallet — Jupiter quote, sign, simulate, send."""

from __future__ import annotations

import base64
import json
import logging
from pathlib import Path
from typing import Any

from solders.keypair import Keypair
from solders.message import to_bytes_versioned
from solders.transaction import VersionedTransaction

from clients.jupiter import build_swap_transaction, get_quote
from config import Config, LAMPORTS_PER_SOL, SOL_MINT
from http_client import get_client
from models import TradeResult

logger = logging.getLogger(__name__)


def load_burner_keypair(path: Path) -> Keypair:
    if not path.exists():
        raise FileNotFoundError(
            f"Burner keypair not found at {path}. Run: python3 setup_wallet.py"
        )
    data = json.loads(path.read_text())
    secret = bytes(data if isinstance(data, list) else data.get("secret_key", data))
    return Keypair.from_bytes(secret)


def pubkey_str(keypair: Keypair) -> str:
    return str(keypair.pubkey())


class LiveTrader:
    """Execute swaps through Jupiter with simulate-before-send."""

    def __init__(self, cfg: Config) -> None:
        self.cfg = cfg
        self.keypair = load_burner_keypair(cfg.wallet_keypair_path)
        self.pubkey = pubkey_str(self.keypair)

    def ready(self) -> bool:
        return self.keypair is not None

    def _rpc(self, method: str, params: list[Any]) -> Any:
        payload = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
        with get_client() as client:
            resp = client.post(self.cfg.helius_rpc_url, json=payload)
            resp.raise_for_status()
            body = resp.json()
        if "error" in body:
            raise RuntimeError(body["error"])
        return body["result"]

    def _sign_transaction(self, swap_tx_b64: str) -> VersionedTransaction:
        raw = base64.b64decode(swap_tx_b64)
        tx = VersionedTransaction.from_bytes(raw)
        sig = self.keypair.sign_message(to_bytes_versioned(tx.message))
        return VersionedTransaction.populate(tx.message, [sig])

    def _simulate(self, signed: VersionedTransaction) -> tuple[bool, str | None]:
        encoded = base64.b64encode(bytes(signed)).decode()
        result = self._rpc(
            "simulateTransaction",
            [encoded, {"encoding": "base64", "commitment": "confirmed"}],
        )
        value = result.get("value") or {}
        err = value.get("err")
        if err:
            return False, str(err)
        return True, None

    def _send(self, signed: VersionedTransaction) -> str:
        encoded = base64.b64encode(bytes(signed)).decode()
        return self._rpc(
            "sendTransaction",
            [encoded, {"encoding": "base64", "skipPreflight": True, "maxRetries": 3}],
        )

    def swap(
        self,
        input_mint: str,
        output_mint: str,
        amount: int,
    ) -> TradeResult:
        quote = get_quote(
            input_mint,
            output_mint,
            amount,
            slippage_bps=self.cfg.slippage_bps,
            api_key=self.cfg.jupiter_api_key,
        )
        if not quote:
            return TradeResult(False, error="no quote")

        swap_tx = build_swap_transaction(quote, self.pubkey, api_key=self.cfg.jupiter_api_key)
        if not swap_tx:
            return TradeResult(False, error="no swap transaction")

        try:
            signed = self._sign_transaction(swap_tx)
            ok, sim_err = self._simulate(signed)
            if not ok:
                return TradeResult(False, error=f"simulation failed: {sim_err}")
            sig = self._send(signed)
            return TradeResult(True, signature=sig)
        except Exception as exc:
            logger.exception("Live swap failed")
            return TradeResult(False, error=str(exc))

    def buy_token(self, token_mint: str, size_usd: float) -> TradeResult:
        # Approximate SOL amount — live sizing should use wallet balance checks in production
        sol_amount = max(int(size_usd / 150 * LAMPORTS_PER_SOL), 10_000_000)
        return self.swap(SOL_MINT, token_mint, sol_amount)

    def sell_token(self, token_mint: str, token_amount: int) -> TradeResult:
        return self.swap(token_mint, SOL_MINT, token_amount)
