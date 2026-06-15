from __future__ import annotations

from email.parser import BytesParser
from email.policy import default
import json
import os
import shutil
import sys
import tempfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


APP_DIR = Path(__file__).resolve().parent
SEE_MY_VOICE_DIR = Path(
    os.environ.get(
        "SEE_MY_VOICE_DIR",
        "/Users/chloe/Library/CloudStorage/OneDrive-BowdoinCollege/Desktop/see-my-voice",
    )
)
SEE_MY_VOICE_SRC = SEE_MY_VOICE_DIR / "src"

if str(SEE_MY_VOICE_SRC) not in sys.path:
    sys.path.insert(0, str(SEE_MY_VOICE_SRC))

from run_asr_baseline import DEFAULT_MODEL_NAME, build_model, normalize_chinese_text  # noqa: E402
from run_stage2b_combined import combine_results  # noqa: E402
from pypinyin import Style, lazy_pinyin  # noqa: E402
from stage1_pronunciation import (  # noqa: E402
    estimate_f0,
    f0_values_in_window,
    load_audio,
    normalize_f0_shape,
    save_json,
    text_to_syllable_parts,
    tone_template,
)


ASR_MODEL = None
STANDARD_AUDIO_DIR = APP_DIR / "assets" / "standard-audio"


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
    """Load FunASR once and reuse it for later recordings."""
    global ASR_MODEL
    if ASR_MODEL is None:
        ASR_MODEL = build_model(DEFAULT_MODEL_NAME, "cpu")
    return ASR_MODEL


def convert_to_wav(input_path: Path, output_path: Path) -> Path:
    """Convert browser-recorded audio to wav when ffmpeg is available.

    Browser MediaRecorder usually sends webm audio. PyAV can often read it
    directly, but converting to wav first makes FunASR and the pitch pipeline
    more stable. If ffmpeg is missing, we fall back to the original file and let
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
        raise RuntimeError("录音文件里没有可读取的音频流。")

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
        raise RuntimeError("无法从浏览器录音中解码音频。")

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
    return ""


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
    """Create a Stage 3-lite pinyin issue from ASR-vs-target differences."""
    target_label = pinyin_unit_label(target)
    if heard is None:
        return {
            "type": "missing",
            "title": "这个音节没有被稳定听清",
            "summary": f"目标是 {target_label}，但系统没有在对应位置听到清楚的音节。",
            "focus": "整音节",
            "practice": [target.get("char", "")],
            "detail": "建议先慢速读这个字，再和前后字连起来。注意起音、韵母和声调都要完整，不要太轻或太快。",
        }

    heard_label = pinyin_unit_label(heard)
    initial_changed = target.get("initial") != heard.get("initial")
    final_changed = target.get("final") != heard.get("final")
    tone_changed = target.get("tone") != heard.get("tone")

    if initial_changed and not final_changed:
        value = target.get("initial") or "零声母"
        return {
            "type": "initial",
            "title": f"声母 {value} 可能不够清楚",
            "summary": f"目标是 {target_label}，系统听成了 {heard_label}。主要差异在声母开头。",
            "focus": f"声母 {value}",
            "practice": drill_words("initial", value, target.get("char", "")),
            "detail": "先单独练起音，再接上韵母。录音时可以稍微放慢，让开头的气流、舌尖或唇齿动作更清楚。",
        }
    if final_changed and not initial_changed:
        value = target.get("final") or "韵母"
        return {
            "type": "final",
            "title": f"韵母 {value} 可能不够完整",
            "summary": f"目标是 {target_label}，系统听成了 {heard_label}。声母接近，但后面的韵母不同。",
            "focus": f"韵母 {value}",
            "practice": drill_words("final", value, target.get("char", "")),
            "detail": "重点把口型变化和结尾收音做完整。可以先拖长韵母，再逐渐恢复正常语速。",
        }
    if tone_changed and not initial_changed and not final_changed:
        tone = target.get("tone") or ""
        return {
            "type": "tone",
            "title": f"声调 T{tone} 可能影响识别",
            "summary": f"目标是 {target_label}，系统听成了 {heard_label}。声母和韵母接近，主要差异在声调。",
            "focus": f"声调 T{tone}",
            "practice": [target.get("char", "")],
            "detail": "对照声调趋势线练习高低变化。先夸张一点读准方向，再回到自然语速。",
        }

    return {
        "type": "syllable",
        "title": "整个音节可能需要重练",
        "summary": f"目标是 {target_label}，系统听成了 {heard_label}。声母、韵母或声调可能同时有差异。",
        "focus": "整音节",
        "practice": [target.get("char", "")],
        "detail": "建议把这个音节拆成“声母 + 韵母 + 声调”三步练：先练起音，再练韵母口型，最后加上声调。",
    }


def add_pinyin_diagnosis(result: dict, target_text: str) -> dict:
    """Stage 3-lite: compare target pinyin with ASR-heard pinyin.

    This does not inspect phoneme probabilities. It only reports pinyin-level
    differences when the ASR heard a different syllable, so the UI should call
    them "possible" pronunciation issues.
    """
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
                    "title": "系统听到了额外音节",
                    "summary": f"系统额外听到了 {pinyin_unit_label(extra)}，可能是拖音、杂音或多读了一个音。",
                    "focus": "节奏",
                    "practice": [],
                    "detail": "建议录音时减少停顿和杂音，读完目标句子后尽快停止录音。",
                }
            )

    if issues:
        summary = f"系统发现 {len(issues)} 个可能影响听懂的拼音差异。"
    else:
        summary = "系统听到的拼音和目标拼音一致，当前更适合重点看声调和节奏。"

    result["pinyin_diagnosis"] = {
        "method": "ASR 听辨结果与目标拼音对比",
        "limitation": "这是 Stage 3-lite：能发现明显影响识别的拼音差异，但不是逐音素 CTC/GOP 精密评分。",
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
    """Return product-facing Chinese feedback only."""
    if score is None:
        return "录音后会根据你的声调走向给出建议。"
    if score >= 82:
        return "声调走向比较接近目标，可以继续保持。"
    if score >= 68:
        prefix = "声调大方向接近，但还不够稳定。"
    else:
        prefix = "这个音节需要重点练习。"

    if tone == "1":
        return f"{prefix}第一声要保持高而平，避免中途下滑或抖动。"
    if tone == "2":
        return f"{prefix}第二声要从较低处自然上扬，结尾需要更明显地升起来。"
    if tone == "3":
        return f"{prefix}第三声中间要先降到低点，再轻轻回升，不要一直平着读。"
    if tone == "4":
        return f"{prefix}第四声要从高处快速下降，结尾要收得干净。"
    return f"{prefix}轻声要短而轻，不要拖得太长。"


def tone_name(tone: str) -> str:
    return {
        "1": "第一声",
        "2": "第二声",
        "3": "第三声",
        "4": "第四声",
        "5": "轻声",
    }.get(str(tone), "目标声调")


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
            f"{syllable.get('char', '')} 的目标是{tone_name(tone)}。"
            f"系统会把你的音高变化简化成一条红线，再和绿色目标线比较；"
            f"当前分数是 {score} 分，主要看趋势是否接近，不代表声母、韵母已经完全准确。"
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


class VoiceHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_DIR), **kwargs)

    def send_json(self, data, status=200):
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self.send_json(
                {
                    "ok": True,
                    "model": DEFAULT_MODEL_NAME,
                    "see_my_voice_dir": str(SEE_MY_VOICE_DIR),
                }
            )
            return
        if parsed.path == "/api/text-info":
            text = (parse_qs(parsed.query).get("text") or [""])[0].strip()
            self.send_json(text_info(text))
            return
        super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/analyze":
            self.send_error(404, "Not found")
            return

        try:
            result = self.handle_analyze()
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=500)
            return

        self.send_json(result)

    def handle_analyze(self):
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
            raise ValueError("请先输入想练习的中文句子。")

        audio_bytes = files.get("audio")
        if not audio_bytes:
            raise ValueError("没有收到录音文件。")

        with tempfile.TemporaryDirectory(prefix="see_my_voice_web_") as temp_dir:
            temp_path = Path(temp_dir)
            raw_audio = temp_path / "recording.webm"
            raw_audio.write_bytes(audio_bytes)
            wav_audio = temp_path / "recording.wav"
            audio_for_model = browser_audio_to_wav(raw_audio, wav_audio)

            plot_dir = temp_path / "plots"
            model = get_model()
            result = combine_results(target_text, audio_for_model, model, plot_dir)
            result["communication_result"]["main_feedback"] = result["communication_result"][
                "main_feedback"
            ].replace("pitch 图", "声调趋势图").replace("看 声调趋势图", "看声调趋势图")
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
    port = int(os.environ.get("PORT", "4173"))
    server = ThreadingHTTPServer(("127.0.0.1", port), VoiceHandler)
    print(f"声见 FunASR 原型已启动：http://127.0.0.1:{port}")
    print(f"模型项目路径：{SEE_MY_VOICE_DIR}")
    print("按 Control + C 停止服务。")
    server.serve_forever()


if __name__ == "__main__":
    main()
