from __future__ import annotations

import hashlib
import json
import os
import struct
from pathlib import Path


APP_DIR = Path(__file__).resolve().parent
TTS_CACHE_DIR = APP_DIR / ".tts_cache"
TTS_ENDPOINT = "wss://openspeech.bytedance.com/api/v3/tts/unidirectional/stream"


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def tts_cache_key(text: str, speaker: str, model: str, audio_format: str, sample_rate: int) -> str:
    payload = json.dumps(
        {
            "text": text,
            "speaker": speaker,
            "model": model,
            "format": audio_format,
            "sample_rate": sample_rate,
        },
        ensure_ascii=False,
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:32]


def cached_tts_url(text: str) -> str:
    speaker = _env("DOUBAO_TTS_SPEAKER", "zh_female_cancan_mars_bigtts")
    model = _env("DOUBAO_TTS_MODEL", "seed-tts-2.0-standard")
    audio_format = _env("DOUBAO_TTS_FORMAT", "mp3")
    sample_rate = int(_env("DOUBAO_TTS_SAMPLE_RATE", "24000"))
    key = tts_cache_key(text, speaker, model, audio_format, sample_rate)
    path = TTS_CACHE_DIR / f"{key}.{audio_format}"
    if path.exists():
        return f"/.tts_cache/{path.name}"
    return ""


def _build_request_frame(payload: dict) -> bytes:
    payload_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    header = bytes([0x11, 0x10, 0x10, 0x00])
    return header + struct.pack(">I", len(payload_bytes)) + payload_bytes


def _parse_response_frame(frame: bytes) -> tuple[int | None, bytes]:
    if len(frame) < 4:
        raise RuntimeError("Doubao TTS returned an invalid empty frame.")

    message_type = frame[1] >> 4
    header_size = (frame[0] & 0x0F) * 4
    offset = header_size

    if message_type == 0x0F:
        code = struct.unpack(">I", frame[offset : offset + 4])[0] if len(frame) >= offset + 4 else 0
        message = frame[offset + 4 :].decode("utf-8", errors="replace")
        raise RuntimeError(f"Doubao TTS failed: {code} {message}")

    if len(frame) < offset + 8:
        return None, b""

    event = struct.unpack(">I", frame[offset : offset + 4])[0]
    offset += 4

    session_id_size = struct.unpack(">I", frame[offset : offset + 4])[0]
    offset += 4 + session_id_size

    if len(frame) < offset + 4:
        return event, b""

    payload_size = struct.unpack(">I", frame[offset : offset + 4])[0]
    offset += 4
    return event, frame[offset : offset + payload_size]


def _auth_headers(resource_id: str) -> dict[str, str]:
    api_key = _env("DOUBAO_TTS_API_KEY")
    if api_key:
        return {
            "X-Api-Key": api_key,
            "X-Api-Resource-Id": resource_id,
        }

    app_id = _env("DOUBAO_TTS_APP_ID")
    access_token = _env("DOUBAO_TTS_ACCESS_TOKEN")
    if app_id and access_token:
        return {
            "X-Api-App-Id": app_id,
            "X-Api-Access-Key": access_token,
            "X-Api-Resource-Id": resource_id,
        }

    raise RuntimeError(
        "Missing Doubao TTS credentials. Set DOUBAO_TTS_API_KEY, or set both "
        "DOUBAO_TTS_APP_ID and DOUBAO_TTS_ACCESS_TOKEN."
    )


async def _generate_with_websocket(text: str, output_path: Path) -> None:
    import inspect

    import websockets

    resource_id = _env("DOUBAO_TTS_RESOURCE_ID", "seed-tts-2.0")
    model = _env("DOUBAO_TTS_MODEL", "seed-tts-2.0-standard")
    speaker = _env("DOUBAO_TTS_SPEAKER", "zh_female_cancan_mars_bigtts")
    audio_format = _env("DOUBAO_TTS_FORMAT", "mp3")
    sample_rate = int(_env("DOUBAO_TTS_SAMPLE_RATE", "24000"))

    payload = {
        "user": {"uid": _env("DOUBAO_TTS_UID", "see-my-voice")},
        "req_params": {
            "text": text,
            "model": model,
            "speaker": speaker,
            "audio_params": {
                "format": audio_format,
                "sample_rate": sample_rate,
                "speech_rate": int(_env("DOUBAO_TTS_SPEECH_RATE", "0")),
                "loudness_rate": int(_env("DOUBAO_TTS_LOUDNESS_RATE", "0")),
            },
        },
    }
    headers = _auth_headers(resource_id)

    chunks: list[bytes] = []
    header_arg = (
        {"additional_headers": headers}
        if "additional_headers" in inspect.signature(websockets.connect).parameters
        else {"extra_headers": headers}
    )
    async with websockets.connect(TTS_ENDPOINT, **header_arg) as websocket:
        await websocket.send(_build_request_frame(payload))
        async for message in websocket:
            event, data = _parse_response_frame(message)
            if event == 352 and data:
                chunks.append(data)
            elif event == 152:
                break

    if not chunks:
        raise RuntimeError("Doubao TTS returned no audio data.")
    output_path.write_bytes(b"".join(chunks))


def generate_tts_audio(text: str) -> dict:
    text = text.strip()
    if not text:
        raise ValueError("Text is required.")
    if len(text) > int(_env("DOUBAO_TTS_MAX_CHARS", "500")):
        raise ValueError("Text is too long for one TTS request.")

    speaker = _env("DOUBAO_TTS_SPEAKER", "zh_female_cancan_mars_bigtts")
    model = _env("DOUBAO_TTS_MODEL", "seed-tts-2.0-standard")
    audio_format = _env("DOUBAO_TTS_FORMAT", "mp3")
    sample_rate = int(_env("DOUBAO_TTS_SAMPLE_RATE", "24000"))
    key = tts_cache_key(text, speaker, model, audio_format, sample_rate)

    TTS_CACHE_DIR.mkdir(exist_ok=True)
    output_path = TTS_CACHE_DIR / f"{key}.{audio_format}"
    if output_path.exists():
        return {"audioUrl": f"/.tts_cache/{output_path.name}", "cached": True}

    import asyncio

    asyncio.run(_generate_with_websocket(text, output_path))
    return {"audioUrl": f"/.tts_cache/{output_path.name}", "cached": False}
