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

## Backend Environment Variables

Set these on the backend Vercel project:

```bash
MONGODB_URI=mongodb+srv://...
MONGODB_DB=see_my_voice
JWT_SECRET=<long-random-secret>
FRONTEND_ORIGIN=https://<your-frontend-project>.vercel.app
PRONUNCIATION_API_URL=https://<your-pronunciation-service>
SEED_USERNAME=<optional-demo-user>
SEED_PASSWORD=<optional-demo-password>
SEED_NAME=<optional-demo-display-name>
```

`PRONUNCIATION_API_URL` is optional for deploying the API, but recording analysis will fail until it points to the Python/FunASR service.

## Frontend Environment Variables

Set this on the frontend Vercel project:

```bash
NEXT_PUBLIC_API_BASE_URL=https://<your-backend-project>.vercel.app
```

The frontend API helper prefixes all `/api/...` calls with this value.

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
