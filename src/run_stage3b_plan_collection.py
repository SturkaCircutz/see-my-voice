from __future__ import annotations

import argparse
from pathlib import Path

from training_manifest import (
    PROTOTYPE_MIN_SAMPLES,
    build_collection_plan,
    collection_plan_summary,
    write_collection_plan,
    write_json,
)


DEFAULT_OUTPUT = Path("data") / "phoneme_collection_plan.csv"
DEFAULT_REPORT = Path("data") / "phoneme_collection_plan_report.json"


def read_texts(path: Path) -> list[str]:
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create a concrete recording collection plan for the Stage 3B phoneme manifest."
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--n-recordings", type=int, default=PROTOTYPE_MIN_SAMPLES)
    parser.add_argument("--n-speakers", type=int, default=50)
    parser.add_argument(
        "--texts",
        type=Path,
        default=None,
        help="Optional UTF-8 text file with one Mandarin prompt per line.",
    )
    parser.add_argument("--audio-dir", default="data/audio")
    args = parser.parse_args()

    texts = read_texts(args.texts) if args.texts else None
    rows = build_collection_plan(
        n_recordings=args.n_recordings,
        n_speakers=args.n_speakers,
        texts=texts,
        audio_dir=args.audio_dir,
    )
    summary = collection_plan_summary(rows)

    write_collection_plan(rows, args.output)
    write_json(summary, args.report)

    print(f"Wrote collection plan: {args.output.resolve()}")
    print(f"Slots: {summary['n_slots']}")
    print(f"Speakers: {summary['n_speakers']}")
    print(f"Splits: {summary['split_counts']}")
    print(f"Labels: {summary['target_label_counts']}")
    print(f"Issues: {summary['target_issue_counts']}")
    print(f"Saved report: {args.report.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
