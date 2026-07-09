from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from pypinyin import Style, lazy_pinyin


CTC_BLANK_TOKEN = "<blank>"
MANDARIN_INITIALS = [
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
FROZEN_INITIAL_TOKENS = [
    "I_b",
    "I_p",
    "I_m",
    "I_f",
    "I_d",
    "I_t",
    "I_n",
    "I_l",
    "I_g",
    "I_k",
    "I_h",
    "I_j",
    "I_q",
    "I_x",
    "I_zh",
    "I_ch",
    "I_sh",
    "I_r",
    "I_z",
    "I_c",
    "I_s",
    "I_y",
    "I_w",
]
FROZEN_FINAL_TOKENS = [
    "F_a",
    "F_o",
    "F_e",
    "F_i",
    "F_u",
    "F_v",
    "F_ai",
    "F_ei",
    "F_ao",
    "F_ou",
    "F_an",
    "F_en",
    "F_ang",
    "F_eng",
    "F_ong",
    "F_ia",
    "F_ie",
    "F_iao",
    "F_iu",
    "F_ian",
    "F_in",
    "F_iang",
    "F_ing",
    "F_iong",
    "F_ua",
    "F_uo",
    "F_uai",
    "F_ui",
    "F_uan",
    "F_un",
    "F_uang",
    "F_ueng",
    "F_ve",
    "F_van",
    "F_vn",
    "F_er",
    "F_i_z",
    "F_i_zh",
]
FROZEN_TONE_TOKENS = ["T1", "T2", "T3", "T4", "T5"]
FROZEN_PHONE_TOKENS = FROZEN_INITIAL_TOKENS + FROZEN_FINAL_TOKENS + FROZEN_TONE_TOKENS


@dataclass
class PinyinPart:
    """One normalized Mandarin pinyin syllable split for phone-token labels."""

    index: int
    char: str
    pinyin: str
    initial: str
    final: str
    tone: str


@dataclass
class Stage3ASyllableLabel:
    """One Chinese character plus the labels we need for future scoring.

    Beginner note: Stage 3 will eventually compare the user's audio against
    expected speech units. This object is the clean expected answer for one
    syllable, such as 你 -> ni2 -> I_n + F_i + T2.
    """

    index: int
    char: str
    pinyin: str
    initial: str
    final: str
    tone: str
    syllable_token: str
    phone_tokens: list[str]


@dataclass
class Stage3ATextLabels:
    """All Stage 3A labels for one target sentence or phrase."""

    text: str
    pinyin: list[str]
    syllables: list[Stage3ASyllableLabel]
    syllable_tokens: list[str]
    phone_tokens: list[str]


def chinese_chars(text: str) -> list[str]:
    """Keep only Chinese characters so punctuation does not become a syllable."""
    return [char for char in text if "\u4e00" <= char <= "\u9fff"]


def text_to_pinyin(text: str, use_tone_sandhi: bool = True) -> list[str]:
    """Convert Chinese text to pinyin with spoken tone numbers."""
    return lazy_pinyin(
        text,
        style=Style.TONE3,
        tone_sandhi=use_tone_sandhi,
        neutral_tone_with_five=True,
        errors="ignore",
    )


def normalize_stage3a_final(initial: str, final: str) -> str:
    """Apply the frozen Mandarin phone-label final conventions.

    The repo uses pinyin-oriented initial/final/tone labels instead of IPA.
    Apical vowels need stable finals so zi/ci/si and zhi/chi/shi/ri do not all
    collapse to the same F_i token used by syllables like ni.
    """
    if initial in {"z", "c", "s"} and final == "i":
        return "i_z"
    if initial in {"zh", "ch", "sh", "r"} and final == "i":
        return "i_zh"
    if initial in {"j", "q", "x", "y"}:
        return {
            "ue": "ve",
            "uan": "van",
            "un": "vn",
        }.get(final, final)
    return final


def split_stage3a_pinyin_syllable(index: int, char: str, syllable: str) -> PinyinPart:
    """Split pinyin into the fixed Stage 3A initial/final/tone label units."""
    normalized = syllable.lower().replace("u:", "v").replace("ü", "v")
    match = re.search(r"([1-5])$", normalized)
    tone = match.group(1) if match else "5"
    base = re.sub(r"[1-5]$", "", normalized)

    for initial in MANDARIN_INITIALS:
        if base.startswith(initial):
            final = normalize_stage3a_final(initial, base[len(initial) :])
            return PinyinPart(
                index=index,
                char=char,
                pinyin=syllable,
                initial=initial,
                final=final,
                tone=tone,
            )

    return PinyinPart(
        index=index,
        char=char,
        pinyin=syllable,
        initial="",
        final=normalize_stage3a_final("", base),
        tone=tone,
    )


def make_syllable_token(pinyin: str) -> str:
    """Create one token for a whole Mandarin syllable.

    Example: ni2 becomes SYL_ni2. This is the easiest future CTC label style.
    """
    return f"SYL_{pinyin.lower()}"


def make_phone_tokens(initial: str, final: str, tone: str) -> list[str]:
    """Create initial/final/tone tokens for one Mandarin syllable.

    Beginner note:
    - I_ means initial, usually 声母, like n, h, zh.
    - F_ means final, usually 韵母, like i, ao, an.
    - T means tone, like T1, T2, T3, T4, T5.

    Some syllables have no initial, for example 爱 ai4. In that case we skip
    the initial token and keep only F_ai + T4.
    """
    tokens = []
    if initial:
        tokens.append(f"I_{initial}")
    if final:
        tokens.append(f"F_{final}")
    tokens.append(f"T{tone}")

    unknown_tokens = [token for token in tokens if token not in FROZEN_PHONE_TOKENS]
    if unknown_tokens:
        raise ValueError(
            "Unsupported Mandarin phone token(s): "
            + ", ".join(unknown_tokens)
            + ". Update the frozen Stage 3A inventory only after an explicit label-spec change."
        )
    return tokens


def text_to_stage3a_labels(
    text: str,
    use_tone_sandhi: bool = True,
) -> Stage3ATextLabels:
    """Convert Mandarin text into labels that a future CTC/GOP model can use.

    Tone sandhi means the pronounced tone can change in context. For example,
    你好 is usually spoken as ni2 hao3, not ni3 hao3. Because our product cares
    about real pronunciation, the default is to use the spoken version.
    """
    pinyin = text_to_pinyin(text, use_tone_sandhi=use_tone_sandhi)
    chars = chinese_chars(text)
    syllables = []

    for index, pinyin_syllable in enumerate(pinyin):
        char = chars[index] if index < len(chars) else ""
        part = split_stage3a_pinyin_syllable(index, char, pinyin_syllable)
        phone_tokens = make_phone_tokens(part.initial, part.final, part.tone)
        syllables.append(
            Stage3ASyllableLabel(
                index=index,
                char=part.char,
                pinyin=part.pinyin,
                initial=part.initial,
                final=part.final,
                tone=part.tone,
                syllable_token=make_syllable_token(part.pinyin),
                phone_tokens=phone_tokens,
            )
        )

    syllable_tokens = [syllable.syllable_token for syllable in syllables]
    phone_tokens = [token for syllable in syllables for token in syllable.phone_tokens]
    return Stage3ATextLabels(
        text=text,
        pinyin=pinyin,
        syllables=syllables,
        syllable_tokens=syllable_tokens,
        phone_tokens=phone_tokens,
    )


def labels_to_dict(labels: Stage3ATextLabels) -> dict[str, Any]:
    """Convert dataclasses into plain JSON-friendly Python dictionaries."""
    return {
        "text": labels.text,
        "pinyin": labels.pinyin,
        "syllable_tokens": labels.syllable_tokens,
        "phone_tokens": labels.phone_tokens,
        "syllables": [asdict(syllable) for syllable in labels.syllables],
    }


def build_inventory(label_sets: list[Stage3ATextLabels]) -> dict[str, Any]:
    """Build the token list that a future CTC model would predict.

    Beginner note: a CTC model always needs a special blank token. The model
    predicts blank during frames that do not clearly belong to a speech unit.
    We put <blank> at id 0 because many CTC libraries expect that convention.
    Phone tokens are frozen so a model checkpoint never changes vocabulary just
    because a training manifest is missing one initial, final, or tone.
    """
    syllable_tokens = sorted({token for item in label_sets for token in item.syllable_tokens})
    observed_phone_tokens = sorted({token for item in label_sets for token in item.phone_tokens})
    all_tokens = [CTC_BLANK_TOKEN] + FROZEN_PHONE_TOKENS + syllable_tokens

    return {
        "stage": "stage_3a_label_inventory",
        "blank_token": CTC_BLANK_TOKEN,
        "token_to_id": {token: index for index, token in enumerate(all_tokens)},
        "id_to_token": {str(index): token for index, token in enumerate(all_tokens)},
        "syllable_tokens": syllable_tokens,
        "phone_tokens": FROZEN_PHONE_TOKENS,
        "observed_phone_tokens": observed_phone_tokens,
        "phone_token_families": {
            "initials": FROZEN_INITIAL_TOKENS,
            "finals": FROZEN_FINAL_TOKENS,
            "tones": FROZEN_TONE_TOKENS,
        },
        "label_rules": [
            "Each Chinese syllable becomes optional initial + final + tone.",
            "ü is written as v.",
            "Neutral tone is T5.",
            "No-initial syllables skip I_*.",
            "zh/ch/sh are single initial tokens.",
            "zi/ci/si use F_i_z.",
            "zhi/chi/shi/ri use F_i_zh.",
            "Tone sandhi is enabled by default for spoken pronunciation.",
        ],
        "notes": [
            "Syllable tokens are the easiest first CTC target, for example SYL_ni2.",
            "Phone tokens split each syllable into initial/final/tone, for example I_n F_i T2.",
            "Phone tokens are frozen for Stage 3 phone-model training.",
            "Syllable tokens are still manifest-derived and should not be used as a fixed phone-model vocabulary.",
        ],
    }


def write_json(data: Any, path: Path) -> None:
    """Save readable UTF-8 JSON so Chinese text stays visible."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
