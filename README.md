# See My Voice

See My Voice is a Mandarin pronunciation practice app.

The app lets a learner record speech, compare it with the expected Mandarin sounds, and get practice feedback. The project also includes a trained phone-token CTC model that is **starting to learn Mandarin initials, finals, and tones from audio**.

## Current Model Status

Latest model:

```text
models/mandarin_phone_ctc_xlsr_chinese_gpu
```

> **Bottom line:** the model is learning, but **it is not ready to be trusted as a final pronunciation judge yet**.

Training summary:

- Base model: `jonatasgrosman/wav2vec2-large-xlsr-53-chinese-zh-cn`
- Training examples: `300`
- Validation examples: `50`
- Training steps: `1000`
- **Best validation loss: `1.9028`**
- **Final training loss: `1.5815`**
- Train/validation overlap: `0`

Held-out test result:

- Test examples: `2` long NTU learner recordings
- **Mean test loss: `2.3613`**
- **Phone-token weighted test loss: `2.3719`**
- **Greedy phone-token error rate: about `70%`**
- Exact phone-token matches: `0`

**Lower loss is good.** The loss improved a lot compared with the old tiny test model, but **the decoded phone tokens are still often wrong, especially tones**. Use this model as a **research prototype**, not as a production scorer.

## Training Loss Picture

This is the loss curve from the latest trained model:

![Training loss curve](docs/assets/stage3d-phone-ctc-loss-curve.png)

**The curve shows that loss dropped quickly at the start**, then kept improving slowly through the end of the run.

## Important Files

- `docs/assets/stage3d-phone-ctc-loss-curve.png`: README copy of the training loss image.
- `docs/latest-model-test-report.json`: README copy of the latest held-out test numbers.
- `models/mandarin_phone_ctc_xlsr_chinese_gpu/training_report.json`: local generated training numbers.
- `models/mandarin_phone_ctc_xlsr_chinese_gpu/test_loss_report.json`: local generated held-out test numbers.
- `models/mandarin_phone_ctc_xlsr_chinese_gpu/loss_history.csv`: raw loss data for the chart.
- `models/mandarin_phone_ctc_xlsr_chinese_gpu/loss_curve.png`: training loss image.
- `stage3b_dataset/dataset.csv`: training, validation, and test dataset manifest.
- `src/run_stage3d_train_phone_ctc.py`: training script for the phone-token CTC model.

## Run The Web App

Install Node packages:

```bash
npm install
```

Create the backend env file:

```bash
cp backend/.env.example backend/.env
```

For local MongoDB, use values like these in `backend/.env`:

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

Create the frontend env file:

```bash
cp frontend/.env.example frontend/.env.local
```

Put this in `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080
```

Start the backend:

```bash
npm run dev:backend
```

Start the frontend in another terminal:

```bash
npm run dev:frontend
```

Open the app:

```text
http://127.0.0.1:3000
```

Backend health check:

```text
http://127.0.0.1:8080/api/health
```

## Check The Project

Run the frontend/backend type check:

```bash
npm run typecheck
```

Run the Python tests:

```bash
.venv/bin/python -m unittest discover tests
```

The current model test report can be inspected with:

```bash
jq '.' docs/latest-model-test-report.json
```
