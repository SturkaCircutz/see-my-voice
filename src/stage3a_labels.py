from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from stage1_pronunciation import split_pinyin_syllable, text_to_pinyin


CTC_BLANK_TOKEN = "<blank>"


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
        part = split_pinyin_syllable(index, char, pinyin_syllable)
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
    """
    syllable_tokens = sorted({token for item in label_sets for token in item.syllable_tokens})
    phone_tokens = sorted({token for item in label_sets for token in item.phone_tokens})
    all_tokens = [CTC_BLANK_TOKEN] + sorted(set(syllable_tokens + phone_tokens))

    return {
        "stage": "stage_3a_label_inventory",
        "blank_token": CTC_BLANK_TOKEN,
        "token_to_id": {token: index for index, token in enumerate(all_tokens)},
        "id_to_token": {str(index): token for index, token in enumerate(all_tokens)},
        "syllable_tokens": syllable_tokens,
        "phone_tokens": phone_tokens,
        "notes": [
            "Syllable tokens are the easiest first CTC target, for example SYL_ni2.",
            "Phone tokens split each syllable into initial/final/tone, for example I_n F_i T2.",
            "This inventory is built from the current sample manifest, so it will grow as more phrases are added.",
        ],
    }


def write_json(data: Any, path: Path) -> None:
    """Save readable UTF-8 JSON so Chinese text stays visible."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
