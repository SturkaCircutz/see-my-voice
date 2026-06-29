from __future__ import annotations

import argparse
import csv
import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_SOURCE = Path(r"C:\Users\21628\Desktop\6月17日 (4)(2).mp4")
DEFAULT_SEGMENTS = Path("tools/pronunciation_clip_segments.csv")
DEFAULT_OUTPUT_DIR = Path("web/assets/pronunciation-clips")


def parse_timestamp(value: str) -> float:
    parts = value.strip().split(":")
    if len(parts) != 3:
        raise ValueError(f"Invalid timestamp {value!r}; expected HH:MM:SS.mmm")
    hours, minutes, seconds = parts
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def load_segments(path: Path) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(
            line for line in handle if line.strip() and not line.lstrip().startswith("#")
        )
        for index, row in enumerate(reader, start=2):
            unit = (row.get("unit") or "").strip().lower().replace("ü", "v").replace("u:", "v")
            clip_type = (row.get("type") or "").strip().lower()
            start = (row.get("start") or "").strip()
            end = (row.get("end") or "").strip()
            if clip_type not in {"initial", "final"}:
                raise ValueError(f"Row {index}: type must be initial or final.")
            if not unit:
                raise ValueError(f"Row {index}: unit is required.")
            if parse_timestamp(end) <= parse_timestamp(start):
                raise ValueError(f"Row {index}: end must be after start.")
            rows.append({
                "unit": unit,
                "type": clip_type,
                "start": start,
                "end": end,
                "title": (row.get("title") or f"{clip_type.title()} {unit} Pronunciation Demo").strip(),
                "notes": (row.get("notes") or "").strip(),
            })
    return rows


def assert_unique_segments(rows: list[dict[str, str]]) -> None:
    seen: set[tuple[str, str]] = set()
    for row in rows:
        key = (row["type"], row["unit"])
        if key in seen:
            raise ValueError(f"Duplicate clip for {row['type']} {row['unit']}.")
        seen.add(key)


def run_ffmpeg(source: Path, output_path: Path, start: str, end: str) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg was not found on PATH. Install ffmpeg before building clips.")
    command = [
        ffmpeg,
        "-y",
        "-ss",
        start,
        "-to",
        end,
        "-i",
        str(source),
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        str(output_path),
    ]
    subprocess.run(command, check=True)


def run_pyav(source: Path, output_path: Path, start: str, end: str) -> None:
    """Cut a clip with PyAV when ffmpeg CLI is unavailable.

    This re-encodes video and audio into an MP4 container. The ffmpeg CLI is
    still preferred when available because it is faster and battle-tested, but
    PyAV keeps the local workflow usable in this project environment.
    """
    try:
        import av
    except ImportError as exc:
        raise RuntimeError(
            "PyAV is not installed for this Python. Use the project .venv Python, "
            "install av, or install ffmpeg and run with --encoder ffmpeg."
        ) from exc

    start_seconds = parse_timestamp(start)
    end_seconds = parse_timestamp(end)
    with av.open(str(source)) as input_container:
        input_video = next((stream for stream in input_container.streams if stream.type == "video"), None)
        input_audio = next((stream for stream in input_container.streams if stream.type == "audio"), None)
        if input_video is None:
            raise ValueError(f"No video stream found in {source}")

        with av.open(str(output_path), "w") as output_container:
            video_rate = input_video.average_rate or 30
            output_video = output_container.add_stream("libx264", rate=video_rate)
            output_video.width = input_video.codec_context.width
            output_video.height = input_video.codec_context.height
            output_video.pix_fmt = "yuv420p"

            output_audio = None
            audio_resampler = None
            if input_audio is not None:
                output_audio = output_container.add_stream("aac", rate=input_audio.codec_context.sample_rate or 44100)
                output_audio.layout = input_audio.codec_context.layout.name or "stereo"
                audio_resampler = av.AudioResampler(
                    format=output_audio.format.name,
                    layout=output_audio.layout.name,
                    rate=output_audio.rate,
                )

            input_container.seek(int(start_seconds * av.time_base))
            for packet in input_container.demux([stream for stream in [input_video, input_audio] if stream is not None]):
                if packet.dts is None:
                    continue
                if packet.stream.type == "video":
                    for frame in packet.decode():
                        frame_time = float(frame.pts * packet.stream.time_base) if frame.pts is not None else 0.0
                        if frame_time < start_seconds:
                            continue
                        if frame_time > end_seconds:
                            break
                        frame.pts = None
                        for encoded in output_video.encode(frame):
                            output_container.mux(encoded)
                elif output_audio is not None and audio_resampler is not None:
                    for frame in packet.decode():
                        frame_time = float(frame.pts * packet.stream.time_base) if frame.pts is not None else 0.0
                        if frame_time < start_seconds:
                            continue
                        if frame_time > end_seconds:
                            break
                        for resampled in audio_resampler.resample(frame):
                            resampled.pts = None
                            for encoded in output_audio.encode(resampled):
                                output_container.mux(encoded)

            for encoded in output_video.encode():
                output_container.mux(encoded)
            if output_audio is not None:
                for encoded in output_audio.encode():
                    output_container.mux(encoded)


def build_clip(source: Path, output_path: Path, start: str, end: str, encoder: str) -> str:
    if encoder == "ffmpeg":
        run_ffmpeg(source, output_path, start, end)
        return "ffmpeg"
    if encoder == "pyav":
        run_pyav(source, output_path, start, end)
        return "pyav"
    if shutil.which("ffmpeg"):
        run_ffmpeg(source, output_path, start, end)
        return "ffmpeg"
    run_pyav(source, output_path, start, end)
    return "pyav"


def build_manifest(source: Path, output_dir: Path, rows: list[dict[str, str]]) -> dict:
    manifest = {
        "source": str(source),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "clips": {"initial": {}, "final": {}},
    }
    for row in rows:
        filename = f"{row['type']}-{row['unit']}.mp4"
        manifest["clips"][row["type"]][row["unit"]] = {
            "unit": row["unit"],
            "type": row["type"],
            "title": row["title"],
            "notes": row["notes"],
            "url": f"./assets/pronunciation-clips/{filename}",
            "start": row["start"],
            "end": row["end"],
        }
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description="Build reusable pronunciation video clips.")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--segments", type=Path, default=DEFAULT_SEGMENTS)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--encoder", choices=["auto", "ffmpeg", "pyav"], default="auto")
    parser.add_argument("--dry-run", action="store_true", help="Validate inputs without writing clips.")
    args = parser.parse_args()

    if not args.source.exists():
        raise FileNotFoundError(f"Source video not found: {args.source}")
    if not args.segments.exists():
        raise FileNotFoundError(f"Segments CSV not found: {args.segments}")

    rows = load_segments(args.segments)
    assert_unique_segments(rows)
    if not rows:
        print("No clip rows found. Fill tools/pronunciation_clip_segments.csv first.")
        return 0

    args.output_dir.mkdir(parents=True, exist_ok=True)
    manifest = build_manifest(args.source, args.output_dir, rows)

    if args.dry_run:
        print(json.dumps(manifest, ensure_ascii=False, indent=2))
        return 0

    for row in rows:
        output_path = args.output_dir / f"{row['type']}-{row['unit']}.mp4"
        encoder = build_clip(args.source, output_path, row["start"], row["end"], args.encoder)
        print(f"Wrote {output_path} with {encoder}")

    manifest_path = args.output_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(rows)} clip(s) and {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
