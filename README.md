# See My Voice

See My Voice is a local-first Mandarin pronunciation practice prototype. The app lets a learner enter Chinese practice text, record speech in the browser, and receive feedback from a Python analysis backend that combines Mandarin ASR, pinyin comparison, tone contour scoring, timing feedback, and teaching-video references.

The current checkout is on branch `seemyvoice-4.0` and tracks `origin/seemyvoice-4.0` at `git@github.com:SturkaCircutz/see-my-voice.git`.

## Current Capabilities

- Student and teacher prototype workspaces in a vanilla HTML/CSS/JavaScript web app.
- Browser microphone recording through `MediaRecorder`.
- Local Python backend for `/api/analyze`, `/api/text-info`, `/api/tts`, and `/api/health`.
- FunASR Paraformer Mandarin ASR to estimate whether the target text was understood.
- Pinyin, initial/final, syllable, tone, and rhythm feedback for Chinese practice text.
- Tone contour visualization and per-syllable feedback.
- Generated pronunciation clip library for initials and finals under `web/assets/pronunciation-clips/`.
- Optional Doubao TTS reference audio cache.
- GitHub Pages workflow for publishing the static frontend from `seemyvoice-4.0`.

This is a prototype, not a clinical speech assessment product. The Stage 2B score combines ASR text similarity with pitch/timing heuristics. Initial/final diagnosis is based on target-vs-ASR pinyin differences and is not true phoneme-level GOP scoring.

## Repository Layout

```text
.
├── .github/workflows/pages.yml        # GitHub Pages deployment workflow
├── index.html                         # Redirects to web/
├── requirements.txt                   # Python dependencies
├── run-web.cmd                        # Windows launcher for web/server.py
├── samples/                           # Sample/evaluation manifests
├── src/                               # Pronunciation and ASR analysis scripts
├── tests/                             # Python unit tests
├── tools/                             # Clip, image, and source-video helper scripts
└── web/
    ├── index.html                     # Main app shell
    ├── app.js                         # Browser UI and API calls
    ├── state.js                       # App state and reducers
    ├── styles.css                     # App styling
    ├── config.js                      # API base URL for hosted/static frontend
    ├── server.py                      # Local HTTP API and static file server
    ├── tts_service.py                 # Optional Doubao TTS integration
    ├── assets/                        # Articulation images, clips, references
    └── tests/                         # Node test suite
```

## Requirements

- Python 3.10 or newer.
- Node.js 20.11 or newer for the Node test suite.
- A modern browser with microphone support, such as Chrome, Edge, or Safari.
- `ffmpeg` is recommended for browser-recording conversion. If it is missing, the backend falls back to PyAV where possible.
- A working microphone permission grant in the browser.
- For live speech analysis: enough disk/network access for FunASR and model downloads on first use.
- For generated reference TTS: Doubao TTS credentials in environment variables.

## Python Setup

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

On Windows PowerShell:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

The backend imports analysis modules from `src/`. By default `web/server.py` contains an older absolute fallback path. In this repo, start the server with `SEE_MY_VOICE_DIR` set to the repository root, or use the provided launchers.

## Run Locally

Linux/macOS:

```bash
cd web
SEE_MY_VOICE_DIR="$(cd .. && pwd)" ./start.sh
```

Windows from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File tools\start_web_server.ps1
```

Alternative Windows command prompt launcher:

```cmd
run-web.cmd
```

Open:

```text
http://127.0.0.1:4173
```

Use another port:

```bash
PORT=8080 SEE_MY_VOICE_DIR="$PWD" python web/server.py
```

Health check:

```text
http://127.0.0.1:4173/api/health
```

The first analysis request can be slow because FunASR loads models. Later requests reuse the loaded ASR model in the same server process.

## Frontend API Configuration

The browser reads `window.SEE_MY_VOICE_API_BASE` from `web/config.js`.

- Same-origin local backend: set it to an empty string, `""`.
- Hosted static frontend with a separate API tunnel/backend: set it to the public backend origin, for example `https://example-tunnel.loca.lt`.

The current file points to a LocalTunnel URL:

```js
window.SEE_MY_VOICE_API_BASE = "https://tricky-cobras-check.loca.lt";
```

For local development, change this to `""` or make sure the tunnel is running and points at the local Python server.

## Backend API

`web/server.py` serves static files from `web/` and exposes:

- `GET /api/health` returns server readiness, analysis import status, and active project path.
- `GET /api/text-info?text=...` returns normalized text, pinyin, syllables, and reference-audio URL.
- `POST /api/analyze` accepts browser audio and target text, converts audio to 16 kHz mono WAV, runs Stage 2B analysis, and returns UI-ready pronunciation feedback.
- `POST /api/tts` generates or returns cached Doubao reference audio for Chinese text.

Generated debug artifacts are written under `web/.analysis_debug/` and are ignored by git.

## Environment Variables

Common variables:

```text
SEE_MY_VOICE_DIR=/path/to/see-my-voice
PORT=4173
```

Optional Doubao TTS variables:

```text
DOUBAO_TTS_API_KEY=...
DOUBAO_TTS_APP_ID=...
DOUBAO_TTS_ACCESS_TOKEN=...
DOUBAO_TTS_RESOURCE_ID=seed-tts-2.0
DOUBAO_TTS_MODEL=seed-tts-2.0-standard
DOUBAO_TTS_SPEAKER=zh_female_cancan_mars_bigtts
DOUBAO_TTS_FORMAT=mp3
DOUBAO_TTS_SAMPLE_RATE=24000
DOUBAO_TTS_SPEECH_RATE=0
DOUBAO_TTS_LOUDNESS_RATE=0
DOUBAO_TTS_MAX_CHARS=500
```

Use either `DOUBAO_TTS_API_KEY`, or both `DOUBAO_TTS_APP_ID` and `DOUBAO_TTS_ACCESS_TOKEN`.

## Analysis Scripts

Run one Stage 1/2A tone and timing analysis:

```bash
python src/stage1_pronunciation.py --text "我要吃饭" --audio samples/sample.wav
```

Run one ASR baseline:

```bash
python src/run_asr_baseline.py single --audio samples/sample.wav --text "我要吃饭"
```

Run one combined Stage 2B report:

```bash
python src/run_stage2b_combined.py single --audio samples/sample.wav --text "我要吃饭"
```

Batch commands read audio from `samples/` by default and write ignored result folders such as `asr_baseline_results/`, `stage2b_combined_results/`, and `stage2b_eval_results/`.

## Pronunciation Clip Library

The app reads generated clip metadata from:

```text
web/assets/pronunciation-clips/manifest.json
```

Generated clips live beside that manifest as `initial-<unit>.mp4` and `final-<unit>.mp4`. The clip-building workflow is documented in `web/assets/pronunciation-clips/README.md`.

Useful commands:

```bash
python tools/auto_segment_pronunciation_source.py
python tools/inspect_pronunciation_source.py --interval 2
python tools/build_pronunciation_clips.py
```

Manual clip demo:

```text
http://127.0.0.1:4173/?demoClip=1
```

## Tests

Python tests:

```bash
python -m unittest discover tests
```

Web state and integration tests:

```bash
cd web
node --test tests/state.test.js tests/integration.test.js
```

There are no npm dependencies at the moment; `web/package.json` only marks the web test files as ES modules.

## Git Ignore and Generated Files

The repository intentionally ignores local environments, generated analysis outputs, local recordings, TTS cache files, and backend debug output:

- `.venv/`
- `web/.analysis_debug/`
- `web/.tts_cache/`
- `stage1_plots/`, `stage2b_combined_results/`, `stage3b_dataset/`, and related generated result folders.
- Local audio recordings such as `*.wav`, `*.m4a`, `*.mp3`.

Do not commit API keys, access tokens, private recordings, or generated debug files.

## GitHub Web Initialization for This Branch

This repo already has:

```text
branch: seemyvoice-4.0
remote: git@github.com:SturkaCircutz/see-my-voice.git
upstream: origin/seemyvoice-4.0
```

If the GitHub repository does not exist yet, create it from the GitHub website:

1. Sign in to GitHub.
2. Select the `+` menu, then `New repository`.
3. Owner: `SturkaCircutz`.
4. Repository name: `see-my-voice`.
5. Choose visibility.
6. Do not initialize with a README, `.gitignore`, or license if you are pushing this existing local repository.
7. Create the repository.

Then push the current branch from this local checkout:

```bash
git status
git branch --show-current
git remote -v
git remote add origin git@github.com:SturkaCircutz/see-my-voice.git
git push -u origin seemyvoice-4.0
```

If `origin` already exists, update it instead of adding it:

```bash
git remote set-url origin git@github.com:SturkaCircutz/see-my-voice.git
git push -u origin seemyvoice-4.0
```

To commit this README and push it:

```bash
git add README.md
git commit -m "Add project README"
git push origin seemyvoice-4.0
```

## GitHub Pages Initialization

The repository already includes `.github/workflows/pages.yml`. It deploys when `seemyvoice-4.0` is pushed and copies the static frontend files from `web/` into the GitHub Pages artifact.

Initialize Pages in the GitHub web UI:

1. Open `https://github.com/SturkaCircutz/see-my-voice`.
2. Go to `Settings` -> `Pages`.
3. Under `Build and deployment`, set `Source` to `GitHub Actions`.
4. Save the setting if GitHub shows a save button.
5. Go to `Actions`.
6. Select `Deploy GitHub Pages`.
7. Run the workflow manually, or push a commit to `seemyvoice-4.0`.
8. After the workflow succeeds, open the Pages URL shown in the deployment summary.

GitHub Pages will host only the static frontend. Speech analysis still requires a running Python backend. For the hosted Pages app, set `web/config.js` to a reachable backend origin before deploying, or the API calls will fail from the browser.

Official GitHub references:

- Creating a repository: https://docs.github.com/en/repositories/creating-and-managing-repositories/quickstart-for-repositories
- Uploading a project to GitHub: https://docs.github.com/en/get-started/start-your-journey/uploading-a-project-to-github
- Configuring GitHub Pages publishing source: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
