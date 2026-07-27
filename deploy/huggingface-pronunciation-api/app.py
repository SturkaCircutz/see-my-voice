from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
import threading
from pathlib import Path
from typing import Any

import soundfile as sf
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import snapshot_download


APP_DIR = Path(__file__).resolve().parent
SRC_DIR = APP_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from phone_ctc_inference import analyze_phone_ctc  # noqa: E402
from stage1_pronunciation import (  # noqa: E402
    SAMPLE_RATE,
    ensure_recording_has_voice,
    load_audio,
    text_to_syllable_parts,
)
from stage3a_labels import text_to_stage3a_labels  # noqa: E402


DEFAULT_MODEL_ID = "sturka/see-my-voice-mandarin-phone-ctc"
MODEL_ID = os.environ.get("SEE_MY_VOICE_HF_MODEL_ID", DEFAULT_MODEL_ID).strip() or DEFAULT_MODEL_ID
MODEL_REVISION = os.environ.get("SEE_MY_VOICE_HF_MODEL_REVISION", "").strip() or None
DEVICE = os.environ.get("SEE_MY_VOICE_PHONE_CTC_DEVICE", "cpu").strip() or "cpu"
MAX_AUDIO_SECONDS = float(os.environ.get("SEE_MY_VOICE_PHONE_CTC_MAX_AUDIO_SECONDS", "6.0"))

MODEL_DIR: Path | None = None
MODEL_LOCK = threading.Lock()
ANALYZE_LOCK = threading.Lock()

app = FastAPI(title="See My Voice Pronunciation API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def resolve_model_dir() -> Path:
    global MODEL_DIR
    with MODEL_LOCK:
        if MODEL_DIR is not None:
            return MODEL_DIR

        local_path = Path(MODEL_ID).expanduser()
        if local_path.exists():
            MODEL_DIR = local_path.resolve()
        else:
            MODEL_DIR = Path(
                snapshot_download(
                    repo_id=MODEL_ID,
                    revision=MODEL_REVISION,
                    allow_patterns=[
                        "README.md",
                        "config.json",
                        "id_to_phone_token.json",
                        "model.safetensors",
                        "phone_token_to_id.json",
                        "preprocessor_config.json",
                        "processor_config.json",
                        "special_tokens_map.json",
                        "tokenizer_config.json",
                        "vocab.json",
                    ],
                )
            )
        return MODEL_DIR


def ffmpeg_to_wav(input_path: Path, output_path: Path) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg is not installed in the pronunciation service image.")

    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(input_path),
            "-ac",
            "1",
            "-ar",
            str(SAMPLE_RATE),
            str(output_path),
        ],
        check=True,
    )


def convert_upload_to_wav(input_path: Path, output_path: Path) -> Path:
    try:
        ffmpeg_to_wav(input_path, output_path)
        return output_path
    except Exception:
        if input_path.suffix.lower() == ".wav":
            audio, sample_rate = load_audio(input_path, SAMPLE_RATE)
            sf.write(output_path, audio, sample_rate)
            return output_path
        raise


def score_label(score: float) -> str:
    if score >= 85:
        return "matched"
    if score >= 70:
        return "mostly_matched"
    if score >= 45:
        return "partly_matched"
    return "needs_practice"


def boundary_confidence(score: float) -> str:
    if score >= 80:
        return "high"
    if score >= 55:
        return "medium"
    return "low"


def feedback_for_score(score: float, expected_text: str, predicted_text: str) -> str:
    if score >= 85:
        return "The phone-token model output is close to the target pronunciation labels."
    if score >= 70:
        return "The phone-token model matched many target labels, but some initial, final, or tone labels still differ."
    if score >= 45:
        return "The phone-token model found several differences from the target labels. Practice the sentence more slowly and keep each syllable complete."
    if predicted_text:
        return "The phone-token model output is far from the target labels. Start with one word, then return to the full sentence."
    return f"The phone-token model did not produce clear labels. Target labels were: {expected_text or 'none'}."


def syllable_rows(target_text: str, token_accuracy: float) -> list[dict[str, Any]]:
    parts = text_to_syllable_parts(target_text)
    labels = text_to_stage3a_labels(target_text, use_tone_sandhi=True)
    tokens_by_index = {item.index: item.phone_tokens for item in labels.syllables}
    score = int(round(max(0.0, min(100.0, token_accuracy))))

    rows = []
    for part in parts:
        expected = " ".join(tokens_by_index.get(part.index, []))
        rows.append(
            {
                "index": part.index,
                "char": part.char,
                "pinyin": part.pinyin,
                "pinyin_display": part.pinyin,
                "initial": part.initial,
                "final": part.final,
                "tone": part.tone,
                "tone_score": score,
                "feedback": f"Expected phone labels: {expected}. Compare this with the model token output below.",
            }
        )
    return rows


def build_response(target_text: str, audio_name: str, phone_ctc: dict[str, Any]) -> dict[str, Any]:
    token_accuracy = float(phone_ctc.get("token_accuracy") or 0.0)
    expected_text = str(phone_ctc.get("expected_text") or "")
    predicted_text = str(phone_ctc.get("predicted_text") or "")
    main_feedback = feedback_for_score(token_accuracy, expected_text, predicted_text)

    return {
        "stage": "stage_3_phone_ctc_huggingface_space",
        "target_text": target_text,
        "audio": audio_name,
        "communication_result": {
            "label": score_label(token_accuracy),
            "readiness_score": int(round(token_accuracy)),
            "main_feedback": main_feedback,
        },
        "asr": {
            "model": MODEL_ID,
            "heard_text": predicted_text or "No phone tokens detected",
            "target_normalized": target_text,
            "heard_normalized": predicted_text,
            "exact_match": bool(phone_ctc.get("exact_match")),
            "text_similarity": token_accuracy,
        },
        "tone_timing": {
            "overall_score": int(round(token_accuracy)),
            "speech_region": {},
            "boundary_confidence": boundary_confidence(token_accuracy),
            "boundary_reason": "Estimated from phone-token CTC accuracy in the hosted model service.",
            "boundary_details": [],
            "syllables": syllable_rows(target_text, token_accuracy),
        },
        "pinyin_diagnosis": {
            "method": "Expected Mandarin phone tokens compared with hosted CTC model predictions.",
            "target_text": target_text,
            "heard_text": predicted_text,
            "target_pinyin": [item.pinyin for item in text_to_syllable_parts(target_text)],
            "heard_pinyin": [],
            "issues": []
            if phone_ctc.get("exact_match")
            else [
                {
                    "type": "phone_ctc",
                    "title": "Phone-token labels differ from the target",
                    "summary": main_feedback,
                    "focus": "Initials, finals, and tones",
                    "detail": f"Expected: {expected_text}. Predicted: {predicted_text or 'none'}.",
                    "practice": [target_text],
                }
            ],
            "summary": main_feedback,
        },
        "phone_ctc": phone_ctc,
        "notes": [
            "This hosted service uses the trained See My Voice Mandarin phone-token CTC model.",
            "The current service does not run the older FunASR text recognizer; clarity is derived from phone-token accuracy.",
        ],
    }


@app.get("/")
def root() -> dict[str, Any]:
    return health()


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "model_id": MODEL_ID,
        "model_revision": MODEL_REVISION or "main",
        "model_dir": str(MODEL_DIR) if MODEL_DIR is not None else "",
        "device": DEVICE,
        "max_audio_seconds": MAX_AUDIO_SECONDS,
    }


@app.post("/api/analyze")
async def analyze(text: str = Form(...), audio: UploadFile = File(...)) -> dict[str, Any]:
    target_text = text.strip()
    if not target_text:
        raise HTTPException(status_code=400, detail="Target text is required.")

    suffix = Path(audio.filename or "recording.webm").suffix or ".webm"
    try:
        payload = await audio.read()
        if not payload:
            raise ValueError("No recording file was received.")

        with tempfile.TemporaryDirectory(prefix="see_my_voice_api_") as temp_dir:
            temp_path = Path(temp_dir)
            raw_audio = temp_path / f"recording{suffix}"
            wav_audio = temp_path / "recording.wav"
            raw_audio.write_bytes(payload)
            convert_upload_to_wav(raw_audio, wav_audio)
            ensure_recording_has_voice(wav_audio)

            with ANALYZE_LOCK:
                phone_ctc = analyze_phone_ctc(
                    target_text,
                    wav_audio,
                    model_dir=resolve_model_dir(),
                    device=DEVICE,
                    max_audio_seconds=MAX_AUDIO_SECONDS,
                )
            return build_response(target_text, audio.filename or raw_audio.name, phone_ctc)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
