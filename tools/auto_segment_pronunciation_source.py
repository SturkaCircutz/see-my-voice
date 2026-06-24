from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path

import av
import numpy as np


DEFAULT_SOURCE = Path(r"C:\Users\21628\Desktop\6月17日 (4)(2).mp4")
DEFAULT_OUTPUT_DIR = Path("web/assets/pronunciation-clips/source-review")


def timestamp(seconds: float) -> str:
    seconds = max(float(seconds), 0.0)
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    rest = seconds - hours * 3600 - minutes * 60
    return f"{hours:02d}:{minutes:02d}:{rest:06.3f}"


def decode_audio(source: Path) -> tuple[np.ndarray, int]:
    chunks: list[np.ndarray] = []
    sample_rate = 0
    with av.open(str(source)) as container:
        audio_stream = next((stream for stream in container.streams if stream.type == "audio"), None)
        if audio_stream is None:
            raise ValueError(f"No audio stream found in {source}")
        sample_rate = audio_stream.codec_context.sample_rate or 44100
        for frame in container.decode(audio_stream):
            array = frame.to_ndarray()
            if array.ndim == 2:
                array = array.mean(axis=0)
            chunks.append(array.astype(np.float32))
    if not chunks:
        raise ValueError(f"No audio frames decoded from {source}")
    audio = np.concatenate(chunks)
    max_abs = float(np.max(np.abs(audio))) if audio.size else 1.0
    if max_abs > 0:
        audio = audio / max_abs
    return audio, sample_rate


def moving_average(values: np.ndarray, window: int) -> np.ndarray:
    if window <= 1:
        return values
    kernel = np.ones(window, dtype=np.float32) / window
    return np.convolve(values, kernel, mode="same")


def energy_segments(
    audio: np.ndarray,
    sample_rate: int,
    frame_ms: int,
    threshold_ratio: float,
    min_duration: float,
    merge_gap: float,
    pad: float,
) -> tuple[list[dict], dict]:
    frame_size = max(int(sample_rate * frame_ms / 1000), 1)
    frame_count = int(np.ceil(len(audio) / frame_size))
    padded = np.pad(audio, (0, frame_count * frame_size - len(audio)))
    frames = padded.reshape(frame_count, frame_size)
    rms = np.sqrt(np.mean(frames * frames, axis=1))
    smooth = moving_average(rms, max(int(120 / frame_ms), 1))
    noise_floor = float(np.percentile(smooth, 25))
    peak = float(np.percentile(smooth, 97))
    threshold = noise_floor + (peak - noise_floor) * threshold_ratio
    active = smooth >= threshold

    raw_segments = []
    start_index = None
    for index, is_active in enumerate(active):
        if is_active and start_index is None:
            start_index = index
        elif not is_active and start_index is not None:
            raw_segments.append((start_index * frame_size / sample_rate, index * frame_size / sample_rate))
            start_index = None
    if start_index is not None:
        raw_segments.append((start_index * frame_size / sample_rate, len(audio) / sample_rate))

    merged = []
    for start, end in raw_segments:
        if not merged or start - merged[-1][1] > merge_gap:
            merged.append([start, end])
        else:
            merged[-1][1] = end

    duration = len(audio) / sample_rate
    segments = []
    for start, end in merged:
        start = max(start - pad, 0.0)
        end = min(end + pad, duration)
        if end - start >= min_duration:
            segments.append({
                "start": round(start, 3),
                "end": round(end, 3),
                "duration": round(end - start, 3),
            })

    debug = {
        "sampleRate": sample_rate,
        "durationSeconds": round(duration, 3),
        "frameMs": frame_ms,
        "thresholdRatio": threshold_ratio,
        "noiseFloor": round(noise_floor, 6),
        "peak": round(peak, 6),
        "threshold": round(float(threshold), 6),
        "rawSegmentCount": len(raw_segments),
        "mergedSegmentCount": len(merged),
        "finalSegmentCount": len(segments),
    }
    return segments, debug


def write_outputs(output_dir: Path, source: Path, segments: list[dict], debug: dict) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / "auto_segments.json"
    csv_path = output_dir / "auto_segments.csv"
    payload = {
        "source": str(source),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "debug": debug,
        "segments": segments,
    }
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["unit", "type", "start", "end", "title", "notes"])
        writer.writeheader()
        for index, segment in enumerate(segments, start=1):
            writer.writerow({
                "unit": f"draft-{index:02d}",
                "type": "initial",
                "start": timestamp(segment["start"]),
                "end": timestamp(segment["end"]),
                "title": f"自动候选片段 {index:02d}",
                "notes": f"Auto-detected speech region, duration {segment['duration']}s. Replace unit/type after review.",
            })
    print(f"Wrote {len(segments)} draft segment(s)")
    print(f"CSV: {csv_path}")
    print(f"JSON: {json_path}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Draft source-video pronunciation segments from audio energy.")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--frame-ms", type=int, default=20)
    parser.add_argument("--threshold-ratio", type=float, default=0.24)
    parser.add_argument("--min-duration", type=float, default=0.35)
    parser.add_argument("--merge-gap", type=float, default=0.18)
    parser.add_argument("--pad", type=float, default=0.06)
    args = parser.parse_args()

    if not args.source.exists():
        raise FileNotFoundError(f"Source video not found: {args.source}")
    audio, sample_rate = decode_audio(args.source)
    segments, debug = energy_segments(
        audio=audio,
        sample_rate=sample_rate,
        frame_ms=args.frame_ms,
        threshold_ratio=args.threshold_ratio,
        min_duration=args.min_duration,
        merge_gap=args.merge_gap,
        pad=args.pad,
    )
    write_outputs(args.output_dir, args.source, segments, debug)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
