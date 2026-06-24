from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


DEFAULT_INPUT_DIR = Path("web/assets/pronunciation-clips/source-review/auto-segment-frames")


def main() -> int:
    parser = argparse.ArgumentParser(description="Make a labeled contact sheet from JPG frames.")
    parser.add_argument("--input-dir", type=Path, default=DEFAULT_INPUT_DIR)
    parser.add_argument("--output", type=Path, default=DEFAULT_INPUT_DIR / "contact-sheet.jpg")
    parser.add_argument("--columns", type=int, default=3)
    args = parser.parse_args()

    paths = sorted(args.input_dir.glob("segment-*.jpg"))
    if not paths:
        raise FileNotFoundError(f"No segment JPG files found in {args.input_dir}")

    thumbnails = []
    for path in paths:
        image = Image.open(path).convert("RGB")
        image.thumbnail((360, 204))
        canvas = Image.new("RGB", (360, 236), "white")
        canvas.paste(image, ((360 - image.width) // 2, 0))
        draw = ImageDraw.Draw(canvas)
        draw.text((10, 210), path.stem, fill=(25, 26, 47), font=ImageFont.load_default())
        thumbnails.append(canvas)

    columns = max(args.columns, 1)
    rows = (len(thumbnails) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * 360, rows * 236), (248, 245, 239))
    for index, image in enumerate(thumbnails):
        x = (index % columns) * 360
        y = (index // columns) * 236
        sheet.paste(image, (x, y))
    sheet.save(args.output, quality=88)
    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
