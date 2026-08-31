"""Smoke tests for entry points."""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_run_py_imports():
    result = subprocess.run(
        [sys.executable, "-c", "import run; import engine; import verify_apis"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        env={**__import__("os").environ, "PYTHONPATH": str(ROOT)},
    )
    assert result.returncode == 0, result.stderr


def test_run_exits_without_env():
    result = subprocess.run(
        [sys.executable, "run.py"],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 1
    assert "HELIUS_RPC_URL" in result.stderr or "HELIUS" in result.stdout + result.stderr
