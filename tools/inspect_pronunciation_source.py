from __future__ import annotations

import argparse
import json
import math
import shutil
from datetime import datetime, timezone
from pathlib import Path

import av


DEFAULT_SOURCE = Path(r"C:\Users\21628\Desktop\6月17日 (4)(2).mp4")
DEFAULT_OUTPUT_DIR = Path("web/assets/pronunciation-clips/source-review")

COMMON_UNITS = [
    ("b", "initial"),
    ("p", "initial"),
    ("m", "initial"),
    ("f", "initial"),
    ("d", "initial"),
    ("t", "initial"),
    ("n", "initial"),
    ("l", "initial"),
    ("g", "initial"),
    ("k", "initial"),
    ("h", "initial"),
    ("j", "initial"),
    ("q", "initial"),
    ("x", "initial"),
    ("zh", "initial"),
    ("ch", "initial"),
    ("sh", "initial"),
    ("r", "initial"),
    ("z", "initial"),
    ("c", "initial"),
    ("s", "initial"),
    ("y", "initial"),
    ("w", "initial"),
    ("a", "final"),
    ("o", "final"),
    ("e", "final"),
    ("i", "final"),
    ("u", "final"),
    ("v", "final"),
    ("ai", "final"),
    ("ei", "final"),
    ("ao", "final"),
    ("ou", "final"),
    ("an", "final"),
    ("en", "final"),
    ("ang", "final"),
    ("eng", "final"),
    ("ong", "final"),
    ("in", "final"),
    ("ing", "final"),
    ("ie", "final"),
    ("ui", "final"),
    ("iu", "final"),
    ("un", "final"),
    ("vn", "final"),
]


def timestamp(seconds: float) -> str:
    seconds = max(float(seconds), 0.0)
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    rest = seconds - hours * 3600 - minutes * 60
    return f"{hours:02d}:{minutes:02d}:{rest:06.3f}"


def video_metadata(source: Path) -> dict:
    with av.open(str(source)) as container:
        video_stream = next((stream for stream in container.streams if stream.type == "video"), None)
        audio_stream = next((stream for stream in container.streams if stream.type == "audio"), None)
        if not video_stream:
            raise ValueError(f"No video stream found in {source}")
        duration = float(container.duration or 0) / av.time_base if container.duration else 0.0
        if not duration and video_stream.duration and video_stream.time_base:
            duration = float(video_stream.duration * video_stream.time_base)
        return {
            "source": str(source),
            "sizeBytes": source.stat().st_size,
            "durationSeconds": round(duration, 3),
            "duration": timestamp(duration),
            "video": {
                "codec": video_stream.codec_context.name,
                "width": video_stream.codec_context.width,
                "height": video_stream.codec_context.height,
                "averageRate": str(video_stream.average_rate or ""),
                "frames": video_stream.frames,
            },
            "audio": {
                "codec": audio_stream.codec_context.name if audio_stream else "",
                "sampleRate": audio_stream.codec_context.sample_rate if audio_stream else 0,
                "channels": audio_stream.codec_context.channels if audio_stream else 0,
            },
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        }


def extract_frame(source: Path, seconds: float, output_path: Path) -> bool:
    with av.open(str(source)) as container:
        video_stream = next((stream for stream in container.streams if stream.type == "video"), None)
        if not video_stream:
            return False
        seek_target = int(seconds / float(video_stream.time_base))
        container.seek(seek_target, stream=video_stream)
        for frame in container.decode(video_stream):
            if float(frame.pts * video_stream.time_base) + 0.05 < seconds:
                continue
            image = frame.to_image()
            image.thumbnail((360, 204))
            image.save(output_path, quality=82)
            return True
    return False


def write_review_html(output_dir: Path, metadata: dict, frame_items: list[dict]) -> None:
    source_url = Path(metadata["source"]).resolve().as_uri()
    auto_segments_path = output_dir / "auto_segments.json"
    auto_segments = []
    if auto_segments_path.exists():
        auto_segments = json.loads(auto_segments_path.read_text(encoding="utf-8")).get("segments", [])
    rows = "\n".join(
        f"""
        <article class="frame" data-seconds="{item['seconds']}">
          <img src="{item['file']}" alt="Frame at {item['time']}">
          <strong>{item['time']}</strong>
          <button type="button" data-seek="{item['seconds']}">跳到这里</button>
        </article>
        """
        for item in frame_items
    )
    auto_rows = "\n".join(
        f"""
        <article class="auto-segment">
          <strong>候选 {index:02d}</strong>
          <span>{timestamp(segment['start'])} - {timestamp(segment['end'])}</span>
          <button type="button" data-seek="{segment['start']}">试听</button>
          <button type="button" data-copy-draft data-index="{index}" data-start="{timestamp(segment['start'])}" data-end="{timestamp(segment['end'])}" data-duration="{segment['duration']}">复制候选 CSV</button>
        </article>
        """
        for index, segment in enumerate(auto_segments, start=1)
    )
    unit_rows = "\n".join(
        f"""
        <tr>
          <td><code>{unit}</code></td>
          <td><code>{clip_type}</code></td>
          <td><input data-field="start" aria-label="{unit} start"></td>
          <td><input data-field="end" aria-label="{unit} end"></td>
          <td><input data-field="title" value="{'声母' if clip_type == 'initial' else '韵母'} {unit} 发音示范"></td>
          <td><input data-field="notes" placeholder="发音提示"></td>
          <td>
            <button type="button" data-mark-start>记开始</button>
            <button type="button" data-mark-end>记结束</button>
            <button type="button" data-copy-row data-unit="{unit}" data-type="{clip_type}">复制 CSV</button>
          </td>
        </tr>
        """
        for unit, clip_type in COMMON_UNITS
    )
    html = f"""<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <title>Pronunciation Source Review</title>
    <style>
      body {{ margin: 0; padding: 24px; color: #29283b; background: #f8f5ef; font-family: Arial, "Microsoft YaHei", sans-serif; }}
      h1, h2 {{ margin: 0 0 12px; }}
      p {{ line-height: 1.6; }}
      code, td, input, textarea {{ font-family: Consolas, monospace; }}
      button {{ min-height: 32px; border: 0; border-radius: 6px; color: #fff; background: #191a2f; cursor: pointer; }}
      input {{ width: 100%; min-width: 96px; padding: 7px; border: 1px solid #ded9d0; border-radius: 6px; }}
      .workspace {{ display: grid; grid-template-columns: minmax(320px, 720px) 1fr; gap: 18px; align-items: start; }}
      .sticky {{ position: sticky; top: 16px; }}
      .panel {{ padding: 14px; border: 1px solid #ded9d0; border-radius: 10px; background: #fffefa; }}
      video {{ display: block; width: 100%; background: #111; border-radius: 8px; }}
      .timebar {{ display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; }}
      .timebar strong {{ font-size: 18px; }}
      .quick-actions {{ display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }}
      .meta, .frames, table {{ margin-top: 18px; }}
      .frames {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }}
      .frame {{ padding: 8px; border: 1px solid #ded9d0; border-radius: 8px; background: #fffefa; }}
      .frame img {{ display: block; width: 100%; border-radius: 4px; background: #111; }}
      .frame strong {{ display: block; margin-top: 6px; }}
      .auto-list {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; margin-top: 12px; }}
      .auto-segment {{ display: grid; gap: 6px; padding: 10px; border: 1px solid #ded9d0; border-radius: 8px; background: #fffefa; }}
      .auto-segment span {{ color: #8b8991; font-family: Consolas, monospace; }}
      table {{ width: 100%; border-collapse: collapse; background: #fffefa; }}
      th, td {{ padding: 8px; border: 1px solid #ded9d0; text-align: left; }}
      th {{ background: #ece8df; }}
      .csv-output {{ width: 100%; min-height: 120px; margin-top: 12px; padding: 10px; border: 1px solid #ded9d0; border-radius: 8px; background: #fffefa; }}
      @media (max-width: 980px) {{ .workspace {{ grid-template-columns: 1fr; }} .sticky {{ position: static; }} }}
    </style>
  </head>
  <body>
    <h1>发音源视频审阅</h1>
    <p>源视频：<code>{metadata['source']}</code></p>
    <p>时长：<strong>{metadata['duration']}</strong>，分辨率：{metadata['video']['width']}x{metadata['video']['height']}</p>
    <div class="workspace">
      <aside class="sticky panel">
        <video id="source-video" controls src="{source_url}"></video>
        <div class="timebar">
          <span>当前时间</span>
          <strong id="current-time">00:00:00.000</strong>
        </div>
        <div class="quick-actions">
          <button type="button" id="copy-all">复制全部已填 CSV</button>
          <button type="button" id="clear-output">清空输出</button>
        </div>
        <textarea id="csv-output" class="csv-output" readonly placeholder="复制的 CSV 行会出现在这里"></textarea>
      </aside>
      <main>
        <h2>抽帧索引</h2>
        <p>先用截图快速定位，再播放源视频微调时间。点表格中的“记开始/记结束”会写入当前播放时间。</p>
        <h2>自动候选片段</h2>
        <p>这些片段由音频能量自动检测生成，只是草稿。请试听后把 unit/type 改成真实声母或韵母。</p>
        <section class="auto-list">{auto_rows or "<p>还没有自动候选片段。先运行 python tools/auto_segment_pronunciation_source.py</p>"}</section>
        <section class="frames">{rows}</section>
        <h2>标注清单模板</h2>
        <table>
          <thead><tr><th>unit</th><th>type</th><th>start</th><th>end</th><th>title</th><th>notes</th><th>actions</th></tr></thead>
          <tbody>{unit_rows}</tbody>
        </table>
      </main>
    </div>
    <script>
      const video = document.querySelector("#source-video");
      const currentTime = document.querySelector("#current-time");
      const output = document.querySelector("#csv-output");
      function timestamp(seconds) {{
        seconds = Math.max(Number(seconds) || 0, 0);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const rest = seconds - hours * 3600 - minutes * 60;
        return `${{String(hours).padStart(2, "0")}}:${{String(minutes).padStart(2, "0")}}:${{rest.toFixed(3).padStart(6, "0")}}`;
      }}
      function csvEscape(value) {{
        const text = String(value || "");
        return /[",\\n]/.test(text) ? `"${{text.replaceAll('"', '""')}}"` : text;
      }}
      function updateTime() {{
        currentTime.textContent = timestamp(video.currentTime);
      }}
      video.addEventListener("timeupdate", updateTime);
      video.addEventListener("loadedmetadata", updateTime);
      document.addEventListener("click", async (event) => {{
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.dataset.seek) {{
          video.currentTime = Number(target.dataset.seek);
          video.play().catch(() => {{}});
          updateTime();
        }}
        const row = target.closest("tr");
        if (target.hasAttribute("data-mark-start") && row) {{
          row.querySelector('[data-field="start"]').value = timestamp(video.currentTime);
        }}
        if (target.hasAttribute("data-mark-end") && row) {{
          row.querySelector('[data-field="end"]').value = timestamp(video.currentTime);
        }}
        if (target.hasAttribute("data-copy-row") && row) {{
          const fields = ["start", "end", "title", "notes"].reduce((items, field) => {{
            items[field] = row.querySelector(`[data-field="${{field}}"]`)?.value || "";
            return items;
          }}, {{}});
          const line = [
            target.dataset.unit,
            target.dataset.type,
            fields.start,
            fields.end,
            fields.title,
            fields.notes,
          ].map(csvEscape).join(",");
          output.value = output.value ? `${{output.value}}\\n${{line}}` : line;
          await navigator.clipboard?.writeText(line).catch(() => {{}});
        }}
        if (target.hasAttribute("data-copy-draft")) {{
          const line = [
            `draft-${{String(target.dataset.index).padStart(2, "0")}}`,
            "initial",
            target.dataset.start,
            target.dataset.end,
            `自动候选片段 ${{String(target.dataset.index).padStart(2, "0")}}`,
            `Auto-detected speech region, duration ${{target.dataset.duration}}s. Replace unit/type after review.`,
          ].map(csvEscape).join(",");
          output.value = output.value ? `${{output.value}}\\n${{line}}` : line;
          await navigator.clipboard?.writeText(line).catch(() => {{}});
        }}
        if (target.id === "copy-all") {{
          const lines = [...document.querySelectorAll("[data-copy-row]")].map((button) => {{
            const tr = button.closest("tr");
            const start = tr.querySelector('[data-field="start"]').value;
            const end = tr.querySelector('[data-field="end"]').value;
            if (!start || !end) return "";
            return [
              button.dataset.unit,
              button.dataset.type,
              start,
              end,
              tr.querySelector('[data-field="title"]').value,
              tr.querySelector('[data-field="notes"]').value,
            ].map(csvEscape).join(",");
          }}).filter(Boolean);
          output.value = lines.join("\\n");
          await navigator.clipboard?.writeText(output.value).catch(() => {{}});
        }}
        if (target.id === "clear-output") output.value = "";
      }});
    </script>
  </body>
</html>
"""
    (output_dir / "review.html").write_text(html, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Inspect the pronunciation source video and build review artifacts.")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--interval", type=float, default=10.0, help="Seconds between extracted review frames.")
    args = parser.parse_args()

    if not args.source.exists():
        raise FileNotFoundError(f"Source video not found: {args.source}")
    args.output_dir.mkdir(parents=True, exist_ok=True)

    metadata = video_metadata(args.source)
    duration = metadata["durationSeconds"]
    frame_dir = args.output_dir / "frames"
    if frame_dir.exists():
        shutil.rmtree(frame_dir)
    frame_dir.mkdir(exist_ok=True)

    frame_items = []
    max_frames = 240
    count = min(max(int(math.ceil(duration / args.interval)), 1), max_frames)
    for index in range(count):
        seconds = min(index * args.interval, max(duration - 0.2, 0.0))
        name = f"frame-{index:03d}-{int(seconds):05d}s.jpg"
        output_path = frame_dir / name
        if extract_frame(args.source, seconds, output_path):
            frame_items.append({"time": timestamp(seconds), "seconds": round(seconds, 3), "file": f"frames/{name}"})

    metadata["reviewFrames"] = frame_items
    (args.output_dir / "metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    write_review_html(args.output_dir, metadata, frame_items)
    print(f"Wrote {len(frame_items)} review frame(s) to {args.output_dir}")
    print(f"Review page: {args.output_dir / 'review.html'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
