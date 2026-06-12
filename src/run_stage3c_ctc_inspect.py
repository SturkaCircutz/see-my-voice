from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any

import numpy as np
import torch

from run_asr_baseline import normalize_chinese_text, text_similarity
from stage1_pronunciation import SAMPLE_RATE, load_audio


DEFAULT_MODEL_NAME = "ydshieh/wav2vec2-large-xlsr-53-chinese-zh-cn-gpt"
DEFAULT_OUTPUT_DIR = Path("stage3c_ctc_inspection")


def load_ctc_model(model_name: str, device: str):
    """Load a pretrained CTC ASR model from Hugging Face.

    Beginner note: we are not training a model here. We are using an existing
    model to inspect its internal frame-by-frame predictions. This is the first
    bridge from normal ASR text output toward future GOP-style pronunciation
    scoring.
    """
    try:
        from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
    except ImportError as exc:
        raise RuntimeError(
            "transformers is not installed yet. Install dependencies with:\n"
            "python3 -m pip install -r requirements.txt"
        ) from exc

    processor = Wav2Vec2Processor.from_pretrained(model_name)
    model = Wav2Vec2ForCTC.from_pretrained(model_name)
    model.to(device)
    model.eval()
    return processor, model


def token_for_id(processor: Any, token_id: int) -> str:
    """Convert one model vocabulary id into a readable token string."""
    tokenizer = getattr(processor, "tokenizer", None)
    if tokenizer is None:
        return str(token_id)
    return tokenizer.convert_ids_to_tokens(int(token_id))


def ctc_collapse(ids: list[int], blank_id: int) -> list[int]:
    """Apply the basic CTC collapse rule to a frame-level id sequence.

    CTC repeats tokens across many frames and inserts blanks between sounds.
    To decode the rough path, we remove repeated neighboring ids and remove
    blank ids. Example: blank n n blank i i -> n i.
    """
    collapsed = []
    previous = None
    for token_id in ids:
        if token_id != previous and token_id != blank_id:
            collapsed.append(token_id)
        previous = token_id
    return collapsed


def decode_ids(processor: Any, ids: list[int]) -> str:
    """Decode token ids into text with the processor's tokenizer."""
    if not ids:
        return ""
    return processor.decode(ids)


def decode_frame_ids(processor: Any, frame_ids: list[int]) -> str:
    """Decode the full frame-level CTC path with the processor's own rules.

    Beginner note: different tokenizers handle blanks and repeated tokens a
    little differently. Calling the processor's decoder on the full frame path
    is safer than manually collapsing first and then decoding.
    """
    if not frame_ids:
        return ""
    return processor.decode(frame_ids)


def topk_frame_rows(
    probs: torch.Tensor,
    processor: Any,
    audio_duration: float,
    top_k: int,
) -> list[dict[str, Any]]:
    """Create a compact table of the strongest CTC tokens for each frame.

    Beginner note: one frame is a tiny piece of the audio timeline. The model
    does not output one token per Chinese character; it outputs a probability
    distribution at every frame, and CTC later collapses those frames into text.
    """
    n_frames = int(probs.shape[0])
    frame_seconds = audio_duration / max(n_frames, 1)
    values, ids = torch.topk(probs, k=top_k, dim=-1)

    rows = []
    for frame_index in range(n_frames):
        top_tokens = []
        for rank in range(top_k):
            token_id = int(ids[frame_index, rank].item())
            top_tokens.append(
                {
                    "rank": rank + 1,
                    "token_id": token_id,
                    "token": token_for_id(processor, token_id),
                    "probability": round(float(values[frame_index, rank].item()), 6),
                }
            )

        best = top_tokens[0]
        rows.append(
            {
                "frame_index": frame_index,
                "start_seconds": round(frame_index * frame_seconds, 4),
                "end_seconds": round((frame_index + 1) * frame_seconds, 4),
                "top_token_id": best["token_id"],
                "top_token": best["token"],
                "top_probability": best["probability"],
                "top_k": top_tokens,
            }
        )
    return rows


def write_json(data: Any, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_frame_csv(rows: list[dict[str, Any]], path: Path) -> None:
    """Save a readable CSV with one row per CTC frame."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "frame_index",
                "start_seconds",
                "end_seconds",
                "top_token_id",
                "top_token",
                "top_probability",
                "top_k_tokens",
            ],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    "frame_index": row["frame_index"],
                    "start_seconds": row["start_seconds"],
                    "end_seconds": row["end_seconds"],
                    "top_token_id": row["top_token_id"],
                    "top_token": row["top_token"],
                    "top_probability": row["top_probability"],
                    "top_k_tokens": " ".join(
                        f"{item['token']}:{item['probability']:.3f}"
                        for item in row["top_k"]
                    ),
                }
            )


def inspect_one(
    audio_path: Path,
    target_text: str,
    model_name: str,
    processor: Any,
    model: Any,
    device: str,
    output_dir: Path,
    top_k: int,
) -> dict[str, Any]:
    """Run CTC inspection for one recording and save JSON/CSV outputs."""
    audio, sample_rate = load_audio(audio_path, SAMPLE_RATE)
    audio_duration = float(len(audio) / sample_rate) if sample_rate else 0.0

    inputs = processor(
        audio,
        sampling_rate=sample_rate,
        return_tensors="pt",
        padding=True,
    )
    inputs = {key: value.to(device) for key, value in inputs.items()}

    with torch.no_grad():
        logits = model(**inputs).logits[0]
        probs = torch.softmax(logits, dim=-1).cpu()

    top_ids = torch.argmax(probs, dim=-1).tolist()
    blank_id = int(getattr(processor.tokenizer, "pad_token_id", 0) or 0)
    collapsed_ids = ctc_collapse(top_ids, blank_id)
    decoded_text = decode_frame_ids(processor, top_ids)
    frame_rows = topk_frame_rows(probs, processor, audio_duration, top_k)

    output_dir.mkdir(parents=True, exist_ok=True)
    frame_csv = output_dir / "frames.csv"
    report_json = output_dir / "ctc_report.json"
    write_frame_csv(frame_rows, frame_csv)

    result = {
        "stage": "stage_3c_ctc_frame_inspection",
        "model": model_name,
        "audio_path": str(audio_path),
        "target_text": target_text,
        "target_normalized": normalize_chinese_text(target_text),
        "decoded_text": decoded_text,
        "decoded_normalized": normalize_chinese_text(decoded_text),
        "text_similarity": text_similarity(target_text, decoded_text),
        "sample_rate": sample_rate,
        "audio_duration_seconds": round(audio_duration, 4),
        "n_ctc_frames": int(probs.shape[0]),
        "vocab_size": int(probs.shape[1]),
        "blank_token_id": blank_id,
        "blank_token": token_for_id(processor, blank_id),
        "collapsed_token_ids": collapsed_ids,
        "manual_collapsed_decoded_text": decode_ids(processor, collapsed_ids),
        "collapsed_tokens": [token_for_id(processor, token_id) for token_id in collapsed_ids],
        "frame_csv": str(frame_csv),
        "notes": [
            "This pretrained model predicts Chinese ASR tokens, not our pinyin phone tokens yet.",
            "Frame probabilities are the raw material needed for later CTC/GOP-style scoring.",
            "Do not treat this report as final pronunciation feedback; it is an inspection step.",
        ],
    }
    write_json(result, report_json)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Inspect frame-level output from a pretrained Chinese CTC ASR model."
    )
    parser.add_argument("--audio", type=Path, required=True)
    parser.add_argument("--text", required=True)
    parser.add_argument("--model", default=DEFAULT_MODEL_NAME)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    args = parser.parse_args()

    if not args.audio.exists():
        print(f"Audio file not found: {args.audio}")
        return 1
    if args.top_k < 1:
        print("--top-k must be at least 1")
        return 1

    processor, model = load_ctc_model(args.model, args.device)
    result = inspect_one(
        audio_path=args.audio,
        target_text=args.text,
        model_name=args.model,
        processor=processor,
        model=model,
        device=args.device,
        output_dir=args.output_dir,
        top_k=args.top_k,
    )

    print(f"Target text: {result['target_text']}")
    print(f"CTC decoded text: {result['decoded_text']}")
    print(f"Text similarity: {result['text_similarity']}/100")
    print(f"CTC frames: {result['n_ctc_frames']}")
    print(f"Vocabulary size: {result['vocab_size']}")
    print(f"Saved report to {(args.output_dir / 'ctc_report.json').resolve()}")
    print(f"Saved frame table to {(args.output_dir / 'frames.csv').resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
