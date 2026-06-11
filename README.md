# SeeMyVoice 1.0

SeeMyVoice 1.0 is a browser-based MVP for Mandarin pronunciation training for deaf and hard-of-hearing learners. It turns short phrase recordings into visual feedback: waveform, voice level, pitch/tone curve, syllable cards, and next practice suggestions.

## Run

```bash
cd /home/jiawen/see-my-voice
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

## MVP Flow

1. Choose a Mandarin practice phrase or enter custom Chinese text.
2. Review Hanzi, pinyin, and the target focus.
3. Record a short take.
4. Stop to analyze tone shape, rhythm, and voice level.
5. Review syllable feedback and action cues.
6. Copy or download the practice report.

## Current Scope

This prototype uses browser Web Audio APIs for local microphone capture, waveform visualization, and heuristic pitch/rhythm analysis. It does not depend on browser speech recognition, so Firefox can still run the core practice flow.

The copied `src/run_stage1.py` and `src/stage1_pronunciation.py` files from branch `cxu` are the next backend-quality analysis path for Stage 1.5 Mandarin tone scoring. The browser MVP does not yet perform real forced alignment, CTC/GOP scoring, initial/final diagnosis, camera mouth tracking, or clinical assessment.

## Privacy

The browser MVP does not upload audio and does not save recordings automatically. Reports are copied or downloaded only when the user chooses those actions.

## Verify

```bash
node --check app.js
node --check tests/app-smoke-test.mjs
node tests/app-smoke-test.mjs
python3 -m py_compile src/run_stage1.py src/stage1_pronunciation.py
```
