# Web Prototype

This directory contains the static browser UI and local Python API server for the original See My Voice pronunciation prototype.

Run from the repository root:

```bash
cd web
SEE_MY_VOICE_DIR="$(cd .. && pwd)" ./start.sh
```

Open:

```text
http://127.0.0.1:4173
```

The local server exposes `/api/health`, `/api/text-info`, `/api/analyze`, and `/api/tts`. It imports analysis code from `../src` by default.

For hosted static deployments, configure `web/config.js`:

```js
window.SEE_MY_VOICE_API_BASE = "https://your-backend-origin";
```

Use an empty string for same-origin local development.
