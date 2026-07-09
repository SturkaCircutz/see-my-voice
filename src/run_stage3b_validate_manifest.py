from __future__ import annotations

import argparse
from pathlib import Path

from training_manifest import (
    PROTOTYPE_MIN_SAMPLES,
    report_to_dict,
    validation_report,
    write_json,
)


DEFAULT_MANIFEST = Path("data") / "phoneme_manifest.csv"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate a Stage 3B phoneme training manifest before dataset/model training."
    )
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument(
        "--report",
        type=Path,
        default=None,
        help="Optional JSON report path. Defaults to <manifest stem>_report.json next to the manifest.",
    )
    parser.add_argument(
        "--require-audio",
        action="store_true",
        help="Fail if audio files referenced by the manifest are missing locally.",
    )
    parser.add_argument(
        "--min-samples",
        type=int,
        default=PROTOTYPE_MIN_SAMPLES,
        help="Minimum sample count used for readiness warnings.",
    )
    args = parser.parse_args()

    report = validation_report(
        args.manifest,
        require_audio=args.require_audio,
        min_samples=args.min_samples,
    )
    report_path = args.report or args.manifest.with_name(f"{args.manifest.stem}_report.json")
    write_json(report_to_dict(report), report_path)

    print(f"Manifest: {args.manifest}")
    print(f"Rows: {report.n_samples}")
    print(f"Speakers: {report.n_speakers}")
    print(f"Splits: {report.split_counts}")
    print(f"Labels: {report.label_counts}")
    print(f"Missing audio: {report.n_missing_audio}")
    print(f"Readiness: {report.readiness}")

    if report.warnings:
        print("\nWarnings:")
        for warning in report.warnings:
            print(f"- {warning}")

    if report.errors:
        print("\nErrors:")
        for error in report.errors:
            print(f"- {error}")
        print(f"\nSaved validation report to {report_path.resolve()}")
        return 1

    print(f"\nSaved validation report to {report_path.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
