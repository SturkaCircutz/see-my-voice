import json
import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from stage3a_labels import CTC_BLANK_TOKEN, FROZEN_PHONE_TOKENS, text_to_stage3a_labels


class Stage3ALabelTest(unittest.TestCase):
    def test_phone_token_examples_use_frozen_rules(self):
        examples = {
            "你好": ["I_n", "F_i", "T2", "I_h", "F_ao", "T3"],
            "爱": ["F_ai", "T4"],
            "女": ["I_n", "F_v", "T3"],
            "是": ["I_sh", "F_i_zh", "T4"],
            "字": ["I_z", "F_i_z", "T4"],
            "儿": ["F_er", "T2"],
        }

        for text, expected_tokens in examples.items():
            with self.subTest(text=text):
                labels = text_to_stage3a_labels(text)
                self.assertEqual(labels.phone_tokens, expected_tokens)

    def test_frozen_inventory_file_matches_label_constants(self):
        inventory_path = Path(__file__).resolve().parents[1] / "data" / "mandarin_phone_inventory.json"
        inventory = json.loads(inventory_path.read_text(encoding="utf-8"))

        self.assertEqual(inventory["blank_token"], CTC_BLANK_TOKEN)
        self.assertEqual(inventory["phone_tokens"], FROZEN_PHONE_TOKENS)
        self.assertEqual(inventory["token_to_id"][CTC_BLANK_TOKEN], 0)
        for index, token in enumerate(FROZEN_PHONE_TOKENS, start=1):
            self.assertEqual(inventory["token_to_id"][token], index)


if __name__ == "__main__":
    unittest.main()
