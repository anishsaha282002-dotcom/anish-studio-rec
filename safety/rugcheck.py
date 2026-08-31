"""RugCheck integration — fail closed when unavailable in live mode."""

from __future__ import annotations

from typing import Any

from config import Config
from http_client import get_client
from models import RejectReason, SafetyResult

RUGCHECK_BASE = "https://api.rugcheck.xyz"


def fetch_report_summary(cfg: Config, mint: str) -> dict[str, Any] | None:
    url = f"{RUGCHECK_BASE}/v1/tokens/{mint}/report/summary"
    headers = {}
    if cfg.rugcheck_api_key:
        headers["X-API-KEY"] = cfg.rugcheck_api_key

    with get_client() as client:
        resp = client.get(url, headers=headers)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()


def check_rugcheck(cfg: Config, mint: str, *, live_mode: bool) -> SafetyResult:
    try:
        report = fetch_report_summary(cfg, mint)
    except Exception as exc:
        if live_mode:
            return SafetyResult(False, RejectReason.RUGCHECK_UNAVAILABLE, {"error": str(exc)})
        return SafetyResult(True, details={"rugcheck": "skipped_offline_error"})

    if report is None:
        if live_mode:
            return SafetyResult(False, RejectReason.RUGCHECK_UNAVAILABLE)
        return SafetyResult(True, details={"rugcheck": "not_found_paper_ok"})

    score = report.get("score")
    risk_level = (report.get("riskLevel") or report.get("risk_level") or "").lower()
    risks = report.get("risks") or []

    dangerous = any(
        r.get("level", "").lower() in ("danger", "critical", "high")
        or r.get("name", "").lower() in ("mint authority", "freeze authority")
        for r in risks
        if isinstance(r, dict)
    )

    if dangerous or risk_level in ("danger", "critical", "high"):
        return SafetyResult(
            False,
            RejectReason.RUGCHECK_FAILED,
            {"score": score, "risk_level": risk_level},
        )

    if score is not None and score > 4000:
        return SafetyResult(
            False,
            RejectReason.RUGCHECK_FAILED,
            {"score": score, "risk_level": risk_level},
        )

    return SafetyResult(True, details={"score": score, "risk_level": risk_level})
