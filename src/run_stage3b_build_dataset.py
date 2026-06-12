from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Any

from stage3a_labels import build_inventory, labels_to_dict, text_to_stage3a_labels, write_json


DEFAULT_MANIFEST = Path("samples") / "evaluation_manifest.csv"
DEFAULT_OUTPUT_DIR = Path("stage3b_dataset")


def read_manifest(path: Path) -> list[dict[str, str]]:
    """Read the sample manifest that links recordings to target text.

    Beginner note: Stage 3B is different from Stage 3A because it keeps every
    recording row. If you recorded 你好 three times, Stage 3B keeps all three,
    because each audio file may show a different pronunciation problem.
    """
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def resolve_audio_path(audio_value: str, manifest_path: Path) -> Path:
    """Resolve an audio path from the manifest.

    Relative paths are interpreted from the project root when you run this from
    the project folder. If that file is not found, we also try relative to the
    manifest file's folder. This makes the script friendlier when manifests move.
    """
    audio_path = Path(audio_value.strip())
    if audio_path.is_absolute() or audio_path.exists():
        return audio_path

    manifest_relative = manifest_path.parent / audio_path.name
    if manifest_relative.exists():
        return manifest_relative

    return audio_path


def make_dataset_row(
    manifest_row: dict[str, str],
    manifest_path: Path,
    use_tone_sandhi: bool,
) -> dict[str, Any]:
    """Turn one manifest row into one Stage 3B dataset row.

    The important idea is that future model code should not need to understand
    the original CSV format. It should only read this clean dataset file.
    """
    sample_id = manifest_row.get("id", "").strip()
    target_text = manifest_row.get("text", "").strip()
    audio_path = resolve_audio_path(manifest_row.get("audio", ""), manifest_path)
    labels = text_to_stage3a_labels(target_text, use_tone_sandhi=use_tone_sandhi)

    return {
        "sample_id": sample_id or audio_path.stem,
        "audio_path": str(audio_path),
        "audio_exists": audio_path.exists(),
        "target_text": target_text,
        "pinyin": " ".join(labels.pinyin),
        "syllable_tokens": " ".join(labels.syllable_tokens),
        "phone_tokens": " ".join(labels.phone_tokens),
        "n_syllables": len(labels.syllables),
        "n_phone_tokens": len(labels.phone_tokens),
        "human_label": manifest_row.get("human_label", "").strip(),
        "expected_issue": manifest_row.get("expected_issue", "").strip(),
        "human_note": manifest_row.get("human_note", "").strip(),
    }


def write_csv(rows: list[dict[str, Any]], path: Path) -> None:
    """Save the Stage 3B dataset as a CSV table."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "sample_id",
        "audio_path",
        "audio_exists",
        "target_text",
        "pinyin",
        "syllable_tokens",
        "phone_tokens",
        "n_syllables",
        "n_phone_tokens",
        "human_label",
        "expected_issue",
        "human_note",
    ]
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def build_dataset(
    manifest_path: Path,
    output_dir: Path,
    use_tone_sandhi: bool = True,
) -> int:
    """Build the Stage 3B dataset files from a labeled manifest."""
    if not manifest_path.exists():
        print(f"Manifest not found: {manifest_path}")
        return 1

    manifest_rows = read_manifest(manifest_path)
    if not manifest_rows:
        print(f"Manifest is empty: {manifest_path}")
        return 1

    dataset_rows = [
        make_dataset_row(row, manifest_path, use_tone_sandhi)
        for row in manifest_rows
    ]
    unique_texts = []
    seen_texts = set()
    for row in dataset_rows:
        text = row["target_text"]
        if text and text not in seen_texts:
            unique_texts.append(text)
            seen_texts.add(text)

    label_sets = [
        text_to_stage3a_labels(text, use_tone_sandhi=use_tone_sandhi)
        for text in unique_texts
    ]
    missing_audio = [row for row in dataset_rows if not row["audio_exists"]]

    output_dir.mkdir(parents=True, exist_ok=True)
    write_csv(dataset_rows, output_dir / "dataset.csv")
    write_json({"samples": dataset_rows}, output_dir / "dataset.json")
    write_json(build_inventory(label_sets), output_dir / "inventory.json")
    write_json(
        {
            "stage": "stage_3b_dataset",
            "manifest": str(manifest_path),
            "n_samples": len(dataset_rows),
            "n_unique_texts": len(unique_texts),
            "n_missing_audio": len(missing_audio),
            "missing_audio": [row["audio_path"] for row in missing_audio],
            "use_tone_sandhi": use_tone_sandhi,
            "notes": [
                "Each row connects one recording to pinyin, syllable tokens, phone tokens, and human labels.",
                "This is the dataset format future Stage 3C/3D model experiments should read.",
                "Audio files are local and ignored by Git, so audio_exists may be false on another computer.",
            ],
        },
        output_dir / "dataset_report.json",
    )

    print(f"Built Stage 3B dataset with {len(dataset_rows)} sample row(s).")
    print(f"Unique target texts: {len(unique_texts)}")
    print(f"Missing local audio files: {len(missing_audio)}")
    print(f"Saved dataset to {output_dir.resolve()}")
    print("\nPreview:")
    for row in dataset_rows[:5]:
        print(f"- {row['sample_id']}: {row['target_text']} -> {row['phone_tokens']}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build a Stage 3B dataset table linking audio files to Mandarin labels."
    )
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument(
        "--no-tone-sandhi",
        action="store_true",
        help="Use dictionary tones instead of spoken-context tones.",
    )
    args = parser.parse_args()

    return build_dataset(
        manifest_path=args.manifest,
        output_dir=args.output_dir,
        use_tone_sandhi=not args.no_tone_sandhi,
    )


if __name__ == "__main__":
    raise SystemExit(main())
