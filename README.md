# See My Voice

See My Voice is a Mandarin pronunciation practice app for foreign learners. The current branch keeps the original prototype workflow available while moving the main product toward a production-shaped TypeScript stack.

Current main app:

```text
Next.js React frontend
  -> Express API
  -> MongoDB
  -> Python/FunASR pronunciation analysis service
```

The React frontend now mirrors the old `web/` interface using TypeScript and Tailwind. The Python prototype remains in the repository because it still contains the local FunASR analysis service and the original static UI.

## Repository Layout

```text
.
├── frontend/              # Next.js + React + Tailwind UI
├── backend/               # Express API, MongoDB, JWT auth
├── web/                   # Original static UI and local Python HTTP API
├── src/                   # Python pronunciation, ASR, and analysis code
├── tests/                 # Python analysis tests
├── tools/                 # Clip, image, and analysis helper scripts
├── samples/               # Sample audio and evaluation manifests
├── VERCEL_DEPLOYMENT.md   # Detailed Vercel deployment guide
├── vercel.json            # Root frontend deployment config
├── package.json           # Node workspace scripts
└── requirements.txt       # Python dependencies
```

## Current App Flow

Practice flow:

```text
1. User logs in.
2. User records audio in the Next.js frontend.
3. Frontend uploads text and audio to the Express backend.
4. Backend stores attempt metadata and audio.
5. Backend calls the Python pronunciation service when configured.
6. Python returns scores, pinyin diagnosis, tone timing, and syllable feedback.
7. Backend stores the normalized result.
8. Frontend renders the result from backend data.
```

Teacher flow:

```text
Teacher creates task
  -> backend stores task
Student completes task
  -> backend stores submission and analysis
Teacher reviews submission
  -> backend stores feedback
Student sees feedback in task/progress views
```

Some teacher/task/chat screens still use sample data or local demo state while backend persistence is being filled in.

## Requirements

- Node.js and npm
- MongoDB for the backend
- Python 3 for the local pronunciation prototype

For local MongoDB, use a running instance at:

```text
mongodb://127.0.0.1:27017
```

For deployment, use MongoDB Atlas or another hosted MongoDB provider.

## Install

From the repository root:

```bash
npm install
```

Optional Python setup for the local FunASR/prototype service:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## Environment

Create backend config:

```bash
cp backend/.env.example backend/.env
```

Default local backend values:

```env
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

Create frontend config:

```bash
cp frontend/.env.example frontend/.env.local
```

Default local frontend value:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080
```

`PRONUNCIATION_API_URL` is optional for starting the backend. Logged-in backend recording analysis will fail until this points to a running pronunciation service; local/demo UI flows can still show fallback practice data.

## Run The TypeScript App

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

Backend health check:

```text
http://127.0.0.1:8080/api/health
```

## Run Pronunciation Analysis Locally

The Python prototype serves the local `/api/analyze` endpoint used by the backend.

Start it:

```bash
cd web
SEE_MY_VOICE_DIR="$(cd .. && pwd)" ./start.sh
```

Open:

```text
http://127.0.0.1:4173
```

Then set this in `backend/.env`:

```env
PRONUNCIATION_API_URL=http://127.0.0.1:4173
```

Restart the backend after changing `.env`.

Python API endpoints:

```text
GET  /api/health
GET  /api/text-info?text=...
POST /api/analyze
POST /api/tts
```

## Verify

TypeScript checks:

```bash
npm run typecheck
```

Production build:

```bash
npm run build
```

Python tests:

```bash
python -m unittest discover tests
```

Web prototype tests:

```bash
cd web
node --test tests/state.test.js tests/integration.test.js
```

## Deployment

The recommended Vercel deployment uses two projects:

```text
backend project
  Root Directory: backend
  Build Command: npm run build

frontend project
  Root Directory: frontend
  Build Command: npm run build
```

Backend environment variables:

```env
MONGODB_URI=mongodb+srv://...
MONGODB_DB=see_my_voice
JWT_SECRET=<long-random-secret>
FRONTEND_ORIGIN=https://<your-frontend-project>.vercel.app
PRONUNCIATION_API_URL=https://<your-pronunciation-service>
SEED_USERNAME=<optional-demo-user>
SEED_PASSWORD=<optional-demo-password>
SEED_NAME=<optional-demo-display-name>
```

Frontend environment variable:

```env
NEXT_PUBLIC_API_BASE_URL=https://<your-backend-project>.vercel.app
```

There is also a root `vercel.json` for deploying the frontend from the repository root. In that mode, set:

```env
BACKEND_URL=https://<your-backend-project>.vercel.app
```

Full deployment steps are in `VERCEL_DEPLOYMENT.md`.

## Useful Analysis Commands

Run Stage 1 tone/timing analysis:

```bash
python src/stage1_pronunciation.py --text "我要吃饭" --audio samples/sample.wav
```

Run ASR baseline:

```bash
python src/run_asr_baseline.py single --audio samples/sample.wav --text "我要吃饭"
```

Run combined Stage 2B report:

```bash
python src/run_stage2b_combined.py single --audio samples/sample.wav --text "我要吃饭"
```

## Pronunciation Clips

The prototype reads clip metadata from:

```text
web/assets/pronunciation-clips/manifest.json
```

Useful clip commands:

```bash
python tools/auto_segment_pronunciation_source.py
python tools/inspect_pronunciation_source.py --interval 2
python tools/build_pronunciation_clips.py
```

Manual clip demo:

```text
http://127.0.0.1:4173/?demoClip=1
```

## Generated Files

Do not commit local outputs:

```text
.venv/
node_modules/
backend/dist/
backend/.uploads/
frontend/.next/
*.tsbuildinfo
__pycache__/
web/.analysis_debug/
web/.tts_cache/
stage1_plots/
asr_baseline_results/
stage2b_combined_results/
stage2b_eval_results/
stage3a_label_results/
stage3b_dataset/
stage3c_ctc_inspection/
*.wav
*.m4a
*.mp3
```

Do not commit API keys, access tokens, private recordings, generated debug output, or machine-specific paths.
