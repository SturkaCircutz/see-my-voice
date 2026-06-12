from __future__ import annotations

import argparse
import csv
from pathlib import Path

from stage3a_labels import build_inventory, labels_to_dict, text_to_stage3a_labels, write_json


DEFAULT_MANIFEST = Path("samples") / "evaluation_manifest.csv"
DEFAULT_OUTPUT_DIR = Path("stage3a_label_results")


def read_texts_from_manifest(manifest_path: Path) -> list[str]:
    """Read target phrases from the same CSV used by Stage 2B evaluation.

    Beginner note: the manifest has many recordings, and some recordings share
    the same target text. We keep each target phrase only once for the inventory.
    """
    with manifest_path.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))

    texts = []
    seen = set()
    for row in rows:
        text = row.get("text", "").strip()
        if text and text not in seen:
            texts.append(text)
            seen.add(text)
    return texts


def write_training_rows(label_sets, output_path: Path) -> None:
    """Write a compact CSV table for later dataset/model experiments.

    This file is useful because future Stage 3B code can read one row at a time:
    text -> pinyin -> labels. Audio paths will be added later when we prepare a
    real training/evaluation dataset.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["text", "pinyin", "syllable_tokens", "phone_tokens"],
        )
        writer.writeheader()
        for labels in label_sets:
            writer.writerow(
                {
                    "text": labels.text,
                    "pinyin": " ".join(labels.pinyin),
                    "syllable_tokens": " ".join(labels.syllable_tokens),
                    "phone_tokens": " ".join(labels.phone_tokens),
                }
            )


def prepare_labels(texts: list[str], output_dir: Path, use_tone_sandhi: bool = True) -> int:
    """Create Stage 3A labels, inventory JSON, and a compact CSV summary."""
    if not texts:
        print("No target text was provided.")
        return 1

    label_sets = [
        text_to_stage3a_labels(text, use_tone_sandhi=use_tone_sandhi)
        for text in texts
    ]
    output_dir.mkdir(parents=True, exist_ok=True)

    for labels in label_sets:
        # Use the Chinese text as the filename so it is easy to find in VS Code.
        write_json(labels_to_dict(labels), output_dir / f"{labels.text}.json")

    inventory = build_inventory(label_sets)
    write_json(inventory, output_dir / "inventory.json")
    write_training_rows(label_sets, output_dir / "label_summary.csv")

    print(f"Prepared {len(label_sets)} unique target text(s).")
    print(f"Inventory size: {len(inventory['token_to_id'])} tokens including <blank>.")
    print(f"Saved Stage 3A labels to {output_dir.resolve()}")
    print("\nPreview:")
    for labels in label_sets[:5]:
        print(f"- {labels.text}: {' '.join(labels.phone_tokens)}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Prepare Mandarin pinyin/phoneme labels for Stage 3 CTC/GOP work."
    )
    parser.add_argument(
        "--text",
        action="append",
        help="Target Mandarin text. You can pass this more than once.",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=None,
        help="CSV manifest with a text column, for example samples/evaluation_manifest.csv.",
    )
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument(
        "--no-tone-sandhi",
        action="store_true",
        help="Use dictionary tones instead of spoken-context tones.",
    )
    args = parser.parse_args()

    texts = []
    if args.text:
        texts.extend(item.strip() for item in args.text if item.strip())

    manifest = args.manifest
    if manifest is None and not texts and DEFAULT_MANIFEST.exists():
        manifest = DEFAULT_MANIFEST
    if manifest is not None:
        if not manifest.exists():
            print(f"Manifest not found: {manifest}")
            return 1
        texts.extend(read_texts_from_manifest(manifest))

    # Remove duplicates while keeping the original order.
    unique_texts = []
    seen = set()
    for text in texts:
        if text not in seen:
            unique_texts.append(text)
            seen.add(text)

    return prepare_labels(
        unique_texts,
        args.output_dir,
        use_tone_sandhi=not args.no_tone_sandhi,
    )


if __name__ == "__main__":
    raise SystemExit(main())
