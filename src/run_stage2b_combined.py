from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any

from run_asr_baseline import (
    DEFAULT_MODEL_NAME,
    build_model,
    normalize_chinese_text,
    run_one as run_asr_one,
)
from stage1_pronunciation import analyze_pronunciation_stage1, save_json


DEFAULT_SAMPLES_DIR = Path("samples")
DEFAULT_OUTPUT_DIR = Path("stage2b_combined_results")


def text_from_audio_filename(audio_path: Path) -> str:
    """Use the filename as target text, e.g. samples/我要吃饭.m4a -> 我要吃饭."""
    return audio_path.stem


def understandability_label(asr_result: dict[str, Any]) -> str:
    """Turn ASR text similarity into a simple product-facing label.

    Beginner note: this is not a medical or linguistic diagnosis. It simply
    answers: did a strong Chinese ASR model understand the intended sentence?
    """
    if asr_result["exact_match"]:
        return "understood"
    if asr_result["text_similarity"] >= 80:
        return "mostly_understood"
    if asr_result["text_similarity"] >= 50:
        return "partly_understood"
    return "not_understood"


def readiness_score(stage2a_result: dict[str, Any], asr_result: dict[str, Any]) -> int:
    """Combine understandability and tone/timing into one prototype score.

    The score is intentionally simple:
    - ASR matters most because the product goal is being understood.
    - Tone/timing still matters because Mandarin intelligibility depends on it.
    - Low boundary confidence reduces trust in the timing score.
    """
    asr_score = float(asr_result["text_similarity"])
    tone_timing_score = float(stage2a_result["overall_score"] or 0)
    boundary_confidence = stage2a_result["syllable_timing"]["confidence"]

    confidence_multiplier = {
        "high": 1.0,
        "medium": 0.9,
        "low": 0.75,
    }.get(boundary_confidence, 0.75)
    trusted_tone_timing = tone_timing_score * confidence_multiplier

    return int(round(asr_score * 0.6 + trusted_tone_timing * 0.4))


def main_feedback(stage2a_result: dict[str, Any], asr_result: dict[str, Any]) -> str:
    """Create one short, human-friendly recommendation."""
    label = understandability_label(asr_result)
    boundary_confidence = stage2a_result["syllable_timing"]["confidence"]
    tone_score = stage2a_result["overall_score"] or 0

    if label == "understood" and tone_score >= 75 and boundary_confidence != "low":
        return "The system understood this sentence, and the tone and rhythm are fairly stable. Next, try practicing a longer sentence."
    if label == "understood":
        return "The system understood this sentence, but the tone or syllable timing is not stable enough yet. Check the pitch chart first and focus on the lowest-scored syllables."
    if label == "mostly_understood":
        return "The system mostly understood you, but a few characters may not be clear. Slow down and complete every syllable."
    if label == "partly_understood":
        return "The system only understood part of the sentence. Practice single words first, then return to the full sentence."
    return "The system could not reliably understand this sentence. Check the recording environment first, then start with one syllable or word."


def compact_syllable_feedback(stage2a_result: dict[str, Any]) -> list[dict[str, Any]]:
    """Keep the combined JSON readable by saving only the most useful syllable fields."""
    rows = []
    for syllable in stage2a_result["syllables"]:
        rows.append(
            {
                "index": syllable["index"],
                "char": syllable["char"],
                "pinyin": syllable["pinyin"],
                "initial": syllable["initial"],
                "final": syllable["final"],
                "tone": syllable["tone"],
                "window": syllable["window"],
                "tone_score": syllable["scores"]["tone"],
                "feedback": syllable["feedback"],
            }
        )
    return rows


def combine_results(
    target_text: str,
    audio_path: Path,
    asr_model: Any,
    plot_dir: Path | None,
) -> dict[str, Any]:
    """Run Stage 2A and ASR, then merge them into one Stage 2B report."""
    stage2a_result = analyze_pronunciation_stage1(target_text, audio_path, plot_dir=plot_dir)
    asr_result = run_asr_one(asr_model, audio_path, target_text)
    label = understandability_label(asr_result)

    return {
        "stage": "stage_2b_combined_asr_tone_timing",
        "target_text": target_text,
        "audio": str(audio_path),
        "pinyin": stage2a_result["pinyin"],
        "communication_result": {
            "label": label,
            "readiness_score": readiness_score(stage2a_result, asr_result),
            "main_feedback": main_feedback(stage2a_result, asr_result),
        },
        "asr": {
            "model": DEFAULT_MODEL_NAME,
            "heard_text": asr_result["asr_text"],
            "target_normalized": normalize_chinese_text(target_text),
            "heard_normalized": asr_result["asr_normalized"],
            "exact_match": asr_result["exact_match"],
            "text_similarity": asr_result["text_similarity"],
        },
        "tone_timing": {
            "overall_score": stage2a_result["overall_score"],
            "speech_region": stage2a_result["speech_region"],
            "boundary_confidence": stage2a_result["syllable_timing"]["confidence"],
            "boundary_reason": stage2a_result["syllable_timing"]["confidence_reason"],
            "boundary_details": stage2a_result["syllable_timing"]["boundary_details"],
            "syllables": compact_syllable_feedback(stage2a_result),
        },
        "plots": stage2a_result["plots"],
        "notes": [
            "Stage 2B combines semantic understandability from ASR with Stage 2A tone/timing feedback.",
            "This is still not true phoneme-level scoring; initial/final accuracy needs Stage 3 CTC/GOP.",
        ],
    }


def run_single(args: argparse.Namespace) -> int:
    if not args.audio.exists():
        print(f"Audio file not found: {args.audio}")
        return 1

    target_text = args.text or text_from_audio_filename(args.audio)
    asr_model = build_model(args.model, args.device)
    result = combine_results(target_text, args.audio, asr_model, args.plot_dir)
    save_json(result, args.output)

    print(f'Target text: {result["target_text"]}')
    print(f'ASR heard: {result["asr"]["heard_text"]}')
    print(f'Communication result: {result["communication_result"]["label"]}')
    print(f'Readiness score: {result["communication_result"]["readiness_score"]}/100')
    print(f'Main feedback: {result["communication_result"]["main_feedback"]}')
    print(f'Boundary confidence: {result["tone_timing"]["boundary_confidence"]}')
    print(f"Saved combined report to {args.output.resolve()}")
    return 0


def run_batch(args: argparse.Namespace) -> int:
    audio_files = sorted(
        path
        for path in args.samples_dir.iterdir()
        if path.suffix.lower() in {".wav", ".m4a", ".aac", ".mp3", ".caf"}
    )
    if not audio_files:
        print(f"No audio files found in {args.samples_dir}")
        return 1

    asr_model = build_model(args.model, args.device)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    rows = []

    for audio_path in audio_files:
        target_text = text_from_audio_filename(audio_path)
        phrase_dir = args.output_dir / target_text
        json_path = phrase_dir / "combined_report.json"
        plot_dir = phrase_dir / "plots"
        try:
            result = combine_results(target_text, audio_path, asr_model, plot_dir)
            save_json(result, json_path)
            rows.append(
                {
                    "target_text": target_text,
                    "audio": str(audio_path),
                    "asr_heard": result["asr"]["heard_text"],
                    "asr_similarity": result["asr"]["text_similarity"],
                    "communication_label": result["communication_result"]["label"],
                    "readiness_score": result["communication_result"]["readiness_score"],
                    "tone_timing_score": result["tone_timing"]["overall_score"],
                    "boundary_confidence": result["tone_timing"]["boundary_confidence"],
                    "json": str(json_path),
                    "pitch_overview": result["plots"]["pitch_overview"] if result["plots"] else "",
                }
            )
            print(
                f'{target_text}: {result["communication_result"]["label"]}, '
                f'readiness={result["communication_result"]["readiness_score"]}/100, '
                f'heard="{result["asr"]["heard_text"]}", '
                f'boundary={result["tone_timing"]["boundary_confidence"]}'
            )
        except Exception as exc:
            rows.append(
                {
                    "target_text": target_text,
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

    print(f"\nSaved Stage 2B summary to {summary_path.resolve()}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run Stage 2B combined Mandarin pronunciation assessment."
    )
    parser.add_argument("--model", default=DEFAULT_MODEL_NAME)
    parser.add_argument("--device", default="cpu")
    subparsers = parser.add_subparsers(dest="command", required=True)

    single = subparsers.add_parser("single", help="Run one combined assessment.")
    single.add_argument("--audio", type=Path, required=True)
    single.add_argument("--text", default=None)
    single.add_argument("--output", type=Path, default=Path("stage2b_combined_report.json"))
    single.add_argument("--plot-dir", type=Path, default=Path("stage2b_plots"))
    single.set_defaults(func=run_single)

    batch = subparsers.add_parser("batch", help="Run all files in samples/.")
    batch.add_argument("--samples-dir", type=Path, default=DEFAULT_SAMPLES_DIR)
    batch.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    batch.set_defaults(func=run_batch)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
