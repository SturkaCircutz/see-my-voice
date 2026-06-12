from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Any

from run_asr_baseline import DEFAULT_MODEL_NAME, build_model
from run_stage2b_combined import combine_results
from stage1_pronunciation import save_json


DEFAULT_MANIFEST = Path("samples") / "evaluation_manifest.csv"
DEFAULT_OUTPUT_DIR = Path("stage2b_eval_results")


GOOD_LABELS = {"good", "clear", "acceptable"}
ISSUE_LABELS = {
    "tone_issue",
    "timing_issue",
    "boundary_issue",
    "unclear",
    "noise",
    "bad",
}


def detect_system_issues(result: dict[str, Any]) -> list[str]:
    """Return every issue Stage 2B can reasonably see.

    Beginner note: speech problems can overlap. A recording can be unclear
    because the tone is wrong, and it can also have uncertain boundaries. So we
    keep multiple labels instead of forcing the system to choose only one.
    """
    communication_label = result["communication_result"]["label"]
    boundary_confidence = result["tone_timing"]["boundary_confidence"]
    tone_score = result["tone_timing"]["overall_score"] or 0
    syllables = result["tone_timing"].get("syllables") or []
    lowest_syllable_tone = min(
        (int(syllable.get("tone_score", 100)) for syllable in syllables),
        default=100,
    )

    issues = []
    if communication_label in {"not_understood", "partly_understood"}:
        issues.append("unclear")
    if boundary_confidence == "low":
        issues.append("boundary_issue")
    if tone_score < 65 or lowest_syllable_tone < 55:
        issues.append("tone_issue")

    return issues or ["good"]


def system_prediction(result: dict[str, Any]) -> str:
    """Return the main system label for compact terminal output."""
    issues = detect_system_issues(result)
    priority = ["unclear", "tone_issue", "boundary_issue", "good"]
    return min(issues, key=lambda item: priority.index(item) if item in priority else 99)


def labels_agree(
    human_label: str,
    predicted_label: str,
    expected_issue: str = "",
    detected_issues: list[str] | None = None,
) -> bool:
    """Check broad agreement between human label and system label."""
    human_label = human_label.strip().lower()
    predicted_label = predicted_label.strip().lower()
    expected_issue = expected_issue.strip().lower()
    detected_issues = detected_issues or [predicted_label]

    if human_label == predicted_label:
        return True
    if expected_issue in {"boundary_uncertain", "boundary_issue", "boundary_too_early"}:
        return "boundary_issue" in detected_issues
    if human_label in GOOD_LABELS and predicted_label == "good":
        return True
    if human_label in ISSUE_LABELS and any(issue != "good" for issue in detected_issues):
        return True
    return False


def specific_labels_agree(
    human_label: str,
    predicted_label: str,
    expected_issue: str = "",
    detected_issues: list[str] | None = None,
) -> bool:
    """Check stricter agreement for the exact issue type.

    Broad agreement asks, "Did the system notice a problem?"
    Specific agreement asks, "Did it name the same problem type?"
    """
    human_label = human_label.strip().lower()
    predicted_label = predicted_label.strip().lower()
    expected_issue = expected_issue.strip().lower()
    detected_issues = detected_issues or [predicted_label]

    if human_label == predicted_label:
        return True
    if human_label in detected_issues:
        return True
    if expected_issue in {"boundary_uncertain", "boundary_issue", "boundary_too_early"}:
        return "boundary_issue" in detected_issues
    if expected_issue and expected_issue in detected_issues:
        return True
    return False


def read_manifest(path: Path) -> list[dict[str, str]]:
    """Read the human-labeled sample list."""
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def evaluate_row(
    row: dict[str, str],
    asr_model: Any,
    output_dir: Path,
) -> dict[str, Any]:
    """Run Stage 2B for one manifest row and compare it with the human label."""
    sample_id = row.get("id", "").strip() or Path(row["audio"]).stem
    target_text = row["text"].strip()
    audio_path = Path(row["audio"].strip())
    phrase_dir = output_dir / sample_id
    report_path = phrase_dir / "combined_report.json"
    plot_dir = phrase_dir / "plots"

    result = combine_results(target_text, audio_path, asr_model, plot_dir)
    save_json(result, report_path)

    detected_issues = detect_system_issues(result)
    predicted = system_prediction(result)
    human_label = row.get("human_label", "").strip().lower()
    expected_issue = row.get("expected_issue", "").strip()
    broad_agreement = (
        labels_agree(human_label, predicted, expected_issue, detected_issues)
        if human_label
        else None
    )
    specific_agreement = (
        specific_labels_agree(human_label, predicted, expected_issue, detected_issues)
        if human_label
        else None
    )

    return {
        "id": sample_id,
        "text": target_text,
        "audio": str(audio_path),
        "human_label": human_label,
        "expected_issue": expected_issue,
        "system_label": predicted,
        "system_issues": ";".join(detected_issues),
        "agreement": broad_agreement,
        "specific_agreement": specific_agreement,
        "asr_heard": result["asr"]["heard_text"],
        "asr_similarity": result["asr"]["text_similarity"],
        "communication_label": result["communication_result"]["label"],
        "readiness_score": result["communication_result"]["readiness_score"],
        "tone_timing_score": result["tone_timing"]["overall_score"],
        "boundary_confidence": result["tone_timing"]["boundary_confidence"],
        "main_feedback": result["communication_result"]["main_feedback"],
        "human_note": row.get("human_note", "").strip(),
        "json": str(report_path),
        "pitch_overview": result["plots"]["pitch_overview"] if result["plots"] else "",
    }


def write_summary(rows: list[dict[str, Any]], path: Path) -> None:
    """Save a CSV table that is easy to open in VS Code, Excel, or Google Sheets."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = sorted({key for row in rows for key in row.keys()})
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Evaluate Stage 2B against a small human-labeled sample manifest."
    )
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--model", default=DEFAULT_MODEL_NAME)
    parser.add_argument("--device", default="cpu")
    args = parser.parse_args()

    if not args.manifest.exists():
        print(f"Manifest not found: {args.manifest}")
        return 1

    rows = read_manifest(args.manifest)
    if not rows:
        print(f"Manifest is empty: {args.manifest}")
        return 1

    asr_model = build_model(args.model, args.device)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    results = []
    for row in rows:
        try:
            result = evaluate_row(row, asr_model, args.output_dir)
            results.append(result)
            agreement_text = (
                "unknown"
                if result["agreement"] is None
                else "yes"
                if result["agreement"]
                else "no"
            )
            print(
                f'{result["id"]}: human={result["human_label"] or "none"}, '
                f'system={result["system_label"]}, agreement={agreement_text}, '
                f'readiness={result["readiness_score"]}/100'
            )
        except Exception as exc:
            results.append(
                {
                    "id": row.get("id", ""),
                    "text": row.get("text", ""),
                    "audio": row.get("audio", ""),
                    "human_label": row.get("human_label", ""),
                    "error": str(exc),
                }
            )
            print(f'{row.get("id", row.get("audio", "sample"))}: ERROR {exc}')

    summary_path = args.output_dir / "evaluation_summary.csv"
    write_summary(results, summary_path)

    comparable = [row for row in results if row.get("agreement") is not None]
    if comparable:
        agreement_rate = sum(1 for row in comparable if row["agreement"]) / len(comparable)
        print(f"\nBroad agreement: {agreement_rate:.0%} ({len(comparable)} labeled samples)")
    specific_comparable = [row for row in results if row.get("specific_agreement") is not None]
    if specific_comparable:
        specific_rate = sum(1 for row in specific_comparable if row["specific_agreement"]) / len(
            specific_comparable
        )
        print(f"Specific agreement: {specific_rate:.0%} ({len(specific_comparable)} labeled samples)")
    print(f"Saved evaluation summary to {summary_path.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
