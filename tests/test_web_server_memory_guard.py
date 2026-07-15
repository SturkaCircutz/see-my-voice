from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest


def load_web_server_module():
    repo_root = Path(__file__).resolve().parents[1]
    web_dir = repo_root / "web"
    if str(web_dir) not in sys.path:
        sys.path.insert(0, str(web_dir))
    spec = importlib.util.spec_from_file_location("see_my_voice_web_server", web_dir / "server.py")
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_asr_memory_guard_blocks_unsafe_model_load(monkeypatch: pytest.MonkeyPatch) -> None:
    server = load_web_server_module()
    monkeypatch.setenv("SEE_MY_VOICE_ASR_MIN_AVAILABLE_MB", "999999999")

    with pytest.raises(server.AnalysisUnavailableError, match="Not enough available RAM"):
        server.ensure_asr_model_can_load()


def test_asr_memory_guard_can_be_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    server = load_web_server_module()
    monkeypatch.setenv("SEE_MY_VOICE_ASR_MIN_AVAILABLE_MB", "0")

    server.ensure_asr_model_can_load()
