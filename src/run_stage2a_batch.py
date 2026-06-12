from __future__ import annotations

import argparse
import csv
from pathlib import Path

from stage1_pronunciation import analyze_pronunciation_stage1, save_json


DEFAULT_SAMPLES_DIR = Path("samples")
DEFAULT_OUTPUT_DIR = Path("stage2a_batch_results")


def text_from_audio_filename(audio_path: Path) -> str:
    """Use the audio filename as the target text, e.g. samples/你好.m4a -> 你好."""
    return audio_path.stem


def run_one(audio_path: Path, output_dir: Path) -> dict[str, object]:
    text = text_from_audio_filename(audio_path)
    phrase_dir = output_dir / text
    json_path = phrase_dir / "feedback.json"
    plot_dir = phrase_dir / "plots"

    result = analyze_pronunciation_stage1(text, audio_path, plot_dir=plot_dir)
    save_json(result, json_path)

    boundary_details = result["syllable_timing"]["boundary_details"]
    boundary_summary = ", ".join(
        f'{item["after_syllable_index"] + 1}:{item["confidence"]}'
        for item in boundary_details
    )

    return {
        "text": text,
        "audio": str(audio_path),
        "pinyin": " ".join(result["pinyin"]),
        "overall_score": result["overall_score"],
        "speech_start": round(result["speech_region"]["start"], 3),
        "speech_end": round(result["speech_region"]["end"], 3),
        "timing_confidence": result["syllable_timing"]["confidence"],
        "timing_reason": result["syllable_timing"]["confidence_reason"],
        "boundary_count": len(boundary_details),
        "boundary_confidences": boundary_summary,
        "json": str(json_path),
        "pitch_overview": result["plots"]["pitch_overview"] if result["plots"] else "",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Stage 2A.2 on all sample recordings.")
    parser.add_argument("--samples-dir", type=Path, default=DEFAULT_SAMPLES_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    args = parser.parse_args()

    audio_files = sorted(
        path
        for path in args.samples_dir.iterdir()
        if path.suffix.lower() in {".wav", ".m4a", ".aac", ".mp3", ".caf"}
    )
    if not audio_files:
        print(f"No audio files found in {args.samples_dir}")
        return 1

    args.output_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    for audio_path in audio_files:
        try:
            row = run_one(audio_path, args.output_dir)
            rows.append(row)
            print(
                f'{row["text"]}: score={row["overall_score"]}, '
                f'confidence={row["timing_confidence"]}, '
                f'boundaries={row["boundary_confidences"] or "none"}'
            )
        except Exception as exc:
            rows.append(
                {
                    "text": text_from_audio_filename(audio_path),
                    "audio": str(audio_path),
                    "error": str(exc),
                }
            )
            print(f"{audio_path.name}: ERROR {exc}")

    summary_path = args.output_dir / "summary.csv"
    fieldnames = sorted({key for row in rows for key in row.keys()})
    with summary_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nSaved summary to {summary_path.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
