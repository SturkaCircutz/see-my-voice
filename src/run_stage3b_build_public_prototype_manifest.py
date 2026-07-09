from __future__ import annotations

import argparse
from pathlib import Path

from training_manifest import (
    download_aishell_subset,
    download_ntu_learner_audio_with_metadata,
    report_to_dict,
    rows_from_aishell,
    rows_from_ntu_page_entries,
    validation_report,
    write_json,
    write_manifest,
)


DEFAULT_MANIFEST = Path("data") / "phoneme_manifest.csv"
DEFAULT_REPORT = Path("data") / "phoneme_manifest_report.json"
DEFAULT_AISHELL_ROOT = Path("data") / "external" / "aishell"
DEFAULT_NTU_AUDIO_DIR = Path("data") / "external" / "ntu_l2_mandarin"
DEFAULT_NTU_PAGE = "https://sites.google.com/site/tehsinphono/resources/mandarin-learners-speech-bank"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build a 500-row public-data prototype phoneme manifest with real audio."
    )
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--aishell-root", type=Path, default=DEFAULT_AISHELL_ROOT)
    parser.add_argument("--ntu-audio-dir", type=Path, default=DEFAULT_NTU_AUDIO_DIR)
    parser.add_argument("--ntu-page-url", default=DEFAULT_NTU_PAGE)
    parser.add_argument("--aishell-rows", type=int, default=450)
    parser.add_argument("--ntu-rows", type=int, default=50)
    parser.add_argument("--aishell-speaker-archives", type=int, default=2)
    args = parser.parse_args()

    download_aishell_subset(
        args.aishell_root,
        n_speaker_archives=args.aishell_speaker_archives,
    )
    aishell_rows, skipped_aishell = rows_from_aishell(
        args.aishell_root,
        manifest_audio_prefix=str(args.aishell_root),
        limit=args.aishell_rows,
    )

    prompts, ntu_entries = download_ntu_learner_audio_with_metadata(
        args.ntu_page_url,
        args.ntu_audio_dir,
        limit=args.ntu_rows,
    )
    ntu_rows = rows_from_ntu_page_entries(
        prompts,
        ntu_entries,
        manifest_audio_prefix=str(args.ntu_audio_dir),
        existing_ids={row["id"] for row in aishell_rows},
    )

    rows = aishell_rows + ntu_rows
    write_manifest(rows, args.manifest)
    report = validation_report(args.manifest, require_audio=True, min_samples=500)
    write_json(report_to_dict(report), args.report)

    print(f"Manifest: {args.manifest.resolve()}")
    print(f"AISHELL rows: {len(aishell_rows)}")
    print(f"NTU learner rows: {len(ntu_rows)}")
    print(f"Skipped AISHELL rows without transcript: {len(skipped_aishell)}")
    print(f"Total rows: {report.n_samples}")
    print(f"Speakers: {report.n_speakers}")
    print(f"Splits: {report.split_counts}")
    print(f"Labels: {report.label_counts}")
    print(f"Missing audio: {report.n_missing_audio}")
    print(f"Readiness: {report.readiness}")
    print(f"Saved report: {args.report.resolve()}")

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
