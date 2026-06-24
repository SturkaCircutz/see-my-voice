from __future__ import annotations

import argparse
import json
from pathlib import Path

from inspect_pronunciation_source import DEFAULT_SOURCE, extract_frame, timestamp


DEFAULT_SEGMENTS = Path("web/assets/pronunciation-clips/source-review/auto_segments.json")
DEFAULT_OUTPUT_DIR = Path("web/assets/pronunciation-clips/source-review/auto-segment-frames")


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract review frames for auto-detected speech segments.")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--segments", type=Path, default=DEFAULT_SEGMENTS)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    args = parser.parse_args()

    payload = json.loads(args.segments.read_text(encoding="utf-8"))
    segments = payload.get("segments", [])
    args.output_dir.mkdir(parents=True, exist_ok=True)

    rows = []
    for index, segment in enumerate(segments, start=1):
        midpoint = (float(segment["start"]) + float(segment["end"])) / 2
        filename = f"segment-{index:02d}-{int(midpoint):05d}s.jpg"
        output_path = args.output_dir / filename
        extract_frame(args.source, midpoint, output_path)
        rows.append({
            "index": index,
            "start": timestamp(segment["start"]),
            "end": timestamp(segment["end"]),
            "midpoint": timestamp(midpoint),
            "file": filename,
        })

    cards = "\n".join(
        f"""
        <article>
          <img src="{row['file']}" alt="segment {row['index']}">
          <strong>候选 {row['index']:02d}</strong>
          <span>{row['start']} - {row['end']}</span>
          <span>mid {row['midpoint']}</span>
        </article>
        """
        for row in rows
    )
    html = f"""<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <title>Auto Segment Contact Sheet</title>
    <style>
      body {{ margin: 0; padding: 20px; background: #f8f5ef; color: #29283b; font-family: Arial, "Microsoft YaHei", sans-serif; }}
      main {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }}
      article {{ display: grid; gap: 5px; padding: 10px; border: 1px solid #ded9d0; border-radius: 8px; background: #fffefa; }}
      img {{ width: 100%; border-radius: 6px; background: #111; }}
      span {{ color: #8b8991; font-family: Consolas, monospace; font-size: 12px; }}
    </style>
  </head>
  <body>
    <h1>自动候选片段截图</h1>
    <main>{cards}</main>
  </body>
</html>
"""
    (args.output_dir / "index.html").write_text(html, encoding="utf-8")
    print(f"Wrote {len(rows)} segment frame(s) to {args.output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
