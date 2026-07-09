from __future__ import annotations

import argparse
from pathlib import Path

from training_manifest import (
    PROTOTYPE_MIN_SAMPLES,
    manifest_rows_from_completed_plan,
    read_manifest,
    report_to_dict,
    validation_report,
    write_json,
    write_manifest,
)


DEFAULT_PLAN = Path("data") / "phoneme_collection_plan.csv"
DEFAULT_MANIFEST = Path("data") / "phoneme_manifest.csv"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Append completed collection-plan audio rows to the Stage 3B training manifest."
    )
    parser.add_argument("--plan", type=Path, default=DEFAULT_PLAN)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument(
        "--report",
        type=Path,
        default=None,
        help="Optional validation report path. Defaults to <manifest stem>_report.json.",
    )
    parser.add_argument(
        "--require-audio",
        action="store_true",
        help="Fail validation if any manifest audio is missing after import.",
    )
    args = parser.parse_args()

    if not args.plan.exists():
        print(f"Collection plan not found: {args.plan}")
        print("Create one with: python3 src/run_stage3b_plan_collection.py")
        return 1

    existing_rows = []
    existing_ids: set[str] = set()
    if args.manifest.exists():
        existing_rows, _fieldnames = read_manifest(args.manifest)
        existing_ids = {row.get("id", "").strip() for row in existing_rows if row.get("id", "").strip()}

    new_rows, skipped_missing_audio = manifest_rows_from_completed_plan(
        args.plan,
        existing_ids=existing_ids,
    )
    all_rows = existing_rows + new_rows
    write_manifest(all_rows, args.manifest)

    report = validation_report(
        args.manifest,
        require_audio=args.require_audio,
        min_samples=PROTOTYPE_MIN_SAMPLES,
    )
    report_path = args.report or args.manifest.with_name(f"{args.manifest.stem}_report.json")
    write_json(report_to_dict(report), report_path)

    print(f"Manifest: {args.manifest.resolve()}")
    print(f"Existing rows: {len(existing_rows)}")
    print(f"Imported rows: {len(new_rows)}")
    print(f"Skipped missing plan audio: {len(skipped_missing_audio)}")
    print(f"Total rows: {report.n_samples}")
    print(f"Readiness: {report.readiness}")
    print(f"Saved report: {report_path.resolve()}")

    if report.errors:
        print("\nErrors:")
        for error in report.errors:
            print(f"- {error}")
        return 1
    if report.warnings:
        print("\nWarnings:")
        for warning in report.warnings:
            print(f"- {warning}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
