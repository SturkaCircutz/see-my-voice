from pathlib import Path

from stage1_pronunciation import analyze_pronunciation_stage1, save_json


TARGET_TEXT = "你好"
DEFAULT_AUDIO_CANDIDATES = [
    Path("sample.wav"),
    Path("sample.m4a"),
    Path("你好.m4a"),
    Path.home() / "Desktop" / "你好.m4a",
    Path.home()
    / "Library"
    / "CloudStorage"
    / "OneDrive-BowdoinCollege"
    / "Desktop"
    / "你好.m4a",
]
OUTPUT_PATH = Path("stage1_feedback.json")


def main() -> int:
    audio_path = next((path for path in DEFAULT_AUDIO_CANDIDATES if path.exists()), None)
    if audio_path is None:
        candidates = ", ".join(str(path) for path in DEFAULT_AUDIO_CANDIDATES)
        print(f"Put a short recording in this folder first. Expected one of: {candidates}")
        print(f'The recording should contain only the target phrase: "{TARGET_TEXT}"')
        return 1

    result = analyze_pronunciation_stage1(TARGET_TEXT, audio_path)
    save_json(result, OUTPUT_PATH)

    print(f'Target text: {result["text"]}')
    print(f'Pinyin: {" ".join(result["pinyin"])}')
    print(f'Overall Stage 1 score: {result["overall_score"]}')
    print()
    for syllable in result["syllables"]:
        print(
            f'{syllable["char"]} {syllable["pinyin"]}: '
            f'tone score={syllable["scores"]["tone"]} - {syllable["feedback"]}'
        )
    print(f"\nSaved full JSON to {OUTPUT_PATH.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
