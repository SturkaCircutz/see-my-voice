# Vercel Deployment

Deploy this repository as two Vercel projects:

1. `see-my-voice-backend`
   - Root Directory: `backend`
   - Build Command: `npm run build`
   - API entrypoint: `backend/api/index.ts`
2. `see-my-voice-frontend`
   - Root Directory: `frontend`
   - Framework: Next.js
   - Build Command: `npm run build`

This split matches the repo shape: the frontend is a Next.js app, while the API is a separate Express server.

The root `vercel.json` is for a frontend project created from the repository root. It builds only the `frontend` workspace and rewrites `/api/*` to the separately deployed backend through `BACKEND_URL`. If you set Vercel's Root Directory to `frontend` or `backend`, Vercel uses the matching subdirectory `vercel.json` instead.

## Backend Environment Variables

Set these on the backend Vercel project:

```bash
MONGODB_URI=mongodb+srv://...
MONGODB_DB=see_my_voice
JWT_SECRET=<long-random-secret>
FRONTEND_ORIGIN=https://<your-frontend-project>.vercel.app
PRONUNCIATION_API_URL=https://<your-pronunciation-service>
HF_INFERENCE_TOKEN=<optional-hugging-face-token-for-free-asr-fallback>
HF_ASR_MODEL_ID=openai/whisper-large-v3-turbo
SEED_USERNAME=<optional-demo-user>
SEED_PASSWORD=<optional-demo-password>
SEED_NAME=<optional-demo-display-name>
```

`PRONUNCIATION_API_URL` connects the trained See My Voice phone-token model service.
If it is not set, the backend can still use a hosted ASR fallback when
`HF_INFERENCE_TOKEN` is configured. The fallback keeps the Vercel site usable,
but it only checks recognized text; it does not provide phone-token feedback.
Create the Hugging Face token with Inference Providers permission.

The frontend also exposes a public model-options page:

```bash
https://<your-frontend-project>.vercel.app/model
```

The trained phone-token model has been uploaded to:

```bash
https://huggingface.co/sturka/see-my-voice-mandarin-phone-ctc
```

The deployable Hugging Face Docker Space template lives in:

```bash
deploy/huggingface-pronunciation-api
```

Deploy it with:

```bash
source .venv/bin/activate
python tools/deploy_hf_pronunciation_api.py
```

If Hugging Face returns `402 Payment Required`, the account cannot create Docker
or Gradio Spaces on the current plan. In that case, either enable HF PRO or
deploy the same Docker service to another container host, then set
`PRONUNCIATION_API_URL` to that public service URL.

## Frontend Environment Variables

Set this on the frontend Vercel project:

```bash
NEXT_PUBLIC_API_BASE_URL=https://<your-backend-project>.vercel.app
```

The frontend API helper prefixes all `/api/...` calls with this value.

If deploying the frontend from the repository root with the root `vercel.json`, set this instead of `NEXT_PUBLIC_API_BASE_URL`:

```bash
BACKEND_URL=https://<your-backend-project>.vercel.app
```

That keeps browser requests same-origin while Vercel proxies `/api/*` to the backend.

## Deployment Order

1. Deploy the backend project from the `backend` root directory.
2. Confirm `https://<your-backend-project>.vercel.app/api/health` returns JSON with `ok: true`.
3. Deploy the frontend project from the `frontend` root directory with `NEXT_PUBLIC_API_BASE_URL` set to the backend URL.
4. Update backend `FRONTEND_ORIGIN` to the final frontend URL and redeploy the backend.
5. Test login, task pages, and a recording upload from the deployed frontend.

## Runtime Notes

- Use MongoDB Atlas or another hosted MongoDB URL. A local MongoDB URL will not work from Vercel.
- Audio uploads are written to Vercel's temporary function storage during analysis. This is enough for request-time processing, but permanent audio history still needs object storage.
- The Python/FunASR pronunciation service should be deployed separately from Vercel if it needs large models, ffmpeg, GPU, or long-running workers.
