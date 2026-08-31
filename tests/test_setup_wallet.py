"""Tests for setup_wallet.py"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_setup_wallet_creates_keypair():
    with tempfile.TemporaryDirectory() as tmp:
        env = {
            **__import__("os").environ,
            "PYTHONPATH": str(ROOT),
            "WALLET_KEYPAIR_PATH": str(Path(tmp) / "burner.json"),
        }
        result = subprocess.run(
            [sys.executable, "setup_wallet.py"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            env=env,
        )
        assert result.returncode == 0
        kp = Path(tmp) / "burner.json"
        assert kp.exists()
        data = json.loads(kp.read_text())
        assert isinstance(data, list)
        assert len(data) == 64
