# See My Voice

See My Voice is a Mandarin pronunciation practice prototype for foreign learners. This `english-version` branch keeps the interface, teacher workflow, and documentation in English while preserving Mandarin characters, pinyin, and sample sentences as practice content.

This branch keeps two runnable app paths:

- `frontend/` and `backend/`: the TypeScript account-based app path with Next.js, Express, MongoDB, JWT auth, and a pronunciation proxy.
- `web/`, `src/`, `tests/`, and `tools/`: the original local Python analysis prototype and its static browser UI.

The Python prototype is still used for the current FunASR pronunciation workflow. Do not remove it unless the branch is intentionally moving fully to the TypeScript app.

## Repository Layout

```text
.
├── backend/                           # Express API, MongoDB, JWT auth
├── frontend/                          # Next.js + React app
├── samples/                           # Sample/evaluation manifests
├── src/                               # Python pronunciation and ASR analysis code
├── tests/                             # Python tests
├── tools/                             # Clip, image, and analysis helper scripts
├── web/                               # Static browser app and local Python API server
├── index.html                         # Redirects static hosting root to web/
├── package.json                       # Node workspace scripts
├── package-lock.json                  # Node lockfile
└── requirements.txt                   # Python dependencies
```

## Branch State

- Primary development branch: `main`
- Current stable version tag: `v4.0`
- Compatibility branch: `seemyvoice-4.0`
- TypeScript app: run locally from the root workspace scripts.

Use short-lived branches for new work:

```text
feature/<short-name>
fix/<short-name>
chore/<short-name>
```

## TypeScript App

The TypeScript app has a Next.js frontend and an Express backend.

Backend capabilities:

- Register and login users.
- Store users and login events in MongoDB.
- Hash passwords with bcrypt.
- Issue JWTs.
- Store practice attempts, uploaded recording metadata, analysis results, tasks, submissions, reviews, and chat records in MongoDB.
- Call the Python pronunciation analysis service through `PRONUNCIATION_API_URL` when configured.

Frontend capabilities:

- Account login/register screens.
- Practice screen with microphone recording.
- Practice attempts loaded from the backend after login.
- Progress and detail screens.
- API calls through `/api/*` routes.

### Target Structure

The production-shaped path is:

```text
Next.js frontend
  -> Express API
  -> MongoDB source of truth
  -> Python/FunASR pronunciation service
  -> local development audio storage now, object storage later
```

The first migrated slice is practice attempts:

```text
1. Frontend creates `/api/attempts`.
2. Frontend uploads recording to `/api/attempts/:attemptId/analyze`.
3. Backend stores the audio under `backend/.uploads/` for local development.
4. Backend sends the audio and target text to `PRONUNCIATION_API_URL`.
5. Backend stores the normalized analysis result on the attempt.
6. Frontend displays the stored attempt in progress.
```

The `web/` prototype remains the richer local FunASR workflow while teacher/task/chat screens are migrated into backend-backed Next.js screens.

### Environment

Install Node dependencies:

```bash
npm install
```

Create backend config:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```text
PORT=8080
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=see_my_voice
JWT_SECRET=replace-this-with-a-long-random-string
FRONTEND_ORIGIN=http://127.0.0.1:3000
SEED_USERNAME=jiawen
SEED_PASSWORD=123
SEED_NAME=Jiawen
PRONUNCIATION_API_URL=
```

The seed variables are optional. If `SEED_USERNAME` and `SEED_PASSWORD` are set, the backend creates or updates that user during startup.
For local analysis with the Python prototype, set `PRONUNCIATION_API_URL=http://127.0.0.1:4173` after starting `web/server.py`.

### Run

Start the backend:

```bash
npm run dev:backend
```

Start the frontend in another terminal:

```bash
npm run dev:frontend
```

Open:

```text
http://127.0.0.1:3000
```

For local development, set the browser API base URL to the Express backend:

```text
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080
```

Without `NEXT_PUBLIC_API_BASE_URL`, the frontend calls same-origin `/api/*`, which only works when a deployment layer routes those requests to the backend.

### Verify

```bash
npm run typecheck
npm run build
```

The backend needs a reachable MongoDB instance for runtime startup. Typechecking does not require MongoDB.

## Python Web Prototype

The `web/` app serves the original static UI and local Python API. It calls the analysis modules in `src/`.

Python API endpoints:

- `GET /api/health`
- `GET /api/text-info?text=...`
- `POST /api/analyze`
- `POST /api/tts`

Install Python dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Run locally:

```bash
cd web
SEE_MY_VOICE_DIR="$(cd .. && pwd)" ./start.sh
```

Open:

```text
http://127.0.0.1:4173
```

The server defaults `SEE_MY_VOICE_DIR` to the repository root, so setting it explicitly is only needed when running from an unusual checkout layout.

For Windows:

```powershell
powershell -ExecutionPolicy Bypass -File tools\start_web_server.ps1
```

The browser reads `window.SEE_MY_VOICE_API_BASE` from `web/config.js`.

- Local same-origin server: `window.SEE_MY_VOICE_API_BASE = "";`
- Hosted static frontend with separate backend: set it to the public HTTPS backend origin.

## Analysis Scripts

Run one Stage 1 tone/timing analysis:

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

Batch commands write generated output folders that are intentionally ignored by git.

## Pronunciation Clips

The web app reads generated clip metadata from:

```text
web/assets/pronunciation-clips/manifest.json
```

Generated clips live beside that manifest as `initial-<unit>.mp4` and `final-<unit>.mp4`.

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

TypeScript checks:

```bash
npm run typecheck
```

## Generated Files

These files and directories are local outputs and should not be committed:

- `.venv/`
- `node_modules/`
- `backend/dist/`
- `frontend/.next/`
- `*.tsbuildinfo`
- `__pycache__/`
- `web/.analysis_debug/`
- `web/.tts_cache/`
- `stage1_plots/`
- `asr_baseline_results/`
- `stage2b_combined_results/`
- `stage2b_eval_results/`
- `stage3a_label_results/`
- `stage3b_dataset/`
- `stage3c_ctc_inspection/`
- local recordings such as `*.wav`, `*.m4a`, and `*.mp3`

Do not commit API keys, access tokens, private recordings, generated debug output, or machine-specific paths.
