from __future__ import annotations

import argparse
from pathlib import Path

from training_manifest import (
    PROTOTYPE_MIN_SAMPLES,
    report_to_dict,
    seed_rows_from_evaluation_manifest,
    validation_report,
    write_json,
    write_manifest,
)


DEFAULT_EVALUATION_MANIFEST = Path("samples") / "evaluation_manifest.csv"
DEFAULT_OUTPUT = Path("data") / "phoneme_manifest.csv"
DEFAULT_REPORT = Path("data") / "phoneme_manifest_report.json"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create the Stage 3B phoneme training manifest seed."
    )
    parser.add_argument("--source", type=Path, default=DEFAULT_EVALUATION_MANIFEST)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument(
        "--default-speaker-id",
        default="speaker_unknown_001",
        help="Speaker id used for existing seed rows when the source manifest has no speaker column.",
    )
    parser.add_argument(
        "--min-samples",
        type=int,
        default=PROTOTYPE_MIN_SAMPLES,
        help="Minimum sample count used for readiness warnings.",
    )
    args = parser.parse_args()

    if not args.source.exists():
        print(f"Source manifest not found: {args.source}")
        return 1

    rows = seed_rows_from_evaluation_manifest(
        args.source,
        default_speaker_id=args.default_speaker_id,
    )
    write_manifest(rows, args.output)

    report = validation_report(args.output, require_audio=False, min_samples=args.min_samples)
    write_json(report_to_dict(report), args.report)

    print(f"Wrote phoneme training manifest seed: {args.output.resolve()}")
    print(f"Rows: {report.n_samples}")
    print(f"Speakers: {report.n_speakers}")
    print(f"Splits: {report.split_counts}")
    print(f"Labels: {report.label_counts}")
    print(f"Readiness: {report.readiness}")
    if report.warnings:
        print("\nWarnings:")
        for warning in report.warnings:
            print(f"- {warning}")
    if report.errors:
        print("\nErrors:")
        for error in report.errors:
            print(f"- {error}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
