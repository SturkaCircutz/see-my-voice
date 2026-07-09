from __future__ import annotations

import argparse
from pathlib import Path

from training_manifest import (
    PROTOTYPE_MIN_SAMPLES,
    download_aishell_subset,
    read_manifest,
    report_to_dict,
    rows_from_aishell,
    validation_report,
    write_json,
    write_manifest,
)


DEFAULT_MANIFEST = Path("data") / "phoneme_manifest.csv"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Import AISHELL-style Mandarin native speech rows into the Stage 3B manifest."
    )
    parser.add_argument(
        "--aishell-root",
        type=Path,
        default=Path("data") / "external" / "aishell",
        help="Extracted AISHELL root containing transcript/ and wav/ directories.",
    )
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument(
        "--manifest-audio-prefix",
        default="data/external/aishell",
        help="Audio path prefix written into the manifest.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional max rows to import, useful for a 500-row prototype manifest.",
    )
    parser.add_argument(
        "--require-audio",
        action="store_true",
        help="Fail validation if any manifest audio is missing after import.",
    )
    parser.add_argument(
        "--download-subset",
        action="store_true",
        help="Download transcript plus a small number of speaker archives before importing.",
    )
    parser.add_argument(
        "--n-speaker-archives",
        type=int,
        default=1,
        help="Speaker tarballs to download when --download-subset is used.",
    )
    args = parser.parse_args()

    if args.download_subset:
        archives = download_aishell_subset(
            args.aishell_root,
            n_speaker_archives=args.n_speaker_archives,
        )
        print(f"Downloaded/found AISHELL speaker archives: {len(archives)}")

    existing_rows = []
    existing_ids: set[str] = set()
    if args.manifest.exists():
        existing_rows, _fieldnames = read_manifest(args.manifest)
        existing_ids = {row.get("id", "").strip() for row in existing_rows if row.get("id", "").strip()}

    new_rows, skipped = rows_from_aishell(
        args.aishell_root,
        manifest_audio_prefix=args.manifest_audio_prefix,
        limit=args.limit,
        existing_ids=existing_ids,
    )
    all_rows = existing_rows + new_rows
    write_manifest(all_rows, args.manifest)

    report = validation_report(
        args.manifest,
        require_audio=args.require_audio,
        min_samples=PROTOTYPE_MIN_SAMPLES,
    )
    report_path = args.manifest.with_name(f"{args.manifest.stem}_report.json")
    write_json(report_to_dict(report), report_path)

    print(f"Manifest: {args.manifest.resolve()}")
    print(f"Existing rows: {len(existing_rows)}")
    print(f"Imported AISHELL rows: {len(new_rows)}")
    print(f"Skipped unmatched transcript/audio rows: {len(skipped)}")
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
