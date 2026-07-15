from __future__ import annotations

from email.parser import BytesParser
from email.policy import default
from dataclasses import dataclass
import json
import os
import re
import shutil
import socket
import sys
import tempfile
import threading
import traceback
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from pypinyin import Style, lazy_pinyin

from tts_service import cached_tts_url, generate_tts_audio


APP_DIR = Path(__file__).resolve().parent
SEE_MY_VOICE_DIR = Path(
    os.environ.get(
        "SEE_MY_VOICE_DIR",
        str(APP_DIR.parent),
    )
)
SEE_MY_VOICE_SRC = SEE_MY_VOICE_DIR / "src"

if str(SEE_MY_VOICE_SRC) not in sys.path:
    sys.path.insert(0, str(SEE_MY_VOICE_SRC))

ANALYSIS_IMPORT_ERROR = None
try:
    from run_asr_baseline import DEFAULT_MODEL_NAME, build_model, normalize_chinese_text  # noqa: E402
    from run_stage2b_combined import combine_results  # noqa: E402
    from stage1_pronunciation import (  # noqa: E402
        estimate_f0,
        f0_values_in_window,
        ensure_recording_has_voice,
        load_audio,
        normalize_f0_shape,
        save_json,
        text_to_syllable_parts,
        tone_template,
    )
except Exception as exc:  # pragma: no cover - keeps the web UI available locally.
    ANALYSIS_IMPORT_ERROR = exc
    DEFAULT_MODEL_NAME = "speech-analysis"
    build_model = None
    combine_results = None
    estimate_f0 = None
    f0_values_in_window = None
    load_audio = None
    normalize_f0_shape = None
    save_json = None
    tone_template = None

    @dataclass
    class SyllablePart:
        index: int
        char: str
        pinyin: str
        initial: str
        final: str
        tone: str

    def normalize_chinese_text(text: str) -> str:
        return "".join(re.findall(r"[\u4e00-\u9fff]", text or ""))

    def text_to_syllable_parts(text: str) -> list[SyllablePart]:
        initials = [
            "zh",
            "ch",
            "sh",
            "b",
            "p",
            "m",
            "f",
            "d",
            "t",
            "n",
            "l",
            "g",
            "k",
            "h",
            "j",
            "q",
            "x",
            "r",
            "z",
            "c",
            "s",
            "y",
            "w",
        ]
        chars = list(normalize_chinese_text(text))
        pinyin_items = lazy_pinyin(
            "".join(chars),
            style=Style.TONE3,
            tone_sandhi=False,
            neutral_tone_with_five=True,
            errors="ignore",
        )
        parts = []
        for index, char in enumerate(chars):
            raw = pinyin_items[index] if index < len(pinyin_items) else ""
            tone = raw[-1] if raw and raw[-1].isdigit() else "5"
            body = raw[:-1] if raw and raw[-1].isdigit() else raw
            initial = next((item for item in initials if body.startswith(item)), "")
            final = body[len(initial) :] if body else ""
            parts.append(SyllablePart(index, char, raw, initial, final, tone))
        return parts


PHONE_CTC_IMPORT_ERROR = None
try:
    from phone_ctc_inference import analyze_phone_ctc, phone_ctc_model_is_loaded  # noqa: E402
except Exception as exc:  # pragma: no cover - phone model is optional for local UI startup.
    PHONE_CTC_IMPORT_ERROR = exc
    analyze_phone_ctc = None
    phone_ctc_model_is_loaded = None


ASR_MODEL = None
ASR_MODEL_LOCK = threading.Lock()
ANALYZE_LOCK = threading.Lock()
STANDARD_AUDIO_DIR = APP_DIR / "assets" / "standard-audio"
DEFAULT_MIN_ASR_AVAILABLE_MB = 4500
DEFAULT_MIN_PHONE_CTC_AVAILABLE_MB = 1800
DEFAULT_PHONE_CTC_MODEL_DIR = SEE_MY_VOICE_DIR / "models" / "mandarin_phone_ctc_xlsr_chinese_gpu"


class AnalysisUnavailableError(RuntimeError):
    """Raised when analysis cannot run safely in the current local environment."""

    status_code = 503


def write_debug_error(exc: Exception) -> None:
    """Persist server-side analysis errors for local development."""
    debug_dir = APP_DIR / ".analysis_debug"
    debug_dir.mkdir(exist_ok=True)
    (debug_dir / "latest_error.txt").write_text(
        "".join(traceback.format_exception(type(exc), exc, exc.__traceback__)),
        encoding="utf-8",
    )


def configured_asr_model_name() -> str:
    return os.environ.get("SEE_MY_VOICE_ASR_MODEL", DEFAULT_MODEL_NAME).strip() or DEFAULT_MODEL_NAME


def configured_asr_device() -> str:
    return os.environ.get("SEE_MY_VOICE_ASR_DEVICE", "cpu").strip() or "cpu"


def configured_min_asr_available_mb() -> int:
    raw = os.environ.get("SEE_MY_VOICE_ASR_MIN_AVAILABLE_MB", str(DEFAULT_MIN_ASR_AVAILABLE_MB)).strip()
    try:
        return max(0, int(raw))
    except ValueError:
        return DEFAULT_MIN_ASR_AVAILABLE_MB


def env_flag(name: str, default: bool = True) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() not in {"0", "false", "no", "off"}


def configured_phone_ctc_enabled() -> bool:
    return env_flag("SEE_MY_VOICE_PHONE_CTC_ENABLED", True)


def configured_phone_ctc_model_dir() -> Path:
    raw = os.environ.get("SEE_MY_VOICE_PHONE_CTC_MODEL_DIR", "").strip()
    path = Path(raw) if raw else DEFAULT_PHONE_CTC_MODEL_DIR
    if not path.is_absolute():
        path = SEE_MY_VOICE_DIR / path
    return path


def configured_phone_ctc_device() -> str:
    return os.environ.get("SEE_MY_VOICE_PHONE_CTC_DEVICE", "cpu").strip() or "cpu"


def configured_phone_ctc_max_audio_seconds() -> float:
    raw = os.environ.get("SEE_MY_VOICE_PHONE_CTC_MAX_AUDIO_SECONDS", "6.0").strip()
    try:
        return max(0.0, float(raw))
    except ValueError:
        return 6.0


def configured_min_phone_ctc_available_mb() -> int:
    raw = os.environ.get(
        "SEE_MY_VOICE_PHONE_CTC_MIN_AVAILABLE_MB",
        str(DEFAULT_MIN_PHONE_CTC_AVAILABLE_MB),
    ).strip()
    try:
        return max(0, int(raw))
    except ValueError:
        return DEFAULT_MIN_PHONE_CTC_AVAILABLE_MB


def memory_available_mb() -> int | None:
    """Return Linux MemAvailable in MiB when available."""
    try:
        for line in Path("/proc/meminfo").read_text(encoding="utf-8").splitlines():
            if line.startswith("MemAvailable:"):
                parts = line.split()
                return int(parts[1]) // 1024
    except Exception:
        return None
    return None


def ensure_asr_model_can_load() -> None:
    """Avoid an OS-level OOM kill while the large FunASR model is loading."""
    min_available_mb = configured_min_asr_available_mb()
    if min_available_mb <= 0:
        return
    available_mb = memory_available_mb()
    if available_mb is None or available_mb >= min_available_mb:
        return
    raise AnalysisUnavailableError(
        "Not enough available RAM to load the local FunASR model safely "
        f"({available_mb} MiB available, need at least {min_available_mb} MiB). "
        "Close other apps or lower SEE_MY_VOICE_ASR_MIN_AVAILABLE_MB only if you accept the risk."
    )


def ensure_phone_ctc_model_can_load(model_dir: Path, device: str) -> None:
    """Avoid loading the experimental phone model when RAM is already too low."""
    if phone_ctc_model_is_loaded is not None and phone_ctc_model_is_loaded(model_dir, device):
        return
    min_available_mb = configured_min_phone_ctc_available_mb()
    if min_available_mb <= 0:
        return
    available_mb = memory_available_mb()
    if available_mb is None or available_mb >= min_available_mb:
        return
    raise AnalysisUnavailableError(
        "Not enough available RAM to load the local phone-token CTC model safely "
        f"({available_mb} MiB available, need at least {min_available_mb} MiB)."
    )


INITIAL_PRACTICE_WORDS = {
    "n": ["你", "拿", "年"],
    "h": ["好", "喝", "回"],
    "m": ["妈", "没", "米"],
    "f": ["发", "饭", "风"],
    "ch": ["吃", "茶", "车"],
    "sh": ["是", "说", "水"],
    "zh": ["这", "中", "找"],
    "r": ["日", "热", "人"],
    "x": ["西", "小", "谢"],
    "q": ["七", "请", "去"],
    "j": ["家", "就", "见"],
}

FINAL_PRACTICE_WORDS = {
    "i": ["你", "米", "七"],
    "ao": ["好", "要", "到"],
    "an": ["饭", "看", "慢"],
    "ang": ["忙", "方", "上"],
    "eng": ["能", "等", "冷"],
    "ong": ["中", "红", "懂"],
    "ui": ["水", "会", "对"],
    "ie": ["谢", "写", "也"],
}


def get_model():
    """Load the speech recognizer once and reuse it for later recordings."""
    global ASR_MODEL
    if ASR_MODEL is None:
        with ASR_MODEL_LOCK:
            if ASR_MODEL is None:
                ensure_asr_model_can_load()
                ASR_MODEL = build_model(configured_asr_model_name(), configured_asr_device())
    return ASR_MODEL


def convert_to_wav(input_path: Path, output_path: Path) -> Path:
    """Convert browser-recorded audio to wav when ffmpeg is available.

    Browser MediaRecorder usually sends webm audio. PyAV can often read it
    directly, but converting to wav first makes the analysis pipeline more
    stable. If ffmpeg is missing, we fall back to the original file and let
    the existing audio loader try to decode it.
    """
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg command is not installed; falling back to PyAV.")

    import subprocess

    command = [
        ffmpeg,
        "-y",
        "-i",
        str(input_path),
        "-ac",
        "1",
        "-ar",
        "16000",
        str(output_path),
    ]
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return output_path


def decode_with_pyav(input_path: Path, output_path: Path) -> Path:
    """Decode browser audio with PyAV when ffmpeg CLI is not installed."""
    import av
    import numpy as np
    import soundfile as sf
    from scipy.signal import resample_poly
    from math import gcd

    container = av.open(str(input_path))
    stream = next((item for item in container.streams if item.type == "audio"), None)
    if stream is None:
        raise RuntimeError("The recording does not contain a readable audio stream.")

    chunks = []
    sample_rate = int(stream.rate or 0)
    for frame in container.decode(stream):
        sample_rate = int(frame.sample_rate or sample_rate)
        array = frame.to_ndarray()
        if array.ndim > 1:
            array = array.mean(axis=0)
        chunks.append(array.astype("float32"))
    container.close()

    if not chunks or sample_rate <= 0:
        raise RuntimeError("Could not decode audio from the browser recording.")

    audio = np.concatenate(chunks)
    peak = float(np.max(np.abs(audio))) if len(audio) else 0.0
    if peak > 1.0:
        audio = audio / peak
    if sample_rate != 16000:
        divisor = gcd(sample_rate, 16000)
        audio = resample_poly(audio, 16000 // divisor, sample_rate // divisor)
    sf.write(output_path, audio, 16000)
    return output_path


def browser_audio_to_wav(input_path: Path, output_path: Path) -> Path:
    """Convert browser MediaRecorder audio into 16kHz mono wav."""
    try:
        return convert_to_wav(input_path, output_path)
    except Exception:
        return decode_with_pyav(input_path, output_path)


def standard_audio_url(text: str) -> str:
    """Return a local human reference recording URL when one exists."""
    clean = normalize_chinese_text(text)
    if not clean:
        return ""
    for suffix in (".m4a", ".wav", ".mp3", ".aac", ".ogg"):
        path = STANDARD_AUDIO_DIR / f"{clean}{suffix}"
        if path.exists():
            return f"/assets/standard-audio/{path.name}"
    return cached_tts_url(clean)


def text_info(text: str):
    """Return pinyin and syllable metadata for live custom-text updates."""
    parts = text_to_syllable_parts(text)
    tone_marks = lazy_pinyin(
        text,
        style=Style.TONE,
        tone_sandhi=False,
        neutral_tone_with_five=False,
        errors="ignore",
    )
    return {
        "text": text,
        "standard_audio_url": standard_audio_url(text),
        "pinyin": [part.pinyin for part in parts],
        "pinyin_display": tone_marks,
        "syllables": [
            {
                "index": part.index,
                "char": part.char,
                "pinyin": part.pinyin,
                "pinyin_display": tone_marks[part.index] if part.index < len(tone_marks) else part.pinyin,
                "initial": part.initial,
                "final": part.final,
                "tone": part.tone,
            }
            for part in parts
        ],
    }


def pinyin_unit_label(unit: dict) -> str:
    display = unit.get("pinyin_display") or unit.get("pinyin") or ""
    return f"{unit.get('char', '')} / {display}"


def drill_words(kind: str, value: str, target_char: str) -> list[str]:
    if kind == "initial":
        return INITIAL_PRACTICE_WORDS.get(value, [target_char])
    if kind == "final":
        return FINAL_PRACTICE_WORDS.get(value, [target_char])
    return [target_char]


def segmental_issue(target: dict, heard: dict | None) -> dict:
    """Create a user-facing pinyin issue from target-vs-heard differences."""
    target_label = pinyin_unit_label(target)
    if heard is None:
        return {
            "type": "missing",
            "title": "This syllable was not heard clearly",
            "summary": f"The target is {target_label}, but the system did not hear a clear syllable in that position.",
            "focus": "Whole syllable",
            "practice": [target.get("char", "")],
            "detail": "Read this character slowly first, then connect it with the surrounding characters. Keep the onset, final, and tone complete instead of reading too lightly or too fast.",
        }

    heard_label = pinyin_unit_label(heard)
    initial_changed = target.get("initial") != heard.get("initial")
    final_changed = target.get("final") != heard.get("final")
    tone_changed = target.get("tone") != heard.get("tone")

    if initial_changed and not final_changed:
        value = target.get("initial") or "zero initial"
        return {
            "type": "initial",
            "title": f"Initial {value} may not be clear enough",
            "summary": f"The target is {target_label}, but the system heard {heard_label}. The main difference is at the initial onset.",
            "focus": f"Initial {value}",
            "practice": drill_words("initial", value, target.get("char", "")),
            "detail": "Practice the onset by itself, then attach the final. Slow down slightly while recording so the airflow, tongue tip, or lip-to-teeth movement at the start is clearer.",
        }
    if final_changed and not initial_changed:
        value = target.get("final") or "final"
        return {
            "type": "final",
            "title": f"Final {value} may not be complete enough",
            "summary": f"The target is {target_label}, but the system heard {heard_label}. The initial is close, but the following final is different.",
            "focus": f"Final {value}",
            "practice": drill_words("final", value, target.get("char", "")),
            "detail": "Focus on completing the mouth-shape transition and the ending. Stretch the final first, then gradually return to a natural speed.",
        }
    if tone_changed and not initial_changed and not final_changed:
        tone = target.get("tone") or ""
        return {
            "type": "tone",
            "title": f"Tone T{tone} may affect recognition",
            "summary": f"The target is {target_label}, but the system heard {heard_label}. The initial and final are close; the main difference is the tone.",
            "focus": f"Tone T{tone}",
            "practice": [target.get("char", "")],
            "detail": "Use the tone contour to practice the pitch movement. Exaggerate the direction first, then return to a natural speed.",
        }

    return {
        "type": "syllable",
        "title": "The whole syllable may need more practice",
        "summary": f"The target is {target_label}, but the system heard {heard_label}. The initial, final, or tone may all be different.",
        "focus": "Whole syllable",
        "practice": [target.get("char", "")],
        "detail": "Break this syllable into three steps: initial, final, and tone. Practice the onset first, then the final mouth shape, and add the tone last.",
    }


def add_pinyin_diagnosis(result: dict, target_text: str) -> dict:
    """Compare target pinyin with what the system heard."""
    target_clean = normalize_chinese_text(target_text)
    heard_clean = result.get("asr", {}).get("heard_normalized") or normalize_chinese_text(
        result.get("asr", {}).get("heard_text", "")
    )
    target_info = text_info(target_clean)
    heard_info = text_info(heard_clean)
    target_rows = target_info["syllables"]
    heard_rows = heard_info["syllables"]

    issues = []
    aligned = []
    for index, target in enumerate(target_rows):
        heard = heard_rows[index] if index < len(heard_rows) else None
        same_pinyin = heard is not None and target.get("pinyin") == heard.get("pinyin")
        item = {
            "index": index,
            "target": target,
            "heard": heard,
            "match": same_pinyin,
        }
        if not same_pinyin:
            issue = segmental_issue(target, heard)
            item["issue"] = issue
            issues.append({"index": index, **issue})
        aligned.append(item)

    if len(heard_rows) > len(target_rows):
        for extra in heard_rows[len(target_rows) :]:
            issues.append(
                {
                    "index": extra.get("index"),
                    "type": "extra",
                    "title": "The system heard an extra syllable",
                    "summary": f"The system additionally heard {pinyin_unit_label(extra)}, possibly because of a held sound, noise, or one extra syllable.",
                    "focus": "Rhythm",
                    "practice": [],
                    "detail": "Reduce pauses and background noise while recording, and stop the recording soon after reading the target sentence.",
                }
            )

    if issues:
        summary = f"The system found {len(issues)} pinyin difference(s) that may affect intelligibility."
    else:
        summary = "The heard pinyin matches the target pinyin. Focus next on tone and rhythm."

    result["pinyin_diagnosis"] = {
        "method": "Compare ASR pinyin with the target pinyin",
        "limitation": "",
        "target_text": target_clean,
        "heard_text": heard_clean,
        "target_pinyin": target_info["pinyin_display"],
        "heard_pinyin": heard_info["pinyin_display"],
        "aligned": aligned,
        "issues": issues,
        "summary": summary,
    }
    return result


def rescale_curve(values, points: int = 6) -> list[int]:
    """Convert normalized pitch values into a small UI-friendly 0-100 curve."""
    import numpy as np

    if values is None:
        return [50] * points
    array = np.asarray(values, dtype=float)
    array = array[np.isfinite(array)]
    if len(array) < 2:
        return [50] * points

    x_old = np.linspace(0.0, 1.0, len(array))
    x_new = np.linspace(0.0, 1.0, points)
    sampled = np.interp(x_new, x_old, array)
    low = float(np.min(sampled))
    high = float(np.max(sampled))
    if high - low < 1e-6:
        return [50] * points

    # Canvas y=0 is at the top, so higher pitch should become a smaller number.
    normalized = 100 - ((sampled - low) / (high - low) * 70 + 15)
    return [int(round(value)) for value in normalized]


def chinese_tone_feedback(tone: str, score: int | None) -> str:
    """Return product-facing tone feedback."""
    if score is None:
        return "After recording, the app will give advice based on your tone contour."
    if score >= 82:
        return "Your tone contour is close to the target. Keep it consistent."
    if score >= 68:
        prefix = "The overall tone direction is close, but it is not stable enough yet. "
    else:
        prefix = "This syllable needs focused practice. "

    if tone == "1":
        return f"{prefix}Tone 1 should stay high and level; avoid sliding down or wobbling."
    if tone == "2":
        return f"{prefix}Tone 2 should rise naturally from a lower point, with a clearer lift at the end."
    if tone == "3":
        return f"{prefix}Tone 3 should dip to a low point and then rise lightly; do not keep it flat."
    if tone == "4":
        return f"{prefix}Tone 4 should fall quickly from a high point and end cleanly."
    return f"{prefix}The neutral tone should be short and light, not dragged out."


def tone_name(tone: str) -> str:
    return {
        "1": "Tone 1",
        "2": "Tone 2",
        "3": "Tone 3",
        "4": "Tone 4",
        "5": "neutral tone",
    }.get(str(tone), "the target tone")


def add_user_facing_tone_curves(result: dict, audio_path: Path) -> dict:
    """Attach simplified tone curves for the product UI.

    The analysis core keeps detailed debug plots for development. The app UI
    should instead show only a clean target-vs-user contour for each syllable.
    """
    try:
        audio, sample_rate = load_audio(audio_path)
        f0_times, f0, _ = estimate_f0(audio, sample_rate)
    except Exception:
        return result

    for syllable in result.get("tone_timing", {}).get("syllables", []):
        tone = str(syllable.get("tone", ""))
        window = syllable.get("window") or {}
        start = float(window.get("start", 0.0))
        end = float(window.get("end", 0.0))
        segment = f0_values_in_window(f0_times, f0, start, end)
        user_contour = normalize_f0_shape(segment, n=30)
        target_contour = tone_template(tone, n=30)
        score = syllable.get("tone_score")

        syllable["feedback"] = chinese_tone_feedback(tone, score)
        syllable["tone_curve"] = {
            "target": rescale_curve(target_contour),
            "user": rescale_curve(user_contour),
            "has_user_pitch": user_contour is not None,
        }
        syllable["tone_explanation"] = (
            f"The target for {syllable.get('char', '')} is {tone_name(tone)}. "
            f"The system simplifies your pitch movement into a red line and compares it with the green target line. "
            f"The current score is {score}; this mainly checks whether the tone trend is close and does not mean the initial and final are fully accurate."
        )
    return result


def add_display_fields(result: dict, target_text: str) -> dict:
    """Add UI-friendly fields that do not exist in the analysis core yet."""
    info = text_info(target_text)
    result["pinyin_display"] = info["pinyin_display"]
    result["standard_audio_url"] = info.get("standard_audio_url", "")
    display_by_index = {
        item["index"]: item["pinyin_display"] for item in info["syllables"]
    }
    for syllable in result.get("tone_timing", {}).get("syllables", []):
        syllable["pinyin_display"] = display_by_index.get(
            syllable.get("index"), syllable.get("pinyin", "")
        )
        syllable["feedback"] = chinese_tone_feedback(
            str(syllable.get("tone", "")), syllable.get("tone_score")
        )
    return result


def publish_plot_urls(result: dict, temp_plot_dir: Path) -> dict:
    """Copy generated pitch plots into a static debug folder and expose URLs."""
    if not temp_plot_dir.exists():
        return result

    public_dir = APP_DIR / ".analysis_debug" / "latest_plots"
    if public_dir.exists():
        shutil.rmtree(public_dir)
    shutil.copytree(temp_plot_dir, public_dir)

    plots = result.get("plots") or {}
    pitch_path = public_dir / "pitch_overview.png"
    if pitch_path.exists():
        plots["pitch_overview_url"] = "/.analysis_debug/latest_plots/pitch_overview.png"
    for item in plots.get("syllables", []) or []:
        source = Path(str(item.get("path", "")))
        candidate = public_dir / source.name
        if candidate.exists():
            item["url"] = f"/.analysis_debug/latest_plots/{source.name}"
    result["plots"] = plots
    return result


def add_phone_ctc_result(result: dict, target_text: str, audio_path: Path) -> dict:
    """Attach the post-trained phone-token model output when it is available."""
    model_dir = configured_phone_ctc_model_dir()
    device = configured_phone_ctc_device()
    if not configured_phone_ctc_enabled():
        result["phone_ctc"] = {
            "enabled": False,
            "model_dir": str(model_dir),
            "device": device,
            "error": "Phone-token CTC analysis is disabled.",
        }
        return result

    if PHONE_CTC_IMPORT_ERROR is not None or analyze_phone_ctc is None:
        result["phone_ctc"] = {
            "enabled": False,
            "model_dir": str(model_dir),
            "device": device,
            "error": f"Phone-token CTC analysis is unavailable: {PHONE_CTC_IMPORT_ERROR}",
        }
        return result

    if not model_dir.exists():
        result["phone_ctc"] = {
            "enabled": False,
            "model_dir": str(model_dir),
            "device": device,
            "error": "Phone-token CTC model directory was not found.",
        }
        return result

    try:
        ensure_phone_ctc_model_can_load(model_dir, device)
        result["phone_ctc"] = analyze_phone_ctc(
            target_text,
            audio_path,
            model_dir=model_dir,
            device=device,
            max_audio_seconds=configured_phone_ctc_max_audio_seconds(),
        )
    except Exception as exc:
        result["phone_ctc"] = {
            "enabled": False,
            "model_dir": str(model_dir),
            "device": device,
            "error": str(exc),
        }
    return result


class VoiceHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_DIR), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def send_json(self, data, status=200):
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self.send_json(
                {
                    "ok": True,
                    "analysis_ready": ANALYSIS_IMPORT_ERROR is None,
                    "see_my_voice_dir": str(SEE_MY_VOICE_DIR),
                    "analysis_error": str(ANALYSIS_IMPORT_ERROR) if ANALYSIS_IMPORT_ERROR else "",
                    "asr_model": configured_asr_model_name(),
                    "asr_device": configured_asr_device(),
                    "asr_model_loaded": ASR_MODEL is not None,
                    "memory_available_mb": memory_available_mb(),
                    "min_asr_available_mb": configured_min_asr_available_mb(),
                    "phone_ctc_enabled": configured_phone_ctc_enabled(),
                    "phone_ctc_model_dir": str(configured_phone_ctc_model_dir()),
                    "phone_ctc_model_exists": configured_phone_ctc_model_dir().exists(),
                    "phone_ctc_device": configured_phone_ctc_device(),
                    "phone_ctc_import_error": str(PHONE_CTC_IMPORT_ERROR) if PHONE_CTC_IMPORT_ERROR else "",
                    "min_phone_ctc_available_mb": configured_min_phone_ctc_available_mb(),
                }
            )
            return
        if parsed.path == "/api/text-info":
            text = (parse_qs(parsed.query).get("text") or [""])[0].strip()
            self.send_json(text_info(text))
            return
        super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/tts":
            try:
                content_length = int(self.headers.get("Content-Length", "0"))
                payload = json.loads(self.rfile.read(content_length) or b"{}")
                text = normalize_chinese_text(str(payload.get("text") or ""))
                self.send_json(generate_tts_audio(text))
            except Exception as exc:
                self.send_json({"error": str(exc)}, status=500)
            return

        if path != "/api/analyze":
            self.send_error(404, "Not found")
            return

        try:
            result = self.handle_analyze()
        except Exception as exc:
            write_debug_error(exc)
            status = getattr(exc, "status_code", 500)
            self.send_json({"error": str(exc)}, status=status)
            return

        self.send_json(result)

    def handle_analyze(self):
        if ANALYSIS_IMPORT_ERROR is not None:
            raise RuntimeError(
                "The web app started, but the pronunciation analysis module did not load. "
                "Confirm that see-my-voice/src is readable, then restart the server."
            )

        content_type = self.headers.get("Content-Type", "")
        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length)
        message = BytesParser(policy=default).parsebytes(
            f"Content-Type: {content_type}\r\n\r\n".encode("utf-8") + body
        )

        fields = {}
        files = {}
        for part in message.iter_parts():
            name = part.get_param("name", header="content-disposition")
            filename = part.get_filename()
            payload = part.get_payload(decode=True) or b""
            if filename:
                files[name] = payload
            elif name:
                fields[name] = payload.decode(part.get_content_charset() or "utf-8")

        target_text = (fields.get("text") or "").strip()
        if not target_text:
            raise ValueError("Enter the Chinese sentence you want to practice first.")

        audio_bytes = files.get("audio")
        if not audio_bytes:
            raise ValueError("No recording file was received.")

        with tempfile.TemporaryDirectory(prefix="see_my_voice_web_") as temp_dir:
            temp_path = Path(temp_dir)
            raw_audio = temp_path / "recording.webm"
            raw_audio.write_bytes(audio_bytes)
            wav_audio = temp_path / "recording.wav"
            audio_for_model = browser_audio_to_wav(raw_audio, wav_audio)
            ensure_recording_has_voice(audio_for_model)

            plot_dir = temp_path / "plots"
            with ANALYZE_LOCK:
                model = get_model()
                result = combine_results(target_text, audio_for_model, model, plot_dir)
                result = add_phone_ctc_result(result, target_text, audio_for_model)
            result["communication_result"]["main_feedback"] = result["communication_result"][
                "main_feedback"
            ].replace("pitch 图", "tone contour chart").replace("看 tone contour chart", "check the tone contour chart")
            result = add_display_fields(result, target_text)
            result = add_user_facing_tone_curves(result, audio_for_model)
            result = add_pinyin_diagnosis(result, target_text)
            result = publish_plot_urls(result, plot_dir)

            # Keep a lightweight local debug copy for development. It is outside
            # Git and can be deleted safely.
            debug_dir = APP_DIR / ".analysis_debug"
            debug_dir.mkdir(exist_ok=True)
            save_json(result, debug_dir / "latest_result.json")
            return result


def main():
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "4173"))
    server = ThreadingHTTPServer((host, port), VoiceHandler)
    display_host = "127.0.0.1" if host == "0.0.0.0" else host
    print(f"See My Voice pronunciation training is running: http://{display_host}:{port}")
    if host == "0.0.0.0":
        lan_ip = get_lan_ip()
        if lan_ip:
            print(f"LAN access: http://{lan_ip}:{port}")
        print("External access requires a public host, port forwarding, or an HTTPS tunnel.")
    print(f"Project path: {SEE_MY_VOICE_DIR}")
    print("Press Control + C to stop the server.")
    server.serve_forever()


def get_lan_ip() -> str | None:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except OSError:
        return None


if __name__ == "__main__":
    main()
