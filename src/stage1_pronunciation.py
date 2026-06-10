from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from math import gcd
from pathlib import Path
from typing import Any

import numpy as np
from pypinyin import Style, lazy_pinyin
import soundfile as sf
from scipy.signal import resample_poly


SAMPLE_RATE = 16_000
HOP_LENGTH = 160

MANDARIN_INITIALS = [
    "zh",
    "ch",
    "sh",
    "b",
    "p",
    "m",
    "f",
    "d",
    "t",
    "n",
    "l",
    "g",
    "k",
    "h",
    "j",
    "q",
    "x",
    "r",
    "z",
    "c",
    "s",
    "y",
    "w",
]


@dataclass
class SyllablePart:
    index: int
    char: str
    pinyin: str
    initial: str
    final: str
    tone: str


def text_to_pinyin(text: str, use_tone_sandhi: bool = True) -> list[str]:
    """Convert Chinese text to pinyin with tone numbers, e.g. 你好 -> ni2 hao3."""
    return lazy_pinyin(
        text,
        style=Style.TONE3,
        tone_sandhi=use_tone_sandhi,
        neutral_tone_with_five=True,
        errors="ignore",
    )


def split_pinyin_syllable(index: int, char: str, syllable: str) -> SyllablePart:
    """Split one pinyin syllable into initial, final, and tone."""
    normalized = syllable.lower().replace("u:", "v")
    match = re.search(r"([1-5])$", normalized)
    tone = match.group(1) if match else "5"
    base = re.sub(r"[1-5]$", "", normalized)

    for initial in MANDARIN_INITIALS:
        if base.startswith(initial):
            return SyllablePart(
                index=index,
                char=char,
                pinyin=syllable,
                initial=initial,
                final=base[len(initial) :],
                tone=tone,
            )

    return SyllablePart(
        index=index,
        char=char,
        pinyin=syllable,
        initial="",
        final=base,
        tone=tone,
    )


def text_to_syllable_parts(text: str) -> list[SyllablePart]:
    pinyin = text_to_pinyin(text)
    chars = [char for char in text if "\u4e00" <= char <= "\u9fff"]
    return [
        split_pinyin_syllable(i, chars[i] if i < len(chars) else "", syllable)
        for i, syllable in enumerate(pinyin)
    ]


def read_audio_file(path: Path) -> tuple[np.ndarray, int]:
    """Read audio directly, with a PyAV fallback for m4a/aac/mp3 files."""
    try:
        return sf.read(path, dtype="float32", always_2d=True)
    except Exception:
        if path.suffix.lower() not in {".m4a", ".aac", ".mp3", ".caf"}:
            raise

        try:
            import av
        except ImportError as exc:
            raise RuntimeError(
                "Reading compressed audio such as .m4a requires PyAV. "
                "Install it with: python3 -m pip install av"
            ) from exc

        container = av.open(str(path))
        stream = next((s for s in container.streams if s.type == "audio"), None)
        if stream is None:
            raise RuntimeError(f"No audio stream found in {path}")

        chunks = []
        sample_rate = int(stream.rate or 0)
        for frame in container.decode(stream):
            sample_rate = int(frame.sample_rate or sample_rate)
            frame_array = frame.to_ndarray()
            if frame_array.ndim == 1:
                frame_array = frame_array[:, None]
            else:
                frame_array = frame_array.T
            chunks.append(frame_array.astype(np.float32))

        container.close()
        if not chunks or sample_rate <= 0:
            raise RuntimeError(f"Could not decode audio samples from {path}")

        audio = np.concatenate(chunks, axis=0)
        max_abs = float(np.max(np.abs(audio))) if len(audio) else 0.0
        if max_abs > 1.0:
            audio = audio / max_abs
        return audio, sample_rate


def load_audio(path: Path, sample_rate: int = SAMPLE_RATE) -> tuple[np.ndarray, int]:
    """Load an audio file, convert to mono, resample, and normalize to [-1, 1]."""
    audio, sr = read_audio_file(path)
    audio = np.mean(audio, axis=1)
    if sr != sample_rate:
        divisor = gcd(sr, sample_rate)
        audio = resample_poly(audio, sample_rate // divisor, sr // divisor)
        sr = sample_rate
    peak = float(np.max(np.abs(audio))) if len(audio) else 0.0
    if peak > 0:
        audio = audio / peak
    return audio.astype(np.float32), sr


def estimate_f0(audio: np.ndarray, sr: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Estimate pitch/F0 with a simple autocorrelation tracker.

    This is intentionally lightweight for Stage 1. It avoids heavy pitch-tracking
    dependencies and is good enough to compare broad Mandarin tone shapes.
    """
    frame_length = 1024
    fmin = 60
    fmax = 500
    min_lag = max(1, int(sr / fmax))
    max_lag = min(frame_length - 1, int(sr / fmin))

    if len(audio) < frame_length:
        pad = frame_length - len(audio)
        audio = np.pad(audio, (0, pad))

    n_frames = 1 + max(0, (len(audio) - frame_length) // HOP_LENGTH)
    f0 = np.full(n_frames, np.nan, dtype=float)
    voiced_prob = np.zeros(n_frames, dtype=float)
    window = np.hanning(frame_length)

    for frame_idx in range(n_frames):
        start = frame_idx * HOP_LENGTH
        frame = audio[start : start + frame_length]
        if len(frame) < frame_length:
            frame = np.pad(frame, (0, frame_length - len(frame)))

        frame = frame.astype(float)
        frame = frame - np.mean(frame)
        energy = float(np.sqrt(np.mean(frame * frame)))
        if energy < 1e-4:
            continue

        frame = frame * window
        corr = np.correlate(frame, frame, mode="full")[frame_length - 1 :]
        if corr[0] <= 1e-8:
            continue

        search = corr[min_lag : max_lag + 1]
        if len(search) == 0:
            continue

        best_lag = int(np.argmax(search)) + min_lag
        confidence = float(corr[best_lag] / corr[0])
        voiced_prob[frame_idx] = max(0.0, min(1.0, confidence))
        if confidence >= 0.25:
            f0[frame_idx] = sr / best_lag

    times = np.arange(n_frames) * HOP_LENGTH / sr
    return times, f0, voiced_prob


def naive_syllable_windows(total_duration: float, n_syllables: int) -> list[tuple[float, float]]:
    """Stage 1 approximation: divide speech duration evenly across syllables."""
    if n_syllables <= 0:
        return []
    edges = np.linspace(0.0, total_duration, n_syllables + 1)
    return [(float(edges[i]), float(edges[i + 1])) for i in range(n_syllables)]


def simple_dtw_distance(a: np.ndarray, b: np.ndarray) -> float:
    """Small DTW implementation for 1D contours."""
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    n, m = len(a), len(b)
    if n == 0 or m == 0:
        return float("inf")

    dp = np.full((n + 1, m + 1), np.inf)
    dp[0, 0] = 0.0

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = abs(a[i - 1] - b[j - 1])
            dp[i, j] = cost + min(dp[i - 1, j], dp[i, j - 1], dp[i - 1, j - 1])

    return float(dp[n, m] / (n + m))


def resample_curve(values: np.ndarray, n: int = 50) -> np.ndarray:
    values = np.asarray(values, dtype=float)
    x_old = np.linspace(0.0, 1.0, len(values))
    x_new = np.linspace(0.0, 1.0, n)
    return np.interp(x_new, x_old, values)


def normalize_f0_shape(f0_values: np.ndarray, n: int = 50) -> np.ndarray | None:
    values = np.asarray(f0_values, dtype=float)
    values = values[np.isfinite(values)]
    values = values[values > 0]
    if len(values) < 4:
        return None

    # Log pitch makes male/female/high/low voices more comparable.
    values = np.log2(values)
    values = resample_curve(values, n=n)
    values = values - np.nanmedian(values)
    scale = np.nanstd(values)
    if scale > 1e-6:
        values = values / scale
    return values


def tone_template(tone: str, n: int = 50) -> np.ndarray:
    """Simple idealized Mandarin tone-shape templates."""
    x = np.linspace(0.0, 1.0, n)
    if tone == "1":
        y = np.zeros(n)
    elif tone == "2":
        y = -0.9 + 1.8 * x
    elif tone == "3":
        y = np.where(
            x < 0.55,
            0.3 - 1.4 * (x / 0.55),
            -1.1 + 1.0 * ((x - 0.55) / 0.45),
        )
    elif tone == "4":
        y = 1.0 - 2.0 * x
    else:
        y = np.zeros(n)

    y = y - np.median(y)
    scale = np.std(y)
    if scale > 1e-6:
        y = y / scale
    return y


def score_tone_from_f0(f0_segment: np.ndarray, expected_tone: str) -> dict[str, Any]:
    contour = normalize_f0_shape(f0_segment)
    template = tone_template(expected_tone)
    if contour is None:
        return {
            "score": 0,
            "confidence": "low",
            "reason": "Too little voiced pitch was detected.",
            "distance": None,
            "contour": None,
            "template": template.tolist(),
        }

    template = tone_template(expected_tone, n=len(contour))
    distance = simple_dtw_distance(contour, template)
    score = int(round(np.clip(100 * (1.0 - distance / 1.4), 0, 100)))
    return {
        "score": score,
        "confidence": "medium",
        "distance": distance,
        "contour": contour.tolist(),
        "template": template.tolist(),
    }


def f0_values_in_window(
    f0_times: np.ndarray, f0: np.ndarray, start: float, end: float
) -> np.ndarray:
    mask = (f0_times >= start) & (f0_times <= end)
    return f0[mask]


def tone_feedback_text(tone: str, score: int | None) -> str:
    if score is None:
        return "Add a recording to score this syllable."
    if score >= 80:
        return "Tone shape looks close."
    if tone == "1":
        return "Try keeping the pitch flatter and steadier."
    if tone == "2":
        return "Try making the pitch rise more clearly."
    if tone == "3":
        return "Try making the pitch lower in the middle."
    if tone == "4":
        return "Try making the pitch fall more clearly."
    return "Try making the neutral tone shorter and lighter."


def analyze_pronunciation_stage1(text: str, audio_path: Path) -> dict[str, Any]:
    """Run Stage 1: pinyin parsing + naive syllable windows + tone scoring."""
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    syllable_parts = text_to_syllable_parts(text)
    audio, sr = load_audio(audio_path)
    duration = len(audio) / sr if sr else 0.0
    f0_times, f0, voiced_prob = estimate_f0(audio, sr)
    windows = naive_syllable_windows(duration, len(syllable_parts))

    syllables = []
    for part, (start, end) in zip(syllable_parts, windows):
        segment_f0 = f0_values_in_window(f0_times, f0, start, end)
        tone_result = score_tone_from_f0(segment_f0, part.tone)
        tone_score = int(tone_result["score"])

        initial_score = None
        final_score = None
        available_scores = [tone_score]
        syllable_score = int(round(float(np.mean(available_scores))))

        syllables.append(
            {
                "index": part.index,
                "char": part.char,
                "pinyin": part.pinyin,
                "initial": part.initial,
                "final": part.final,
                "tone": part.tone,
                "window": {"start": start, "end": end},
                "scores": {
                    "initial": initial_score,
                    "final": final_score,
                    "tone": tone_score,
                    "syllable": syllable_score,
                },
                "feedback": tone_feedback_text(part.tone, tone_score),
                "tone_result": tone_result,
            }
        )

    syllable_scores = [item["scores"]["syllable"] for item in syllables]
    overall_score = int(round(float(np.mean(syllable_scores)))) if syllable_scores else None
    voiced_frames = int(np.sum(np.isfinite(f0)))

    return {
        "stage": "stage_1_tone_mvp",
        "text": text,
        "pinyin": [part.pinyin for part in syllable_parts],
        "audio": {
            "path": str(audio_path),
            "sample_rate": sr,
            "duration_seconds": duration,
            "voiced_f0_frames": voiced_frames,
            "total_f0_frames": int(len(f0)),
            "mean_voicing_probability": float(np.nanmean(voiced_prob))
            if len(voiced_prob)
            else None,
        },
        "overall_score": overall_score,
        "syllables": syllables,
        "notes": [
            "Stage 1 scores only Mandarin tone shape from pitch/F0.",
            "Syllable timing uses equal-length windows, not real forced alignment yet.",
            "Initial and final scores are placeholders for a later CTC/GOP stage.",
        ],
    }


def save_json(data: dict[str, Any], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Stage 1 Mandarin pronunciation tone scorer.")
    parser.add_argument("--text", required=True, help='Target Chinese text, e.g. "你好".')
    parser.add_argument("--audio", required=True, type=Path, help="Path to a user recording.")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("stage1_feedback.json"),
        help="Where to save the feedback JSON.",
    )
    args = parser.parse_args()

    result = analyze_pronunciation_stage1(args.text, args.audio)
    save_json(result, args.output)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"\nSaved feedback JSON to: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
