import argparse
from pathlib import Path

from stage1_pronunciation import analyze_pronunciation_stage1, save_json


TARGET_TEXT = "你好"
DEFAULT_AUDIO = Path("samples") / "你好.m4a"
OUTPUT_PATH = Path("stage1_feedback.json")
PLOT_DIR = Path("stage1_plots")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Stage 1.5 Mandarin tone feedback.")
    parser.add_argument(
        "--text",
        default=TARGET_TEXT,
        help='Target Chinese text that the recording contains, e.g. "你好" or "妈妈".',
    )
    parser.add_argument(
        "--audio",
        type=Path,
        default=None,
        help="Path to a user recording. Supports wav and m4a.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_PATH,
        help="Where to save the feedback JSON.",
    )
    parser.add_argument(
        "--plot-dir",
        type=Path,
        default=PLOT_DIR,
        help="Where to save pitch visualization PNG files.",
    )
    args = parser.parse_args()

    audio_path = args.audio if args.audio is not None else DEFAULT_AUDIO
    if not audio_path.exists():
        print(f"Audio file not found: {audio_path}")
        print(f"Put the recording in samples/, or pass it with --audio.")
        print(f'The recording should contain only the target phrase: "{args.text}"')
        return 1

    result = analyze_pronunciation_stage1(args.text, audio_path, plot_dir=args.plot_dir)
    save_json(result, args.output)

    print(f'Target text: {result["text"]}')
    print(f"Audio file: {audio_path}")
    print(f'Pinyin: {" ".join(result["pinyin"])}')
    print(f'Overall Stage 1 score: {result["overall_score"]}')
    print(
        "Detected speech region: "
        f'{result["speech_region"]["start"]:.2f}s - {result["speech_region"]["end"]:.2f}s'
    )
    print()
    for syllable in result["syllables"]:
        print(
            f'{syllable["char"]} {syllable["pinyin"]}: '
            f'tone score={syllable["scores"]["tone"]} - {syllable["feedback"]}'
        )
    print(f"\nSaved full JSON to {args.output.resolve()}")
    if result["plots"]:
        print(f'Saved pitch overview to {Path(result["plots"]["pitch_overview"]).resolve()}')
        print(f"Saved syllable plots in {args.plot_dir.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
