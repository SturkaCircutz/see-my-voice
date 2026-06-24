from __future__ import annotations

import argparse
import csv
import json
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any

import soundfile as sf

from stage1_pronunciation import SAMPLE_RATE, load_audio


DEFAULT_SAMPLES_DIR = Path("samples")
DEFAULT_OUTPUT_DIR = Path("asr_baseline_results")
DEFAULT_MODEL_NAME = "paraformer-zh"


def normalize_chinese_text(text: str) -> str:
    """Keep only Chinese characters, letters, and numbers for fair comparison.

    Beginner note: ASR output may contain spaces or punctuation, but those do
    not mean the speaker was misunderstood. This function removes punctuation
    so "你好。" and "你好" are treated as the same sentence.
    """
    return "".join(re.findall(r"[\u4e00-\u9fffA-Za-z0-9]+", text)).lower()


def edit_distance(left: str, right: str) -> int:
    """Count the minimum insert/delete/replace edits between two strings.

    This is a tiny version of Levenshtein distance. We use it so the script can
    run without adding another dependency just to compare two short phrases.
    """
    rows = len(left) + 1
    cols = len(right) + 1
    dp = [[0] * cols for _ in range(rows)]

    for i in range(rows):
        dp[i][0] = i
    for j in range(cols):
        dp[0][j] = j

    for i in range(1, rows):
        for j in range(1, cols):
            replace_cost = 0 if left[i - 1] == right[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + replace_cost,
            )

    return dp[-1][-1]


def text_similarity(target: str, predicted: str) -> float:
    """Return a simple 0-100 score for how close the ASR text is to the target."""
    target_norm = normalize_chinese_text(target)
    predicted_norm = normalize_chinese_text(predicted)
    max_len = max(len(target_norm), len(predicted_norm), 1)
    distance = edit_distance(target_norm, predicted_norm)
    return round(max(0.0, 100.0 * (1.0 - distance / max_len)), 1)


def text_from_audio_filename(audio_path: Path) -> str:
    """Use the sample filename as target text, e.g. samples/我要吃饭.m4a -> 我要吃饭."""
    return audio_path.stem


def write_temp_wav(audio_path: Path) -> Path:
    """Convert any supported input audio to a temporary 16kHz mono WAV file.

    Beginner note: ASR models are usually happiest with clean WAV input. Your
    recordings can still be .m4a in samples/; this helper quietly converts them
    before sending them to the ASR model.
    """
    audio, sample_rate = load_audio(audio_path, SAMPLE_RATE)
    temp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    temp_path = Path(temp.name)
    temp.close()
    sf.write(temp_path, audio, sample_rate)
    return temp_path


def extract_asr_text(result: Any) -> str:
    """Extract plain recognized text from FunASR's result object.

    FunASR can return a list of dictionaries, a dictionary, or sometimes plain
    text depending on model/version. This function keeps the rest of our code
    stable by converting those shapes into one string.
    """
    if isinstance(result, str):
        return result
    if isinstance(result, dict):
        return str(result.get("text", ""))
    if isinstance(result, list):
        pieces = []
        for item in result:
            if isinstance(item, dict):
                pieces.append(str(item.get("text", "")))
            else:
                pieces.append(str(item))
        return "".join(pieces)
    return str(result)


def check_output_with_ffmpeg_permission_fallback(original_check_output, *args, **kwargs):
    """Treat blocked ffmpeg probes like missing ffmpeg so FunASR can fall back."""
    try:
        return original_check_output(*args, **kwargs)
    except PermissionError as exc:
        command = args[0] if args else kwargs.get("args")
        if isinstance(command, (list, tuple)) and command and command[0] == "ffmpeg":
            raise FileNotFoundError("ffmpeg is not executable in this environment") from exc
        raise


def build_model(model_name: str, device: str):
    """Load the Chinese ASR model.

    We start with FunASR Paraformer Chinese because it is designed for Chinese
    ASR and is a practical baseline for checking whether speech is understood.
    """
    original_check_output = subprocess.check_output

    try:
        subprocess.check_output = lambda *args, **kwargs: check_output_with_ffmpeg_permission_fallback(
            original_check_output,
            *args,
            **kwargs,
        )
        from funasr import AutoModel
    except ImportError as exc:
        raise RuntimeError(
            "FunASR is not installed yet. Install it with:\n"
            "python3 -m pip install funasr"
        ) from exc
    finally:
        subprocess.check_output = original_check_output

    # We intentionally skip the punctuation model here.
    # Reason: punctuation does not help us decide whether "你好" was understood,
    # and the punctuation model can be larger than the ASR model itself.
    return AutoModel(model=model_name, vad_model="fsmn-vad", device=device)


def run_one(model: Any, audio_path: Path, target_text: str) -> dict[str, Any]:
    """Run ASR on one recording and compare recognized text with target text."""
    temp_wav = write_temp_wav(audio_path)
    try:
        raw_result = model.generate(input=str(temp_wav))
    finally:
        temp_wav.unlink(missing_ok=True)

    predicted_text = extract_asr_text(raw_result)
    target_norm = normalize_chinese_text(target_text)
    predicted_norm = normalize_chinese_text(predicted_text)

    return {
        "target_text": target_text,
        "audio": str(audio_path),
        "asr_text": predicted_text,
        "target_normalized": target_norm,
        "asr_normalized": predicted_norm,
        "exact_match": target_norm == predicted_norm,
        "text_similarity": text_similarity(target_text, predicted_text),
        "raw_result": raw_result,
    }


def save_json(data: Any, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def run_single(args: argparse.Namespace) -> int:
    if not args.audio.exists():
        print(f"Audio file not found: {args.audio}")
        return 1

    target_text = args.text or text_from_audio_filename(args.audio)
    model = build_model(args.model, args.device)
    result = run_one(model, args.audio, target_text)
    save_json(result, args.output)

    print(f'Target text: {result["target_text"]}')
    print(f'ASR heard: {result["asr_text"]}')
    print(f'Text similarity: {result["text_similarity"]}/100')
    print(f'Exact match: {result["exact_match"]}')
    print(f"Saved result to {args.output.resolve()}")
    return 0


def run_batch(args: argparse.Namespace) -> int:
    audio_files = sorted(
        path
        for path in args.samples_dir.iterdir()
        if path.suffix.lower() in {".wav", ".m4a", ".aac", ".mp3", ".caf"}
    )
    if not audio_files:
        print(f"No audio files found in {args.samples_dir}")
        return 1

    model = build_model(args.model, args.device)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    rows = []
    for audio_path in audio_files:
        target_text = text_from_audio_filename(audio_path)
        json_path = args.output_dir / f"{target_text}.json"
        try:
            result = run_one(model, audio_path, target_text)
            save_json(result, json_path)
            rows.append(
                {
                    "target_text": result["target_text"],
                    "audio": result["audio"],
                    "asr_text": result["asr_text"],
                    "exact_match": result["exact_match"],
                    "text_similarity": result["text_similarity"],
                    "json": str(json_path),
                }
            )
            print(
                f'{target_text}: heard="{result["asr_text"]}", '
                f'similarity={result["text_similarity"]}/100'
            )
        except Exception as exc:
            rows.append(
                {
                    "target_text": target_text,
                    "audio": str(audio_path),
                    "error": str(exc),
                }
            )
            print(f"{audio_path.name}: ERROR {exc}")

    summary_path = args.output_dir / "summary.csv"
    fieldnames = sorted({key for row in rows for key in row.keys()})
    with summary_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nSaved ASR summary to {summary_path.resolve()}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run Stage 2B.0 Chinese ASR baseline on See My Voice samples."
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL_NAME,
        help='FunASR model name. Default: "paraformer-zh".',
    )
    parser.add_argument(
        "--device",
        default="cpu",
        help='Use "cpu" for laptop testing. Use "cuda" only if you have an NVIDIA GPU.',
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    single = subparsers.add_parser("single", help="Run ASR on one audio file.")
    single.add_argument("--audio", type=Path, required=True)
    single.add_argument("--text", default=None, help="Target text. Defaults to audio filename.")
    single.add_argument("--output", type=Path, default=Path("asr_baseline_result.json"))
    single.set_defaults(func=run_single)

    batch = subparsers.add_parser("batch", help="Run ASR on every file in samples/.")
    batch.add_argument("--samples-dir", type=Path, default=DEFAULT_SAMPLES_DIR)
    batch.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    batch.set_defaults(func=run_batch)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
