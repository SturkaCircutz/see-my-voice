from __future__ import annotations

import argparse
from pathlib import Path

from training_manifest import (
    PROTOTYPE_MIN_SAMPLES,
    download_ntu_learner_audio_with_metadata,
    read_manifest,
    report_to_dict,
    rows_from_ntu_page_entries,
    validation_report,
    write_json,
    write_manifest,
)


DEFAULT_PAGE = "https://sites.google.com/site/tehsinphono/resources/mandarin-learners-speech-bank"
DEFAULT_AUDIO_DIR = Path("data") / "external" / "ntu_l2_mandarin"
DEFAULT_MANIFEST = Path("data") / "phoneme_manifest.csv"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Download/import public NTU L2 Mandarin learner audio into the Stage 3B manifest."
    )
    parser.add_argument("--page-url", default=DEFAULT_PAGE)
    parser.add_argument("--audio-dir", type=Path, default=DEFAULT_AUDIO_DIR)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument(
        "--manifest-audio-prefix",
        default="data/external/ntu_l2_mandarin",
        help="Audio path prefix written into the manifest.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional max audio files to download/import.",
    )
    parser.add_argument(
        "--download-only",
        action="store_true",
        help="Download audio but do not append manifest rows.",
    )
    args = parser.parse_args()

    prompts, entries = download_ntu_learner_audio_with_metadata(
        args.page_url,
        args.audio_dir,
        limit=args.limit,
    )
    print(f"Downloaded/found NTU learner audio files: {len(entries)}")
    print(f"Prompt levels: {sorted(prompts)}")
    if args.download_only:
        return 0

    existing_rows = []
    existing_ids: set[str] = set()
    if args.manifest.exists():
        existing_rows, _fieldnames = read_manifest(args.manifest)
        existing_ids = {row.get("id", "").strip() for row in existing_rows if row.get("id", "").strip()}

    new_rows = rows_from_ntu_page_entries(
        prompts,
        entries,
        manifest_audio_prefix=args.manifest_audio_prefix,
        existing_ids=existing_ids,
    )
    all_rows = existing_rows + new_rows
    write_manifest(all_rows, args.manifest)

    report = validation_report(
        args.manifest,
        require_audio=False,
        min_samples=PROTOTYPE_MIN_SAMPLES,
    )
    report_path = args.manifest.with_name(f"{args.manifest.stem}_report.json")
    write_json(report_to_dict(report), report_path)

    print(f"Manifest: {args.manifest.resolve()}")
    print(f"Existing rows: {len(existing_rows)}")
    print(f"Imported NTU learner rows: {len(new_rows)}")
    print(f"Total rows: {report.n_samples}")
    print(f"Readiness: {report.readiness}")
    if any(not row.get("text", "") for row in new_rows):
        print("Warning: some NTU rows could not be assigned source-page prompt text.")
    print(f"Saved report: {report_path.resolve()}")
    return 0 if report.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
