"""HTTP client helpers."""

from __future__ import annotations

import httpx

DEFAULT_TIMEOUT = 30.0


def get_client(timeout: float = DEFAULT_TIMEOUT) -> httpx.Client:
    return httpx.Client(timeout=timeout, follow_redirects=True)
