"""Ensure tests never leave a KILL file behind."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_no_stray_kill_file_in_project():
    kill = ROOT / "KILL"
    assert not kill.exists(), "Stray KILL file would block the bot — remove it"
