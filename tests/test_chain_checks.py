"""Tests for SPL mint account parsing."""

import base64
import struct

from safety.chain_checks import _parse_mint_account


def _build_mint_data(mint_active: bool, freeze_active: bool) -> str:
    raw = bytearray(82)
    if mint_active:
        struct.pack_into("<I", raw, 0, 1)
    if freeze_active:
        struct.pack_into("<I", raw, 46, 1)
    return base64.b64encode(bytes(raw)).decode()


def test_revoked_authorities():
    mint_active, freeze_active = _parse_mint_account(_build_mint_data(False, False))
    assert mint_active is False
    assert freeze_active is False


def test_active_mint_authority():
    mint_active, freeze_active = _parse_mint_account(_build_mint_data(True, False))
    assert mint_active is True
    assert freeze_active is False


def test_active_freeze_authority():
    mint_active, freeze_active = _parse_mint_account(_build_mint_data(False, True))
    assert mint_active is False
    assert freeze_active is True
