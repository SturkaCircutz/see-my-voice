from __future__ import annotations

import csv
import json
import re
import tarfile
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


REQUIRED_FIELDS = [
    "id",
    "text",
    "audio",
    "speaker_id",
    "split",
    "human_label",
    "expected_issue",
]
OPTIONAL_FIELDS = ["human_note"]
MANIFEST_FIELDS = REQUIRED_FIELDS + OPTIONAL_FIELDS
VALID_SPLITS = {"train", "val", "test"}
GOOD_LABELS = {"good", "clear", "acceptable", "native"}
ISSUE_LABELS = {
    "learner",
    "tone_issue",
    "timing_issue",
    "boundary_issue",
    "initial_issue",
    "final_issue",
    "phoneme_issue",
    "unclear",
    "noise",
    "bad",
}
VALID_HUMAN_LABELS = GOOD_LABELS | ISSUE_LABELS
SUPPORTED_AUDIO_SUFFIXES = {".wav", ".m4a", ".aac", ".mp3", ".caf", ".flac", ".webm"}
GOOGLE_DRIVE_FILE_RE = re.compile(r"https://drive\.google\.com/file/d/([^/]+)/view")
NTU_SECTION_RE = re.compile(
    r"(American learners|Spanish learners|Beginner level|Intermediate level|"
    r"https://drive\.google\.com/file/d/([^/]+)/view|Speaker\s+\d+\s+-\s+S\d+)"
)
CHINESE_TEXT_RE = re.compile(r"[\u3400-\u9fff]")
PROTOTYPE_MIN_SAMPLES = 500
USEFUL_MIN_SAMPLES = 5_000
STRONGER_MIN_SAMPLES = 50_000
COLLECTION_PLAN_FIELDS = [
    "slot_id",
    "text",
    "speaker_id",
    "split",
    "target_label",
    "target_issue",
    "audio_filename",
    "notes",
]
DEFAULT_COLLECTION_TEXTS = [
    "你好",
    "谢谢",
    "朋友",
    "我很好",
    "我要吃饭",
    "我要喝水",
    "我想吃饭",
    "请再说一遍",
    "今天很好",
    "明天见",
    "老师你好",
    "我学习中文",
    "这个很难",
    "请慢一点",
    "我听不懂",
    "现在几点",
    "我要去学校",
    "你说得很好",
    "请帮我练习",
    "我喜欢普通话",
]
ISSUE_ROTATION = [
    ("good", ""),
    ("good", ""),
    ("good", ""),
    ("tone_issue", "tone_issue"),
    ("initial_issue", "initial_issue"),
    ("final_issue", "final_issue"),
    ("unclear", "unclear"),
    ("timing_issue", "timing_issue"),
]


@dataclass
class ManifestValidationReport:
    manifest: str
    n_samples: int
    n_speakers: int
    split_counts: dict[str, int]
    label_counts: dict[str, int]
    n_missing_audio: int
    missing_audio: list[str]
    errors: list[str]
    warnings: list[str]
    readiness: str

    @property
    def ok(self) -> bool:
        return not self.errors


def read_manifest(path: Path) -> tuple[list[dict[str, str]], list[str]]:
    """Read a training manifest and return rows plus field names."""
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return list(reader), list(reader.fieldnames or [])


def write_manifest(rows: list[dict[str, Any]], path: Path) -> None:
    """Write rows using the stable Stage 3B training manifest schema."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=MANIFEST_FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in MANIFEST_FIELDS})


def write_collection_plan(rows: list[dict[str, Any]], path: Path) -> None:
    """Write planned recording slots without pretending they are trainable samples yet."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLLECTION_PLAN_FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in COLLECTION_PLAN_FIELDS})


def write_json(data: Any, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def resolve_audio_path(audio_value: str, manifest_path: Path, project_root: Path | None = None) -> Path:
    """Resolve an audio path from project root first, then manifest folder."""
    project_root = project_root or Path.cwd()
    audio_path = Path(audio_value.strip())
    if audio_path.is_absolute():
        return audio_path

    project_relative = project_root / audio_path
    if project_relative.exists():
        return project_relative

    manifest_relative = manifest_path.parent / audio_path
    if manifest_relative.exists():
        return manifest_relative

    return project_relative


def readiness_for_count(n_samples: int) -> str:
    if n_samples >= STRONGER_MIN_SAMPLES:
        return "stronger_model_ready"
    if n_samples >= USEFUL_MIN_SAMPLES:
        return "useful_model_ready"
    if n_samples >= PROTOTYPE_MIN_SAMPLES:
        return "prototype_ready"
    return "below_prototype_minimum"


def display_path(path: Path, project_root: Path) -> str:
    try:
        return str(path.relative_to(project_root))
    except ValueError:
        return str(path)


def validation_report(
    manifest_path: Path,
    require_audio: bool = False,
    min_samples: int = PROTOTYPE_MIN_SAMPLES,
    project_root: Path | None = None,
) -> ManifestValidationReport:
    """Validate schema, labels, split coverage, scale, and optional audio presence."""
    errors: list[str] = []
    warnings: list[str] = []
    missing_audio: list[str] = []
    project_root = project_root or Path.cwd()

    if not manifest_path.exists():
        return ManifestValidationReport(
            manifest=str(manifest_path),
            n_samples=0,
            n_speakers=0,
            split_counts={},
            label_counts={},
            n_missing_audio=0,
            missing_audio=[],
            errors=[f"Manifest not found: {manifest_path}"],
            warnings=[],
            readiness="missing",
        )

    rows, fieldnames = read_manifest(manifest_path)
    missing_fields = [field for field in REQUIRED_FIELDS if field not in fieldnames]
    if missing_fields:
        errors.append(f"Missing required column(s): {', '.join(missing_fields)}")

    ids: set[str] = set()
    split_counts: Counter[str] = Counter()
    label_counts: Counter[str] = Counter()
    speaker_splits: dict[str, set[str]] = defaultdict(set)

    for index, row in enumerate(rows, start=2):
        sample_id = row.get("id", "").strip()
        text = row.get("text", "").strip()
        audio = row.get("audio", "").strip()
        speaker_id = row.get("speaker_id", "").strip()
        split = row.get("split", "").strip().lower()
        human_label = row.get("human_label", "").strip().lower()
        human_note = row.get("human_note", "").strip().lower()

        if not sample_id:
            errors.append(f"row {index}: id is required")
        elif sample_id in ids:
            errors.append(f"row {index}: duplicate id '{sample_id}'")
        ids.add(sample_id)

        if not text:
            errors.append(f"row {index}: text is required")
        if not audio:
            errors.append(f"row {index}: audio is required")
        elif Path(audio).suffix.lower() not in SUPPORTED_AUDIO_SUFFIXES:
            warnings.append(f"row {index}: audio suffix may be unsupported: {audio}")
        if not speaker_id:
            errors.append(f"row {index}: speaker_id is required")

        if split not in VALID_SPLITS:
            errors.append(f"row {index}: split must be one of train, val, test")
        else:
            split_counts[split] += 1

        if human_label not in VALID_HUMAN_LABELS:
            errors.append(f"row {index}: unsupported human_label '{human_label}'")
        else:
            label_counts[human_label] += 1

        if human_label == "learner" and "placeholder" in human_note:
            warnings.append(
                f"row {index}: learner row uses placeholder text and needs transcript alignment before CTC training"
            )

        if speaker_id and split:
            speaker_splits[speaker_id].add(split)

        if audio:
            resolved_audio = resolve_audio_path(audio, manifest_path, project_root)
            if not resolved_audio.exists():
                missing_audio.append(display_path(resolved_audio, project_root))

    for split in sorted(VALID_SPLITS):
        if split_counts[split] == 0:
            warnings.append(f"No {split} samples are present.")

    has_good = any(label_counts[label] > 0 for label in GOOD_LABELS)
    has_issue = any(label_counts[label] > 0 for label in ISSUE_LABELS)
    if not has_good:
        warnings.append("Manifest has no good/native recordings.")
    if not has_issue:
        warnings.append("Manifest has no learner mistake recordings.")

    leaking_speakers = sorted(
        speaker_id for speaker_id, splits in speaker_splits.items() if len(splits) > 1
    )
    if leaking_speakers:
        warnings.append(
            "Speaker(s) appear in multiple splits; future full training should split by speaker: "
            + ", ".join(leaking_speakers[:10])
        )

    if len(rows) < min_samples:
        warnings.append(
            f"Only {len(rows)} samples are present; target minimum for prototype training is "
            f"{PROTOTYPE_MIN_SAMPLES} recordings."
        )

    if require_audio and missing_audio:
        errors.append(f"{len(missing_audio)} audio file(s) are missing.")

    return ManifestValidationReport(
        manifest=str(manifest_path),
        n_samples=len(rows),
        n_speakers=len({row.get("speaker_id", "").strip() for row in rows if row.get("speaker_id", "").strip()}),
        split_counts=dict(sorted(split_counts.items())),
        label_counts=dict(sorted(label_counts.items())),
        n_missing_audio=len(missing_audio),
        missing_audio=missing_audio[:50],
        errors=errors,
        warnings=warnings,
        readiness=readiness_for_count(len(rows)),
    )


def report_to_dict(report: ManifestValidationReport) -> dict[str, Any]:
    return asdict(report) | {"ok": report.ok}


def split_for_speaker_index(speaker_index: int) -> str:
    """Assign a speaker to one split so speaker identity does not leak across splits."""
    remainder = speaker_index % 10
    if remainder == 8:
        return "val"
    if remainder == 9:
        return "test"
    return "train"


def split_for_speaker_id(speaker_id: str) -> str:
    match = re.search(r"(\d+)$", speaker_id)
    if not match:
        return "train"
    return split_for_speaker_index(int(match.group(1)) - 1)


def build_collection_plan(
    n_recordings: int = PROTOTYPE_MIN_SAMPLES,
    n_speakers: int = 50,
    texts: list[str] | None = None,
    audio_dir: str = "data/audio",
) -> list[dict[str, str]]:
    """Create a balanced recording plan for the first real phoneme manifest.

    The rows are not training samples yet. They are slots for collection: once
    audio exists for a slot, it can be imported into data/phoneme_manifest.csv.
    """
    if n_recordings < 1:
        raise ValueError("n_recordings must be at least 1")
    if n_speakers < 1:
        raise ValueError("n_speakers must be at least 1")

    texts = texts or DEFAULT_COLLECTION_TEXTS
    if not texts:
        raise ValueError("At least one target text is required")

    rows = []
    for index in range(n_recordings):
        speaker_index = index % n_speakers
        speaker_id = f"s{speaker_index + 1:03d}"
        split = split_for_speaker_index(speaker_index)
        label, issue = ISSUE_ROTATION[index % len(ISSUE_ROTATION)]
        slot_id = f"proto_{index + 1:04d}"
        rows.append(
            {
                "slot_id": slot_id,
                "text": texts[index % len(texts)],
                "speaker_id": speaker_id,
                "split": split,
                "target_label": label,
                "target_issue": issue,
                "audio_filename": f"{audio_dir}/{slot_id}.wav",
                "notes": "Record one clean take for good slots; record the named learner issue for issue slots.",
            }
        )
    return rows


def collection_plan_summary(rows: list[dict[str, str]]) -> dict[str, Any]:
    speaker_ids = {row.get("speaker_id", "") for row in rows if row.get("speaker_id", "")}
    split_counts = Counter(row.get("split", "") for row in rows)
    label_counts = Counter(row.get("target_label", "") for row in rows)
    issue_counts = Counter(row.get("target_issue", "") or "none" for row in rows)
    text_counts = Counter(row.get("text", "") for row in rows)
    return {
        "n_slots": len(rows),
        "n_speakers": len(speaker_ids),
        "split_counts": dict(sorted(split_counts.items())),
        "target_label_counts": dict(sorted(label_counts.items())),
        "target_issue_counts": dict(sorted(issue_counts.items())),
        "n_unique_texts": len(text_counts),
        "top_texts": dict(text_counts.most_common(10)),
        "notes": [
            "This is a collection plan, not a training manifest.",
            "Only import rows into data/phoneme_manifest.csv after their audio files exist.",
            "Speakers are assigned to exactly one split to avoid speaker leakage.",
        ],
    }


def read_collection_plan(path: Path) -> tuple[list[dict[str, str]], list[str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return list(reader), list(reader.fieldnames or [])


def manifest_rows_from_completed_plan(
    collection_plan_path: Path,
    project_root: Path | None = None,
    existing_ids: set[str] | None = None,
) -> tuple[list[dict[str, str]], list[str]]:
    """Convert collection-plan rows with present audio into manifest rows."""
    project_root = project_root or Path.cwd()
    existing_ids = existing_ids or set()
    plan_rows, fieldnames = read_collection_plan(collection_plan_path)
    missing_fields = [field for field in COLLECTION_PLAN_FIELDS if field not in fieldnames]
    if missing_fields:
        raise ValueError(f"Collection plan missing required column(s): {', '.join(missing_fields)}")

    rows = []
    skipped_missing_audio = []
    for row in plan_rows:
        sample_id = row.get("slot_id", "").strip()
        audio = row.get("audio_filename", "").strip()
        audio_path = resolve_audio_path(audio, collection_plan_path, project_root)
        if not audio_path.exists():
            skipped_missing_audio.append(audio)
            continue
        if sample_id in existing_ids:
            continue
        rows.append(
            {
                "id": sample_id,
                "text": row.get("text", "").strip(),
                "audio": audio,
                "speaker_id": row.get("speaker_id", "").strip(),
                "split": row.get("split", "").strip(),
                "human_label": row.get("target_label", "").strip(),
                "expected_issue": row.get("target_issue", "").strip(),
                "human_note": row.get("notes", "").strip(),
            }
        )
    return rows, skipped_missing_audio


def parse_aishell_transcripts(path: Path) -> dict[str, str]:
    """Read AISHELL transcript files: utterance_id followed by Chinese text."""
    transcripts: dict[str, str] = {}
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            parts = line.strip().split(maxsplit=1)
            if len(parts) != 2:
                continue
            utterance_id, text = parts
            transcripts[utterance_id] = text.replace(" ", "")
    return transcripts


def split_from_aishell_path(path: Path) -> str:
    path_parts = set(path.parts)
    if "dev" in path_parts:
        return "val"
    if "test" in path_parts:
        return "test"
    return "train"


def speaker_from_aishell_path(path: Path) -> str:
    for part in reversed(path.parts):
        if re.fullmatch(r"S\d{4}", part):
            return part
    return path.parent.name


def rows_from_aishell(
    aishell_root: Path,
    manifest_audio_prefix: str = "data/external/aishell",
    limit: int | None = None,
    existing_ids: set[str] | None = None,
) -> tuple[list[dict[str, str]], list[str]]:
    """Build manifest rows from an extracted AISHELL-1 style directory.

    Expected files:
    - transcript/aishell_transcript_v0.8.txt
    - wav/train/*/*.wav, wav/dev/*/*.wav, wav/test/*/*.wav
    """
    existing_ids = existing_ids or set()
    transcript_path = aishell_root / "transcript" / "aishell_transcript_v0.8.txt"
    if not transcript_path.exists():
        raise FileNotFoundError(f"AISHELL transcript not found: {transcript_path}")

    transcripts = parse_aishell_transcripts(transcript_path)
    rows = []
    skipped = []
    for audio_path in sorted((aishell_root / "wav").rglob("*.wav")):
        utterance_id = audio_path.stem
        text = transcripts.get(utterance_id, "")
        if not text:
            skipped.append(str(audio_path))
            continue

        sample_id = f"aishell_{utterance_id}"
        if sample_id in existing_ids:
            continue

        relative_audio = audio_path.relative_to(aishell_root)
        manifest_audio = str(Path(manifest_audio_prefix) / relative_audio)
        rows.append(
            {
                "id": sample_id,
                "text": text,
                "audio": manifest_audio,
                "speaker_id": speaker_from_aishell_path(audio_path),
                "split": split_from_aishell_path(audio_path),
                "human_label": "native",
                "expected_issue": "",
                "human_note": "Imported from AISHELL-style Mandarin read speech.",
            }
        )
        if limit is not None and len(rows) >= limit:
            break

    return rows, skipped


def download_aishell_subset(
    output_root: Path,
    n_speaker_archives: int = 1,
    source_base_url: str = "https://huggingface.co/datasets/AISHELL/AISHELL-1/resolve/main",
) -> list[Path]:
    """Download and extract a small AISHELL subset from speaker tarballs."""
    if n_speaker_archives < 1:
        raise ValueError("n_speaker_archives must be at least 1")

    transcript_url = f"{source_base_url}/data_aishell/transcript/aishell_transcript_v0.8.txt"
    transcript_path = output_root / "transcript" / "aishell_transcript_v0.8.txt"
    if not transcript_path.exists():
        download_url(transcript_url, transcript_path)

    archives = []
    for speaker_number in range(2, 2 + n_speaker_archives):
        speaker = f"S{speaker_number:04d}"
        archive_url = f"{source_base_url}/data_aishell/wav/{speaker}.tar.gz"
        archive_path = output_root / "archives" / f"{speaker}.tar.gz"
        if not archive_path.exists():
            download_url(archive_url, archive_path)
        archives.append(archive_path)

        speaker_dir = output_root / "wav" / "train" / speaker
        if speaker_dir.exists():
            continue
        speaker_dir.mkdir(parents=True, exist_ok=True)
        with tarfile.open(archive_path, "r:gz") as archive:
            archive.extractall(speaker_dir)

        nested_dir = speaker_dir / speaker
        if nested_dir.exists() and nested_dir.is_dir():
            for child in nested_dir.iterdir():
                child.replace(speaker_dir / child.name)
            nested_dir.rmdir()

    return archives


def google_drive_download_url(file_id: str) -> str:
    return f"https://drive.google.com/uc?export=download&id={urllib.parse.quote(file_id)}"


def download_url(url: str, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=120) as response:
        output_path.write_bytes(response.read())


def extract_google_drive_file_ids_from_html(html: str) -> list[str]:
    seen = set()
    file_ids = []
    for match in GOOGLE_DRIVE_FILE_RE.finditer(html):
        file_id = match.group(1)
        if file_id not in seen:
            file_ids.append(file_id)
            seen.add(file_id)
    return file_ids


def strip_html_tags(fragment: str) -> str:
    text = re.sub(r"<[^>]+>", "\n", fragment)
    text = urllib.parse.unquote(text)
    text = (
        text.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
    )
    return re.sub(r"\s+", " ", text).strip()


def clean_chinese_prompt(text: str) -> str:
    """Keep Chinese prompt text and punctuation; remove spaces from page layout."""
    text = text.replace(" ", "")
    return "".join(
        char
        for char in text
        if "\u3400" <= char <= "\u9fff" or char in "，。！？：；、「」『』,.?!:"
    )


def extract_ntu_prompt_texts_from_html(html: str) -> dict[str, str]:
    """Extract beginner/intermediate Chinese reading prompts from the corpus page."""
    prompts: dict[str, str] = {}
    heading_pairs = [
        ("beginner", "Beginner-level text", "Intermediate-level text"),
        ("intermediate", "Intermediate-level text", "Google Sites"),
    ]
    for key, start_marker, end_marker in heading_pairs:
        start = html.find(start_marker)
        if start < 0:
            continue
        content_start = html.find("</h2>", start)
        if content_start < 0:
            content_start = start + len(start_marker)
        end = html.find(end_marker, content_start + 1)
        if end < 0:
            end = len(html)
        fragment = html[content_start:end]
        paragraph_texts = []
        for paragraph in re.findall(r"<p\b[^>]*>(.*?)</p>", fragment, flags=re.DOTALL):
            stripped = strip_html_tags(paragraph)
            if CHINESE_TEXT_RE.search(stripped):
                paragraph_texts.append(clean_chinese_prompt(stripped))
        prompt = "".join(paragraph_texts)
        if prompt:
            prompts[key] = prompt
    return prompts


def extract_ntu_audio_entries_from_html(html: str) -> list[dict[str, str]]:
    """Extract linked learner audio entries with their prompt level and L1 group."""
    entries = []
    current_group = ""
    current_level = ""
    pending_file_id = ""
    for match in NTU_SECTION_RE.finditer(html):
        token = match.group(1)
        file_id = match.group(2)
        if token in {"American learners", "Spanish learners"}:
            current_group = "american" if token.startswith("American") else "spanish"
        elif token in {"Beginner level", "Intermediate level"}:
            current_level = "beginner" if token.startswith("Beginner") else "intermediate"
        elif file_id:
            pending_file_id = file_id
        elif pending_file_id and token.startswith("Speaker"):
            speaker_match = re.search(r"S(\d+)", token)
            speaker_id = speaker_match.group(1) if speaker_match else str(len(entries) + 1)
            entries.append(
                {
                    "file_id": pending_file_id,
                    "group": current_group or "unknown",
                    "level": current_level or "unknown",
                    "speaker_id": speaker_id,
                }
            )
            pending_file_id = ""
    return entries


def fetch_ntu_page_metadata(page_url: str) -> tuple[dict[str, str], list[dict[str, str]]]:
    request = urllib.request.Request(page_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        html = response.read().decode("utf-8", errors="replace")
    return extract_ntu_prompt_texts_from_html(html), extract_ntu_audio_entries_from_html(html)


def fetch_google_drive_file_ids(page_url: str) -> list[str]:
    request = urllib.request.Request(page_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        html = response.read().decode("utf-8", errors="replace")
    return extract_google_drive_file_ids_from_html(html)


def download_ntu_learner_audio(
    page_url: str,
    output_dir: Path,
    limit: int | None = None,
) -> list[Path]:
    """Download linked NTU L2 Mandarin audio files from the public corpus page."""
    file_ids = fetch_google_drive_file_ids(page_url)
    if limit is not None:
        file_ids = file_ids[:limit]

    downloaded = []
    for index, file_id in enumerate(file_ids, start=1):
        output_path = output_dir / f"ntu_l2_mandarin_{index:04d}.m4a"
        if not output_path.exists():
            download_url(google_drive_download_url(file_id), output_path)
        downloaded.append(output_path)
    return downloaded


def download_ntu_learner_audio_with_metadata(
    page_url: str,
    output_dir: Path,
    limit: int | None = None,
) -> tuple[dict[str, str], list[dict[str, str]]]:
    """Download NTU learner audio and keep page-derived level/speaker metadata."""
    prompts, entries = fetch_ntu_page_metadata(page_url)
    if limit is not None:
        entries = entries[:limit]

    for index, entry in enumerate(entries, start=1):
        output_path = output_dir / f"ntu_l2_mandarin_{index:04d}.m4a"
        if not output_path.exists():
            download_url(google_drive_download_url(entry["file_id"]), output_path)
        entry["audio_path"] = str(output_path)
        entry["audio_filename"] = output_path.name
    return prompts, entries


def rows_from_ntu_learner_audio(
    audio_paths: list[Path],
    manifest_audio_prefix: str = "data/external/ntu_l2_mandarin",
    existing_ids: set[str] | None = None,
) -> list[dict[str, str]]:
    """Build coarse learner-speech manifest rows from downloaded NTU audio files."""
    existing_ids = existing_ids or set()
    rows = []
    prompts = DEFAULT_COLLECTION_TEXTS
    for index, audio_path in enumerate(sorted(audio_paths), start=1):
        sample_id = f"ntu_l2_{index:04d}"
        if sample_id in existing_ids:
            continue
        split = "test" if index % 10 == 0 else "val" if index % 10 == 9 else "train"
        rows.append(
            {
                "id": sample_id,
                "text": prompts[(index - 1) % len(prompts)],
                "audio": str(Path(manifest_audio_prefix) / audio_path.name),
                "speaker_id": f"ntu_l2_s{((index - 1) % 50) + 1:03d}",
                "split": split,
                "human_label": "learner",
                "expected_issue": "phoneme_issue",
                "human_note": "Imported from public NTU L2 Mandarin learner speech; target text is a coarse placeholder unless manually aligned.",
            }
        )
    return rows


def rows_from_ntu_page_entries(
    prompts: dict[str, str],
    entries: list[dict[str, str]],
    manifest_audio_prefix: str = "data/external/ntu_l2_mandarin",
    existing_ids: set[str] | None = None,
) -> list[dict[str, str]]:
    """Build transcript-aligned learner rows from NTU page metadata."""
    existing_ids = existing_ids or set()
    rows = []
    for index, entry in enumerate(entries, start=1):
        sample_id = f"ntu_l2_{index:04d}"
        if sample_id in existing_ids:
            continue
        level = entry.get("level", "unknown")
        text = prompts.get(level, "")
        group = entry.get("group", "unknown")
        speaker = entry.get("speaker_id", f"{index:03d}")
        speaker_id = f"ntu_l2_{group}_s{speaker}"
        split = split_for_speaker_id(speaker_id)
        rows.append(
            {
                "id": sample_id,
                "text": text,
                "audio": str(Path(manifest_audio_prefix) / entry.get("audio_filename", f"ntu_l2_mandarin_{index:04d}.m4a")),
                "speaker_id": speaker_id,
                "split": split,
                "human_label": "learner",
                "expected_issue": "phoneme_issue",
                "human_note": f"Imported from public NTU L2 Mandarin learner speech; {group} learner, {level} reading prompt.",
            }
        )
    return rows


def seed_rows_from_evaluation_manifest(
    evaluation_manifest_path: Path,
    default_speaker_id: str = "speaker_unknown_001",
) -> list[dict[str, str]]:
    """Convert the small evaluation manifest into the new training-manifest shape.

    This is a seed only. It preserves existing labels and gives each row the
    required schema so future recordings can be appended without changing
    downstream Stage 3B tooling.
    """
    rows, _fieldnames = read_manifest(evaluation_manifest_path)
    seed_rows = []
    split_cycle = ["train", "train", "train", "train", "val", "train", "train", "train", "val", "train", "test"]
    for index, row in enumerate(rows):
        seed_rows.append(
            {
                "id": row.get("id", "").strip(),
                "text": row.get("text", "").strip(),
                "audio": row.get("audio", "").strip(),
                "speaker_id": default_speaker_id,
                "split": split_cycle[index % len(split_cycle)],
                "human_label": row.get("human_label", "").strip(),
                "expected_issue": row.get("expected_issue", "").strip(),
                "human_note": row.get("human_note", "").strip(),
            }
        )
    return seed_rows
