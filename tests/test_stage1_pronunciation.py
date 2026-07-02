import tempfile
import unittest
from pathlib import Path

import numpy as np
import soundfile as sf

import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from stage1_pronunciation import SAMPLE_RATE, ensure_recording_has_voice


class RecordingSignalTest(unittest.TestCase):
    def test_silent_recording_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "silent.wav"
            sf.write(path, np.zeros(SAMPLE_RATE, dtype=np.float32), SAMPLE_RATE)

            with self.assertRaisesRegex(ValueError, "No voice was detected"):
                ensure_recording_has_voice(path)

    def test_audible_recording_is_accepted(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "tone.wav"
            times = np.linspace(0, 1, SAMPLE_RATE, endpoint=False)
            audio = (0.05 * np.sin(2 * np.pi * 220 * times)).astype(np.float32)
            sf.write(path, audio, SAMPLE_RATE)

            stats = ensure_recording_has_voice(path)

        self.assertGreater(stats["peak"], 0)
        self.assertGreater(stats["rms"], 0)


if __name__ == "__main__":
    unittest.main()
