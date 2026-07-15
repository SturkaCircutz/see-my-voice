from __future__ import annotations

import json
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from stage1_pronunciation import SAMPLE_RATE, load_audio
from stage3a_labels import CTC_BLANK_TOKEN, text_to_stage3a_labels


DEFAULT_PHONE_CTC_MODEL_DIR = Path("models") / "mandarin_phone_ctc_xlsr_chinese_gpu"


@dataclass
class PhoneCtcBundle:
    model_dir: Path
    processor: Any
    model: Any
    id_to_phone_token: dict[int, str]
    device: str


_BUNDLE_LOCK = threading.Lock()
_BUNDLES: dict[tuple[str, str], PhoneCtcBundle] = {}


def expected_phone_tokens_for_text(text: str) -> list[str]:
    return text_to_stage3a_labels(text, use_tone_sandhi=True).phone_tokens


def resolve_device(device: str) -> str:
    requested = (device or "cpu").strip().lower()
    if requested != "auto":
        return requested
    import torch

    return "cuda" if torch.cuda.is_available() else "cpu"


def load_id_to_phone_token(model_dir: Path) -> dict[int, str]:
    path = model_dir / "id_to_phone_token.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    return {int(index): str(token) for index, token in data.items()}


def phone_ctc_model_is_loaded(model_dir: Path | str, device: str = "cpu") -> bool:
    resolved_dir = str(Path(model_dir).resolve())
    resolved_device = resolve_device(device)
    return (resolved_dir, resolved_device) in _BUNDLES


def load_phone_ctc_model(model_dir: Path | str, device: str = "cpu") -> PhoneCtcBundle:
    resolved_dir = Path(model_dir).resolve()
    resolved_device = resolve_device(device)
    key = (str(resolved_dir), resolved_device)

    with _BUNDLE_LOCK:
        if key in _BUNDLES:
            return _BUNDLES[key]

        if not resolved_dir.exists():
            raise FileNotFoundError(f"Phone CTC model directory does not exist: {resolved_dir}")

        from transformers import AutoFeatureExtractor, AutoModelForCTC, AutoProcessor

        try:
            processor = AutoProcessor.from_pretrained(resolved_dir)
        except (OSError, TypeError, ValueError):
            processor = AutoFeatureExtractor.from_pretrained(resolved_dir)

        load_kwargs: dict[str, Any] = {}
        try:
            model = AutoModelForCTC.from_pretrained(
                resolved_dir,
                low_cpu_mem_usage=True,
                **load_kwargs,
            )
        except ImportError:
            model = AutoModelForCTC.from_pretrained(resolved_dir, **load_kwargs)

        model.to(resolved_device)
        model.eval()
        bundle = PhoneCtcBundle(
            model_dir=resolved_dir,
            processor=processor,
            model=model,
            id_to_phone_token=load_id_to_phone_token(resolved_dir),
            device=resolved_device,
        )
        _BUNDLES[key] = bundle
        return bundle


def load_waveform(path: Path, max_audio_seconds: float = 6.0) -> np.ndarray:
    audio, sample_rate = load_audio(path, SAMPLE_RATE)
    if max_audio_seconds > 0:
        max_samples = int(max_audio_seconds * sample_rate)
        audio = audio[:max_samples]
    return audio.astype(np.float32)


def decode_ctc_ids(
    token_ids: list[int],
    id_to_phone_token: dict[int, str],
    blank_token: str = CTC_BLANK_TOKEN,
) -> list[str]:
    tokens: list[str] = []
    previous_id: int | None = None
    for token_id in token_ids:
        if token_id == previous_id:
            continue
        previous_id = token_id
        token = id_to_phone_token.get(token_id, "")
        if token and token != blank_token:
            tokens.append(token)
    return tokens


def predict_phone_tokens(
    audio_path: Path | str,
    model_dir: Path | str = DEFAULT_PHONE_CTC_MODEL_DIR,
    device: str = "cpu",
    max_audio_seconds: float = 6.0,
) -> dict[str, Any]:
    import torch

    bundle = load_phone_ctc_model(model_dir, device)
    waveform = load_waveform(Path(audio_path), max_audio_seconds=max_audio_seconds)
    inputs = bundle.processor(
        waveform,
        sampling_rate=SAMPLE_RATE,
        return_tensors="pt",
        padding=True,
    )
    model_inputs = {
        key: value.to(bundle.device)
        for key, value in inputs.items()
        if hasattr(value, "to")
    }

    with torch.no_grad():
        logits = bundle.model(**model_inputs).logits
    token_ids = torch.argmax(logits, dim=-1)[0].detach().cpu().tolist()
    tokens = decode_ctc_ids(token_ids, bundle.id_to_phone_token)
    return {
        "tokens": tokens,
        "token_text": " ".join(tokens),
        "frame_token_ids": token_ids,
        "model_dir": str(bundle.model_dir),
        "device": bundle.device,
    }


def edit_distance(left: list[str], right: list[str]) -> int:
    if not left:
        return len(right)
    if not right:
        return len(left)

    previous = list(range(len(right) + 1))
    for left_index, left_token in enumerate(left, start=1):
        current = [left_index]
        for right_index, right_token in enumerate(right, start=1):
            substitution_cost = 0 if left_token == right_token else 1
            current.append(
                min(
                    previous[right_index] + 1,
                    current[right_index - 1] + 1,
                    previous[right_index - 1] + substitution_cost,
                )
            )
        previous = current
    return previous[-1]


def compare_phone_tokens(expected: list[str], predicted: list[str]) -> dict[str, Any]:
    distance = edit_distance(expected, predicted)
    if expected:
        token_accuracy = max(0.0, 1.0 - distance / len(expected)) * 100.0
    else:
        token_accuracy = 100.0 if not predicted else 0.0
    return {
        "edit_distance": distance,
        "token_accuracy": round(token_accuracy, 1),
        "exact_match": expected == predicted,
    }


def analyze_phone_ctc(
    target_text: str,
    audio_path: Path | str,
    model_dir: Path | str = DEFAULT_PHONE_CTC_MODEL_DIR,
    device: str = "cpu",
    max_audio_seconds: float = 6.0,
) -> dict[str, Any]:
    expected_tokens = expected_phone_tokens_for_text(target_text)
    prediction = predict_phone_tokens(
        audio_path,
        model_dir=model_dir,
        device=device,
        max_audio_seconds=max_audio_seconds,
    )
    predicted_tokens = prediction["tokens"]
    comparison = compare_phone_tokens(expected_tokens, predicted_tokens)
    expected_count = len(expected_tokens)
    matched_estimate = max(0, expected_count - comparison["edit_distance"])

    return {
        "enabled": True,
        "model_dir": prediction["model_dir"],
        "device": prediction["device"],
        "target_text": target_text,
        "expected_tokens": expected_tokens,
        "predicted_tokens": predicted_tokens,
        "expected_text": " ".join(expected_tokens),
        "predicted_text": prediction["token_text"],
        "edit_distance": comparison["edit_distance"],
        "token_accuracy": comparison["token_accuracy"],
        "exact_match": comparison["exact_match"],
        "summary": (
            f"Phone-token CTC matched about {matched_estimate}/{expected_count} target token(s)."
            if expected_count
            else "No target phone tokens were generated for this text."
        ),
    }
