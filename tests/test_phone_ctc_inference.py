from __future__ import annotations

import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from phone_ctc_inference import (
    compare_phone_tokens,
    decode_ctc_ids,
    expected_phone_tokens_for_text,
)


def test_decode_ctc_ids_collapses_repeats_and_skips_blank() -> None:
    id_to_phone_token = {
        0: "<blank>",
        1: "I_n",
        2: "F_i",
        3: "T2",
    }

    assert decode_ctc_ids([0, 1, 1, 0, 2, 2, 3, 3, 0], id_to_phone_token) == [
        "I_n",
        "F_i",
        "T2",
    ]


def test_compare_phone_tokens_reports_accuracy_from_expected_tokens() -> None:
    result = compare_phone_tokens(
        ["I_n", "F_i", "T2", "I_h", "F_ao", "T3"],
        ["I_n", "F_i", "T2", "F_ao", "T3"],
    )

    assert result == {
        "edit_distance": 1,
        "token_accuracy": 83.3,
        "exact_match": False,
    }


def test_expected_phone_tokens_use_stage3a_spoken_rules() -> None:
    assert expected_phone_tokens_for_text("你好") == [
        "I_n",
        "F_i",
        "T2",
        "I_h",
        "F_ao",
        "T3",
    ]
    assert expected_phone_tokens_for_text("是字儿女") == [
        "I_sh",
        "F_i_zh",
        "T4",
        "I_z",
        "F_i_z",
        "T4",
        "F_er",
        "T2",
        "I_n",
        "F_v",
        "T3",
    ]
