from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import dataclass
from math import gcd
from pathlib import Path
from typing import Any

import numpy as np

os.environ.setdefault("MPLCONFIGDIR", str(Path.cwd() / ".matplotlib_cache"))
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from pypinyin import Style, lazy_pinyin
import soundfile as sf
from scipy.signal import resample_poly


SAMPLE_RATE = 16_000
HOP_LENGTH = 160
MIN_RECORDING_PEAK = 1e-5
MIN_RECORDING_RMS = 1e-7

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


def recording_signal_stats(path: Path) -> dict[str, float]:
    """Measure decoded audio before normalization so silence is not scored as speech."""
    audio, sr = read_audio_file(path)
    mono = np.mean(audio, axis=1)
    finite = mono[np.isfinite(mono)]
    duration = len(mono) / sr if sr else 0.0

    if len(finite) == 0:
        return {
            "duration_seconds": duration,
            "peak": 0.0,
            "rms": 0.0,
        }

    return {
        "duration_seconds": duration,
        "peak": float(np.max(np.abs(finite))),
        "rms": float(np.sqrt(np.mean(finite.astype(float) ** 2))),
    }


def ensure_recording_has_voice(path: Path) -> dict[str, float]:
    """Reject empty or muted recordings before producing misleading zero scores."""
    stats = recording_signal_stats(path)
    if stats["peak"] < MIN_RECORDING_PEAK or stats["rms"] < MIN_RECORDING_RMS:
        raise ValueError(
            "No voice was detected in this recording. Check that the microphone is not muted, "
            "then record again while speaking clearly."
        )
    return stats


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


def frame_rms(audio: np.ndarray, frame_length: int = 1024, hop_length: int = HOP_LENGTH) -> np.ndarray:
    """Compute frame energy for simple speech-region detection."""
    if len(audio) < frame_length:
        audio = np.pad(audio, (0, frame_length - len(audio)))
    n_frames = 1 + max(0, (len(audio) - frame_length) // hop_length)
    rms = np.zeros(n_frames, dtype=float)
    for frame_idx in range(n_frames):
        start = frame_idx * hop_length
        frame = audio[start : start + frame_length]
        if len(frame) < frame_length:
            frame = np.pad(frame, (0, frame_length - len(frame)))
        rms[frame_idx] = float(np.sqrt(np.mean(frame.astype(float) ** 2)))
    return rms


def frame_times(n_frames: int, sr: int, hop_length: int = HOP_LENGTH) -> np.ndarray:
    """Return the timestamp for each short audio frame.

    Beginner note: most audio features are not calculated for every single
    sample. We look at small overlapping chunks called frames. This helper says
    where each frame starts in seconds.
    """
    return np.arange(n_frames) * hop_length / sr


def smooth_curve(values: np.ndarray, window_size: int = 9) -> np.ndarray:
    """Smooth a curve so tiny bumps do not confuse boundary detection."""
    values = np.asarray(values, dtype=float)
    if len(values) == 0:
        return values

    # Use an odd window size so the current point stays in the middle.
    window_size = max(1, min(window_size, len(values)))
    if window_size % 2 == 0:
        window_size -= 1
    if window_size <= 1:
        return values.copy()

    half = window_size // 2
    padded = np.pad(values, (half, half), mode="edge")
    kernel = np.ones(window_size, dtype=float) / window_size
    return np.convolve(padded, kernel, mode="valid")


def detect_speech_region(
    audio: np.ndarray,
    sr: int,
    frame_length: int = 1024,
    hop_length: int = HOP_LENGTH,
    padding_seconds: float = 0.08,
) -> dict[str, Any]:
    """Find the active speech region using a conservative energy threshold."""
    duration = len(audio) / sr if sr else 0.0
    if len(audio) == 0 or sr <= 0:
        return {
            "start": 0.0,
            "end": 0.0,
            "duration": 0.0,
            "method": "energy_threshold",
            "confidence": "low",
            "reason": "Audio is empty.",
        }

    rms = frame_rms(audio, frame_length=frame_length, hop_length=hop_length)
    if len(rms) == 0 or float(np.max(rms)) <= 1e-8:
        return {
            "start": 0.0,
            "end": duration,
            "duration": duration,
            "method": "energy_threshold",
            "confidence": "low",
            "reason": "No clear speech energy was detected.",
        }

    noise_floor = float(np.percentile(rms, 20))
    peak = float(np.max(rms))
    threshold = max(noise_floor * 2.5, peak * 0.08, 1e-4)
    active = np.flatnonzero(rms >= threshold)
    if len(active) == 0:
        return {
            "start": 0.0,
            "end": duration,
            "duration": duration,
            "method": "energy_threshold",
            "confidence": "low",
            "threshold": threshold,
            "reason": "Energy threshold found no active frames.",
        }

    pad = int(round(padding_seconds * sr))
    start_sample = max(0, int(active[0] * hop_length) - pad)
    end_sample = min(len(audio), int(active[-1] * hop_length + frame_length) + pad)
    start = start_sample / sr
    end = end_sample / sr
    confidence = "medium" if (end - start) < duration * 0.95 else "low"

    return {
        "start": start,
        "end": end,
        "duration": end - start,
        "method": "energy_threshold",
        "confidence": confidence,
        "threshold": threshold,
        "noise_floor": noise_floor,
        "peak_rms": peak,
    }


def syllable_windows_in_region(
    start: float, end: float, n_syllables: int
) -> list[tuple[float, float]]:
    """Stage 1.5 approximation: divide detected speech region evenly."""
    if n_syllables <= 0:
        return []
    if end <= start:
        end = start
    edges = np.linspace(start, end, n_syllables + 1)
    return [(float(edges[i]), float(edges[i + 1])) for i in range(n_syllables)]


def windows_to_dicts(windows: list[tuple[float, float]]) -> list[dict[str, float]]:
    """Convert Python tuples into JSON-friendly dictionaries."""
    return [{"start": float(start), "end": float(end)} for start, end in windows]


def boundary_confidence_from_energy(
    candidate_energy: np.ndarray,
    best_index: int | None,
    source: str,
) -> dict[str, Any]:
    """Explain how trustworthy one Stage 2A boundary is.

    Beginner note: a good syllable boundary usually sits in a clear energy dip.
    If the quietest point is much lower than nearby speech energy, we trust it
    more. If the curve is flat, the boundary is more of a guess.
    """
    if source != "energy_valley" or best_index is None or len(candidate_energy) == 0:
        return {
            "confidence": "low",
            "reason": "No usable energy search window; used fallback timing.",
            "valley_energy": None,
            "local_median_energy": None,
            "energy_contrast": None,
        }

    valley_energy = float(candidate_energy[best_index])
    local_median = float(np.median(candidate_energy))
    local_peak = float(np.max(candidate_energy))
    energy_contrast = local_median - valley_energy

    if valley_energy <= 0.20 and energy_contrast >= 0.18:
        confidence = "high"
        reason = "Clear low-energy valley found between syllables."
    elif valley_energy <= 0.35 and energy_contrast >= 0.08:
        confidence = "medium"
        reason = "Some energy dip found, but the boundary is approximate."
    else:
        confidence = "low"
        reason = "Energy dip is weak; boundary may be close to an equal split guess."

    return {
        "confidence": confidence,
        "reason": reason,
        "valley_energy": valley_energy,
        "local_median_energy": local_median,
        "local_peak_energy": local_peak,
        "energy_contrast": float(energy_contrast),
    }


def summarize_boundary_confidence(boundary_details: list[dict[str, Any]]) -> dict[str, Any]:
    """Summarize all boundary confidences into one phrase for the whole phrase."""
    if not boundary_details:
        return {
            "overall_confidence": "low",
            "reason": "No internal syllable boundaries were estimated.",
        }

    levels = [detail["confidence"] for detail in boundary_details]
    if all(level == "high" for level in levels):
        return {
            "overall_confidence": "high",
            "reason": "All estimated boundaries have clear energy valleys.",
        }
    if any(level == "low" for level in levels):
        return {
            "overall_confidence": "low",
            "reason": "At least one boundary has a weak or unclear energy valley.",
        }
    return {
        "overall_confidence": "medium",
        "reason": "Boundaries are usable, but at least one is still approximate.",
    }


def lower_confidence(confidence: str) -> str:
    """Move confidence down one level."""
    if confidence == "high":
        return "medium"
    if confidence == "medium":
        return "low"
    return "low"


def add_duration_sanity_to_boundaries(
    boundary_details: list[dict[str, Any]],
    boundaries: list[float],
    equal_edges: np.ndarray,
    average_syllable_duration: float,
) -> None:
    """Downgrade boundary confidence when the resulting syllable timing looks odd.

    Beginner note: a real boundary should not create one very long syllable and
    one very short syllable unless there is a clear reason. This check catches
    cases like a boundary landing too early even though there is some energy dip.
    """
    if not boundary_details or average_syllable_duration <= 0:
        return

    min_reasonable = max(0.20, average_syllable_duration * 0.55)
    max_reasonable = average_syllable_duration * 1.45
    max_shift = average_syllable_duration * 0.28

    for detail_index, detail in enumerate(boundary_details):
        left_duration = boundaries[detail_index + 1] - boundaries[detail_index]
        right_duration = boundaries[detail_index + 2] - boundaries[detail_index + 1]
        duration_ratio = max(left_duration, right_duration) / max(
            min(left_duration, right_duration), 1e-6
        )
        shift = abs(float(detail["boundary"]) - float(equal_edges[detail_index + 1]))

        warnings = []
        if left_duration < min_reasonable or right_duration < min_reasonable:
            warnings.append("one neighboring syllable window is unusually short")
        if left_duration > max_reasonable or right_duration > max_reasonable:
            warnings.append("one neighboring syllable window is unusually long")
        if duration_ratio >= 1.45:
            warnings.append("neighboring syllable durations are unbalanced")
        if shift > max_shift:
            warnings.append("boundary shifted far from equal-split timing")

        detail["left_duration"] = float(left_duration)
        detail["right_duration"] = float(right_duration)
        detail["duration_ratio"] = float(duration_ratio)
        detail["duration_warnings"] = warnings

        if warnings:
            detail["confidence"] = lower_confidence(str(detail["confidence"]))
            detail["reason"] = (
                f'{detail["reason"]} Duration check: {"; ".join(warnings)}.'
            )


def syllable_windows_by_energy_valleys(
    audio: np.ndarray,
    sr: int,
    speech_region: dict[str, Any],
    n_syllables: int,
    frame_length: int = 1024,
    hop_length: int = HOP_LENGTH,
) -> tuple[list[tuple[float, float]], dict[str, Any], dict[str, np.ndarray]]:
    """Stage 2A: estimate syllable windows by searching for low-energy valleys.

    Beginner note: speech often gets a little quieter between syllables. Those
    quiet dips are not perfect boundaries, but they are better than always
    splitting the phrase into equal-length pieces.
    """
    start = float(speech_region["start"])
    end = float(speech_region["end"])
    equal_windows = syllable_windows_in_region(start, end, n_syllables)

    rms = frame_rms(audio, frame_length=frame_length, hop_length=hop_length)
    times = frame_times(len(rms), sr, hop_length=hop_length)
    smoothed = smooth_curve(rms)
    peak = float(np.max(smoothed)) if len(smoothed) else 0.0
    normalized = smoothed / peak if peak > 1e-8 else smoothed

    energy_debug = {
        "times": times,
        "rms": rms,
        "smoothed": smoothed,
        "normalized": normalized,
    }

    if n_syllables <= 1 or end <= start:
        timing = {
            "method": "stage_2a_energy_valleys",
            "confidence": "low",
            "reason": "Need at least two syllables to search for a boundary.",
            "confidence_reason": "No internal syllable boundaries were estimated.",
            "equal_windows": windows_to_dicts(equal_windows),
            "detected_boundaries": [start, end],
            "boundary_details": [],
        }
        return equal_windows, timing, energy_debug

    speech_duration = end - start
    equal_edges = np.linspace(start, end, n_syllables + 1)

    # This prevents one syllable from becoming unrealistically tiny.
    average_syllable_duration = speech_duration / n_syllables
    min_syllable_duration = min(0.18, average_syllable_duration * 0.45)

    # Around each equal-split boundary, search nearby for the quietest point.
    search_radius = max(0.08, average_syllable_duration * 0.45)
    boundaries = [start]
    boundary_details = []

    for boundary_index in range(1, n_syllables):
        equal_boundary = float(equal_edges[boundary_index])
        earliest = boundaries[-1] + min_syllable_duration
        latest = end - (n_syllables - boundary_index) * min_syllable_duration
        search_start = max(equal_boundary - search_radius, earliest)
        search_end = min(equal_boundary + search_radius, latest)

        # Pick the lowest-energy frame inside the search window.
        search_mask = (times >= search_start) & (times <= search_end)
        if np.any(search_mask):
            candidate_times = times[search_mask]
            candidate_energy = normalized[search_mask]
            best_index = int(np.argmin(candidate_energy))
            boundary = float(candidate_times[best_index])
            source = "energy_valley"
            confidence = boundary_confidence_from_energy(candidate_energy, best_index, source)
        else:
            # Fallback: if the search window is empty, keep the old equal split.
            boundary = equal_boundary
            source = "equal_split_fallback"
            confidence = boundary_confidence_from_energy(np.array([]), None, source)

        boundaries.append(boundary)
        boundary_details.append(
            {
                "after_syllable_index": boundary_index - 1,
                "boundary": boundary,
                "equal_boundary": equal_boundary,
                "shift_from_equal_seconds": boundary - equal_boundary,
                "search_start": search_start,
                "search_end": search_end,
                "source": source,
                **confidence,
            }
        )

    boundaries.append(end)
    windows = [
        (float(boundaries[i]), float(boundaries[i + 1]))
        for i in range(len(boundaries) - 1)
    ]
    add_duration_sanity_to_boundaries(
        boundary_details, boundaries, equal_edges, average_syllable_duration
    )
    used_energy = any(detail["source"] == "energy_valley" for detail in boundary_details)
    confidence_summary = summarize_boundary_confidence(boundary_details)
    timing = {
        "method": "stage_2a_energy_valleys",
        "confidence": confidence_summary["overall_confidence"] if used_energy else "low",
        "reason": "Uses low-energy valleys near equal-split boundaries; still not forced alignment.",
        "confidence_reason": confidence_summary["reason"],
        "search_radius_seconds": search_radius,
        "min_syllable_duration_seconds": min_syllable_duration,
        "equal_windows": windows_to_dicts(equal_windows),
        "detected_boundaries": [float(boundary) for boundary in boundaries],
        "boundary_details": boundary_details,
    }
    return windows, timing, energy_debug


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


def plot_stage15_results(
    result: dict[str, Any],
    f0_times: np.ndarray,
    f0: np.ndarray,
    energy_debug: dict[str, np.ndarray],
    output_dir: Path,
) -> dict[str, Any]:
    """Save pitch, energy, and per-syllable tone plots for visual feedback."""
    output_dir.mkdir(parents=True, exist_ok=True)

    speech_region = result["speech_region"]
    pitch_plot = output_dir / "pitch_overview.png"
    fig, (pitch_ax, energy_ax) = plt.subplots(2, 1, figsize=(10, 6), sharex=True)

    pitch_ax.plot(f0_times, f0, marker=".", linewidth=1, markersize=3, label="User F0")
    pitch_ax.axvspan(
        speech_region["start"],
        speech_region["end"],
        color="#cce8ff",
        alpha=0.35,
        label="Detected speech region",
    )

    # Gray dotted lines show the old Stage 1.5 equal split. Blue solid lines
    # show the new Stage 2A energy-valley split used for scoring.
    for equal_window in result["syllable_timing"]["equal_windows"]:
        pitch_ax.axvline(equal_window["start"], color="#bbbbbb", linestyle=":", linewidth=0.8)
    for syllable in result["syllables"]:
        start = syllable["window"]["start"]
        end = syllable["window"]["end"]
        pitch_ax.axvline(start, color="#2563eb", linestyle="--", linewidth=1.1)
        pitch_ax.text(
            (start + end) / 2,
            0.98,
            syllable["pinyin"],
            transform=pitch_ax.get_xaxis_transform(),
            ha="center",
            va="top",
            fontsize=10,
        )
    if result["syllables"]:
        pitch_ax.axvline(
            result["syllables"][-1]["window"]["end"],
            color="#2563eb",
            linestyle="--",
            linewidth=1.1,
        )
    pitch_ax.set_title(f'Pitch overview: {" ".join(result["pinyin"])}')
    pitch_ax.set_ylabel("F0 (Hz)")
    pitch_ax.grid(True, alpha=0.25)
    pitch_ax.legend(loc="best")

    energy_ax.plot(
        energy_debug["times"],
        energy_debug["normalized"],
        color="#111827",
        linewidth=1.5,
        label="Smoothed energy",
    )
    energy_ax.axvspan(
        speech_region["start"],
        speech_region["end"],
        color="#cce8ff",
        alpha=0.35,
    )
    for equal_window in result["syllable_timing"]["equal_windows"]:
        energy_ax.axvline(equal_window["start"], color="#bbbbbb", linestyle=":", linewidth=0.8)
    for boundary in result["syllable_timing"]["detected_boundaries"]:
        energy_ax.axvline(boundary, color="#2563eb", linestyle="--", linewidth=1.1)
    energy_ax.set_title("Stage 2A timing: energy valleys")
    energy_ax.set_xlabel("Time (seconds)")
    energy_ax.set_ylabel("Energy")
    energy_ax.set_ylim(bottom=0)
    energy_ax.grid(True, alpha=0.25)
    energy_ax.legend(loc="best")

    fig.tight_layout()
    fig.savefig(pitch_plot, dpi=160)
    plt.close(fig)

    syllable_plots = []
    for syllable in result["syllables"]:
        tone_result = syllable["tone_result"]
        contour = tone_result.get("contour")
        template = tone_result.get("template")
        if contour is None or template is None:
            continue
        plot_path = output_dir / f"syllable_{syllable['index']}_{syllable['pinyin']}.png"
        plt.figure(figsize=(6, 4))
        plt.plot(contour, label="Your pitch shape", linewidth=2)
        plt.plot(template, label=f"Tone {syllable['tone']} target", linewidth=2)
        plt.title(f"{syllable['pinyin']} - tone score {syllable['scores']['tone']}")
        plt.xlabel("Normalized time")
        plt.ylabel("Normalized pitch shape")
        plt.grid(True, alpha=0.25)
        plt.legend(loc="best")
        plt.tight_layout()
        plt.savefig(plot_path, dpi=160)
        plt.close()
        syllable_plots.append(
            {
                "index": syllable["index"],
                "pinyin": syllable["pinyin"],
                "path": str(plot_path),
            }
        )

    return {
        "pitch_overview": str(pitch_plot),
        "syllables": syllable_plots,
    }


def analyze_pronunciation_stage1(
    text: str, audio_path: Path, plot_dir: Path | None = None
) -> dict[str, Any]:
    """Run Stage 2A: tone scoring with simple energy-valley syllable timing."""
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    syllable_parts = text_to_syllable_parts(text)
    signal_stats = ensure_recording_has_voice(audio_path)
    audio, sr = load_audio(audio_path)
    duration = len(audio) / sr if sr else 0.0
    f0_times, f0, voiced_prob = estimate_f0(audio, sr)
    speech_region = detect_speech_region(audio, sr)
    windows, syllable_timing, energy_debug = syllable_windows_by_energy_valleys(
        audio, sr, speech_region, len(syllable_parts)
    )

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

    result = {
        "stage": "stage_2a_energy_valley_timing",
        "text": text,
        "pinyin": [part.pinyin for part in syllable_parts],
        "audio": {
            "path": str(audio_path),
            "sample_rate": sr,
            "duration_seconds": duration,
            "input_peak": signal_stats["peak"],
            "input_rms": signal_stats["rms"],
            "voiced_f0_frames": voiced_frames,
            "total_f0_frames": int(len(f0)),
            "mean_voicing_probability": float(np.nanmean(voiced_prob))
            if len(voiced_prob)
            else None,
        },
        "speech_region": speech_region,
        "syllable_timing": syllable_timing,
        "overall_score": overall_score,
        "syllables": syllables,
        "plots": None,
        "notes": [
            "Stage 2A scores Mandarin tone shape from pitch/F0 and uses simple energy valleys for syllable timing.",
            "Energy-valley timing is better than equal splitting, but it is still not real forced alignment.",
            "Initial and final scores are placeholders for a later CTC/GOP stage.",
        ],
    }
    if plot_dir is not None:
        result["plots"] = plot_stage15_results(result, f0_times, f0, energy_debug, plot_dir)

    return result


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
    parser.add_argument(
        "--plot-dir",
        type=Path,
        default=Path("stage1_plots"),
        help="Where to save Stage 1.5 pitch visualizations.",
    )
    args = parser.parse_args()

    result = analyze_pronunciation_stage1(args.text, args.audio, plot_dir=args.plot_dir)
    save_json(result, args.output)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"\nSaved feedback JSON to: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
