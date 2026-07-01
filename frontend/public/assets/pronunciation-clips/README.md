# Pronunciation Clip Library

This folder stores short reusable pronunciation videos for initials and finals.

The source video for the first library is:

```text
C:\Users\21628\Desktop\6月17日 (4)(2).mp4
```

Workflow:

1. Generate draft speech segments from the source video's audio:

```bash
.\.venv\Scripts\python.exe tools\auto_segment_pronunciation_source.py
```

2. Inspect the source video and generate a review page:

```bash
.\.venv\Scripts\python.exe tools\inspect_pronunciation_source.py --interval 2
```

3. Open `web/assets/pronunciation-clips/source-review/review.html`.
4. Use the automatic candidates and timestamp buttons to fill `tools/pronunciation_clip_segments.csv`.
5. Run:

```bash
.\.venv\Scripts\python.exe tools\build_pronunciation_clips.py
```

The script writes `initial-<unit>.mp4` and `final-<unit>.mp4` files here and updates `manifest.json`.
It uses `ffmpeg` when available and falls back to PyAV when the ffmpeg command is not installed.
The web app reads `manifest.json` at startup. If a matching clip is missing, the teaching clip falls back to existing mouth/tongue references.

Manual demo check:

1. Start the local web server from the project root:

```bash
powershell -ExecutionPolicy Bypass -File tools\start_web_server.ps1
```

2. Open `http://127.0.0.1:4173/?demoClip=1`.
3. Verify that the page opens a generated teaching clip for final `uang`, shows the real `final-uang.mp4` articulation video, supports previous/next segment navigation, play/pause auto-advance, standard audio replay, and returning to practice.

Current source metadata has been generated in `source-review/metadata.json`.

Current generated coverage:

- Initials: `b`, `p`, `m`, `f`, `z`, `c`, `s`, `d`, `t`, `n`, `l`, `zh`, `ch`, `sh`, `r`, `j`, `q`, `x`, `g`, `k`, `h`
- Finals: `a`, `o`, `e`, `i`, `u`, `v`/`ü`, `i_z`, `i_zh`, `er`, `ai`, `ia`, `ueng`, `uang`, `iong`

Missing official finals:

`ei`, `ao`, `ou`, `iu`, `iao`, `ui`, `uai`, `ie`, `uo`, `ua`, `ve`/`üe`, `an`, `en`, `ian`, `uan`, `van`/`üan`, `in`, `un`, `vn`/`ün`, `ang`, `eng`, `iang`, `ing`, `ong`.

These missing finals need an authorized source video before clips can be written into this library.
