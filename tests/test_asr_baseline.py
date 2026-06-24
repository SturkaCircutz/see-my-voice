import subprocess
import unittest

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from run_asr_baseline import check_output_with_ffmpeg_permission_fallback


class AsrBaselineTest(unittest.TestCase):
    def test_ffmpeg_permission_probe_falls_back_to_missing_ffmpeg(self):
        def blocked_check_output(*args, **kwargs):
            raise PermissionError("blocked")

        with self.assertRaises(FileNotFoundError):
            check_output_with_ffmpeg_permission_fallback(blocked_check_output, ["ffmpeg", "-version"])

    def test_non_ffmpeg_permission_error_is_preserved(self):
        def blocked_check_output(*args, **kwargs):
            raise PermissionError("blocked")

        with self.assertRaises(PermissionError):
            check_output_with_ffmpeg_permission_fallback(blocked_check_output, ["python", "--version"])

    def test_normal_check_output_result_is_preserved(self):
        def ok_check_output(*args, **kwargs):
            return b"ok"

        self.assertEqual(
            check_output_with_ffmpeg_permission_fallback(
                ok_check_output,
                ["python", "--version"],
                stderr=subprocess.STDOUT,
            ),
            b"ok",
        )


if __name__ == "__main__":
    unittest.main()
