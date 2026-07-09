import csv
import sys
import tempfile
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from training_manifest import (
    MANIFEST_FIELDS,
    PROTOTYPE_MIN_SAMPLES,
    build_collection_plan,
    collection_plan_summary,
    extract_ntu_audio_entries_from_html,
    extract_ntu_prompt_texts_from_html,
    extract_google_drive_file_ids_from_html,
    manifest_rows_from_completed_plan,
    rows_from_aishell,
    rows_from_ntu_page_entries,
    rows_from_ntu_learner_audio,
    seed_rows_from_evaluation_manifest,
    validation_report,
    write_collection_plan,
    write_manifest,
)


class TrainingManifestTest(unittest.TestCase):
    def test_seed_rows_preserve_existing_evaluation_labels(self):
        source = Path(__file__).resolve().parents[1] / "samples" / "evaluation_manifest.csv"
        rows = seed_rows_from_evaluation_manifest(source, default_speaker_id="speaker_seed")

        self.assertEqual(len(rows), 11)
        self.assertEqual(set(MANIFEST_FIELDS), set(rows[0].keys()))
        self.assertEqual(rows[0]["id"], "nihao")
        self.assertEqual(rows[0]["text"], "你好")
        self.assertEqual(rows[0]["speaker_id"], "speaker_seed")
        self.assertIn(rows[0]["split"], {"train", "val", "test"})
        self.assertEqual(rows[0]["human_label"], "good")
        self.assertEqual(rows[0]["expected_issue"], "boundary_uncertain")

    def test_validation_accepts_public_prototype_manifest(self):
        source = Path(__file__).resolve().parents[1] / "data" / "phoneme_manifest.csv"
        report = validation_report(source, min_samples=PROTOTYPE_MIN_SAMPLES)

        self.assertTrue(report.ok)
        self.assertEqual(report.n_samples, 500)
        self.assertEqual(report.readiness, "prototype_ready")
        self.assertEqual(report.label_counts["native"], 450)
        self.assertEqual(report.label_counts["learner"], 50)

    def test_validation_fails_missing_required_columns(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "bad_manifest.csv"
            with path.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(handle, fieldnames=["id", "text", "audio"])
                writer.writeheader()
                writer.writerow({"id": "x", "text": "你好", "audio": "missing.wav"})

            report = validation_report(path)

        self.assertFalse(report.ok)
        self.assertTrue(any("Missing required column" in error for error in report.errors))

    def test_require_audio_fails_when_audio_is_missing(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "manifest.csv"
            write_manifest(
                [
                    {
                        "id": "x",
                        "text": "你好",
                        "audio": "data/audio/missing.wav",
                        "speaker_id": "s001",
                        "split": "train",
                        "human_label": "good",
                        "expected_issue": "",
                    }
                ],
                path,
            )

            report = validation_report(path, require_audio=True)

        self.assertFalse(report.ok)
        self.assertTrue(any("audio file(s) are missing" in error for error in report.errors))

    def test_collection_plan_reaches_prototype_target_with_speaker_safe_splits(self):
        rows = build_collection_plan(n_recordings=PROTOTYPE_MIN_SAMPLES, n_speakers=50)
        summary = collection_plan_summary(rows)

        self.assertEqual(summary["n_slots"], 500)
        self.assertEqual(summary["n_speakers"], 50)
        self.assertEqual(summary["split_counts"], {"test": 50, "train": 400, "val": 50})
        self.assertGreaterEqual(summary["target_label_counts"]["good"], 100)
        self.assertGreater(summary["target_label_counts"]["tone_issue"], 0)
        self.assertGreater(summary["target_label_counts"]["initial_issue"], 0)
        self.assertGreater(summary["target_label_counts"]["final_issue"], 0)

    def test_completed_collection_plan_audio_imports_to_manifest_rows(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            audio_dir = root / "data" / "audio"
            audio_dir.mkdir(parents=True)
            present_audio = audio_dir / "proto_0001.wav"
            present_audio.write_bytes(b"fake wav placeholder")

            plan_path = root / "data" / "phoneme_collection_plan.csv"
            write_collection_plan(
                [
                    {
                        "slot_id": "proto_0001",
                        "text": "你好",
                        "speaker_id": "s001",
                        "split": "train",
                        "target_label": "good",
                        "target_issue": "",
                        "audio_filename": "data/audio/proto_0001.wav",
                        "notes": "completed",
                    },
                    {
                        "slot_id": "proto_0002",
                        "text": "谢谢",
                        "speaker_id": "s001",
                        "split": "train",
                        "target_label": "tone_issue",
                        "target_issue": "tone_issue",
                        "audio_filename": "data/audio/proto_0002.wav",
                        "notes": "missing",
                    },
                ],
                plan_path,
            )

            rows, skipped = manifest_rows_from_completed_plan(plan_path, project_root=root)

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["id"], "proto_0001")
        self.assertEqual(rows[0]["audio"], "data/audio/proto_0001.wav")
        self.assertEqual(rows[0]["human_label"], "good")
        self.assertEqual(skipped, ["data/audio/proto_0002.wav"])

    def test_aishell_import_builds_native_manifest_rows(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / "aishell"
            transcript_dir = root / "transcript"
            wav_dir = root / "wav" / "train" / "S0001" / "train" / "S0001"
            transcript_dir.mkdir(parents=True)
            wav_dir.mkdir(parents=True)
            (transcript_dir / "aishell_transcript_v0.8.txt").write_text(
                "BAC009S0001W0123 你 好\n",
                encoding="utf-8",
            )
            (wav_dir / "BAC009S0001W0123.wav").write_bytes(b"fake wav")

            rows, skipped = rows_from_aishell(root, limit=10)

        self.assertEqual(skipped, [])
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["id"], "aishell_BAC009S0001W0123")
        self.assertEqual(rows[0]["text"], "你好")
        self.assertEqual(
            rows[0]["audio"],
            "data/external/aishell/wav/train/S0001/train/S0001/BAC009S0001W0123.wav",
        )
        self.assertEqual(rows[0]["speaker_id"], "S0001")
        self.assertEqual(rows[0]["split"], "train")
        self.assertEqual(rows[0]["human_label"], "native")

    def test_google_drive_file_ids_are_extracted_once(self):
        html = """
        <a href="https://drive.google.com/file/d/abc123/view?usp=sharing">one</a>
        <a href="https://drive.google.com/file/d/abc123/view?usp=sharing">duplicate</a>
        <a href="https://drive.google.com/file/d/def456/view?usp=sharing">two</a>
        """

        self.assertEqual(extract_google_drive_file_ids_from_html(html), ["abc123", "def456"])

    def test_ntu_learner_audio_rows_are_marked_as_learner_issue_rows(self):
        rows = rows_from_ntu_learner_audio([Path("ntu_l2_mandarin_0001.m4a")])

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["id"], "ntu_l2_0001")
        self.assertEqual(rows[0]["audio"], "data/external/ntu_l2_mandarin/ntu_l2_mandarin_0001.m4a")
        self.assertEqual(rows[0]["human_label"], "learner")
        self.assertEqual(rows[0]["expected_issue"], "phoneme_issue")

    def test_ntu_page_metadata_maps_audio_to_reading_prompt(self):
        html = """
        <span>American learners</span>
        <span>Beginner level</span>
        <a href="https://drive.google.com/file/d/file_a/view?usp=drive_link"><span>Speaker 1 - S1</span></a>
        <span>Intermediate level</span>
        <a href="https://drive.google.com/file/d/file_b/view?usp=drive_link"><span>Speaker 2 - S2</span></a>
        <h2>Beginner-level text</h2><p><span>他們都很忙。</span></p>
        <h2>Intermediate-level text</h2><p><span>今天早上我有一節聽力課。</span></p>
        <div>Google Sites</div>
        """
        prompts = extract_ntu_prompt_texts_from_html(html)
        entries = extract_ntu_audio_entries_from_html(html)
        for index, entry in enumerate(entries, start=1):
            entry["audio_filename"] = f"ntu_l2_mandarin_{index:04d}.m4a"

        rows = rows_from_ntu_page_entries(prompts, entries)

        self.assertEqual(prompts["beginner"], "他們都很忙。")
        self.assertEqual(prompts["intermediate"], "今天早上我有一節聽力課。")
        self.assertEqual(entries[0]["level"], "beginner")
        self.assertEqual(entries[1]["level"], "intermediate")
        self.assertEqual(rows[0]["text"], "他們都很忙。")
        self.assertEqual(rows[1]["text"], "今天早上我有一節聽力課。")
        self.assertEqual(rows[0]["speaker_id"], "ntu_l2_american_s1")

    def test_validation_warns_about_placeholder_learner_transcripts(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            audio_dir = root / "data" / "external" / "ntu_l2_mandarin"
            audio_dir.mkdir(parents=True)
            (audio_dir / "ntu_l2_mandarin_0001.m4a").write_bytes(b"fake audio")
            manifest_path = root / "manifest.csv"
            write_manifest(
                [
                    {
                        "id": "ntu_l2_0001",
                        "text": "你好",
                        "audio": "data/external/ntu_l2_mandarin/ntu_l2_mandarin_0001.m4a",
                        "speaker_id": "ntu_l2_s001",
                        "split": "train",
                        "human_label": "learner",
                        "expected_issue": "phoneme_issue",
                        "human_note": "coarse placeholder text",
                    }
                ],
                manifest_path,
            )

            report = validation_report(manifest_path, project_root=root, require_audio=True)

        self.assertTrue(report.ok)
        self.assertTrue(any("placeholder text" in warning for warning in report.warnings))


if __name__ == "__main__":
    unittest.main()
