## Why

SeeMyVoice already diagnoses pronunciation issues after a recording, but the next step is still mostly static feedback. A personalized teaching clip turns each diagnosis into a guided, visual practice path so learners can immediately see what to fix and how to practice it.

## What Changes

- Add a personalized pronunciation teaching clip capability that is offered after a completed pronunciation analysis when one or more issues are detected.
- Generate a structured teaching plan from the current analysis result, focusing on the most relevant detected issue rather than producing a generic tutorial.
- Present the plan as an in-browser teaching clip with step-by-step segments, not as an exported MP4 in the first version.
- Reuse existing pronunciation assets and data where possible: pinyin diagnosis issues, syllable metadata, mouth/tongue reference images, tone curves, standard audio, and practice words.
- Support basic clip controls such as moving between segments, playing/pausing the guided sequence, and replaying standard pronunciation audio.

## Capabilities

### New Capabilities
- `personalized-teaching-clip`: Generates and plays an in-browser pronunciation teaching clip tailored to detected pronunciation issues from the user's latest analysis.

### Modified Capabilities

## Impact

- Frontend state and rendering in `web/app.js` and `web/state.js` for the new teaching clip view, actions, segment playback state, and controls.
- Existing articulation rendering helpers and tone chart logic may be reused or lightly adapted for clip segments.
- Backend analysis output in `web/server.py` is expected to remain compatible; the first version can derive the teaching plan from the existing analysis payload in the browser.
- Existing TTS and standard audio support in `web/tts_service.py` and `/api/text-info` may be reused for replaying target words and practice words.
- No MP4 export, video encoding pipeline, virtual avatar generation, or new external video-generation dependency is included in this change.
