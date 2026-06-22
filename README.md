# See My Voice

See My Voice is a Mandarin pronunciation-practice prototype. The original codebase is mostly Python speech analysis plus a small browser prototype. This update adds a separated TypeScript backend and React frontend so user accounts, login, and future API integration have clear ownership.

## Folder Functionality

- `frontend/` - New React + TypeScript app. It handles register/login, the practice screen, microphone recording, score display, and typed calls to the backend.
- `backend/` - New Node.js + TypeScript API. It connects to MongoDB, stores users, logs register/login events, issues JWTs, and exposes a placeholder pronunciation API proxy for the API you will provide later.
- `src/` - Existing Python pronunciation-analysis pipeline. It contains the staged scripts for ASR, pinyin/tone analysis, evaluation, and dataset preparation.
- `web/` - Existing legacy local prototype. It serves a vanilla JavaScript UI with `web/server.py`, calls the Python analysis code directly, and can still be used for local model experiments.
- `samples/` - Evaluation manifest and sample recording references used by the Python analysis workflow.
- `tests/` - Existing Python tests for the analysis code.

## Architecture

```text
frontend/ React TypeScript UI
  -> backend/ Express TypeScript API
      -> MongoDB users + login_events
      -> future pronunciation API via PRONUNCIATION_API_URL

src/ Python analysis code remains available for local experiments.
web/ Legacy local prototype remains available while the React app replaces the frontend.
```

## MongoDB Auth Behavior

The backend creates two MongoDB collections:

- `users` - one document per registered user, including username, display name, password hash, created time, last login time, and login count.
- `login_events` - one document for every register/login event, including user id, username, action, timestamp, IP, and user agent.

Passwords are hashed with bcrypt before storage. API responses never return `passwordHash`.

## Run The New TypeScript App

1. Install dependencies:

```bash
npm install
```

2. Configure the backend:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set:

```text
MONGODB_URI=your mongodb connection string
JWT_SECRET=a long random secret
SEED_USERNAME=jiawen
SEED_PASSWORD=123
SEED_NAME=Jiawen
```

Leave `PRONUNCIATION_API_URL` empty until the external API is ready.

3. Start the backend:

```bash
npm run dev:backend
```

4. Start the React frontend in another terminal:

```bash
npm run dev:frontend
```

Open `http://127.0.0.1:5173`.

The example env seeds a local user:

```text
username: jiawen
password: 123
```

## Build And Typecheck

```bash
npm run typecheck
npm run build
```

## Legacy Local Prototype

The old prototype still lives in `web/`. It is useful when you want to run the local Python/FunASR path directly.

```bash
cd web
./start.sh
```

Then open `http://127.0.0.1:4173`.

## Future API Connection

When you provide the pronunciation API, set this in `backend/.env`:

```text
PRONUNCIATION_API_URL=https://your-api-host
```

The React app already sends recordings to:

```text
POST /api/pronunciation/analyze
```

The backend currently returns a clear `501` until `PRONUNCIATION_API_URL` is configured.
