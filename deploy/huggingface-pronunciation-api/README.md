---
title: See My Voice Pronunciation API
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# See My Voice Pronunciation API

Docker-based Hugging Face Space for the See My Voice pronunciation analysis
endpoint.

The service exposes:

- `GET /api/health`
- `POST /api/analyze`

`POST /api/analyze` accepts multipart form data:

- `text`: Mandarin target text
- `audio`: browser recording file

By default the service loads:

```text
sturka/see-my-voice-mandarin-phone-ctc
```

Override with `SEE_MY_VOICE_HF_MODEL_ID` when deploying another model revision.
