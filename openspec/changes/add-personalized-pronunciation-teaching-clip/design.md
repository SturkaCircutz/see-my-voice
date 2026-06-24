## Context

The current web app analyzes a user's pronunciation recording and returns user-facing feedback, including pinyin diagnosis issues, per-syllable tone curves, articulation metadata, standard audio URLs, and practice-word suggestions. The detail view already displays mouth reference images, tongue reference images, tone charts, and standard audio replay for a selected syllable.

This change introduces a personalized teaching clip experience after analysis. The first version should feel like a guided video inside the web app, but it should not generate an MP4 file. The product value is the personalized lesson plan: choosing a detected issue, explaining it visually, and guiding the learner through focused practice.

## Goals / Non-Goals

**Goals:**
- Generate a teaching plan from the latest pronunciation analysis result.
- Focus the clip on detected `pinyin_diagnosis.issues` rather than producing a generic tutorial for every syllable.
- Reuse existing front-end rendering primitives for articulation references and tone charts.
- Reuse existing standard-audio/TTS behavior for replaying target text, target syllables, and practice words.
- Add a browser-based clip view with step navigation and simple play/pause progression.
- Keep the plan data structured so a future MP4 renderer could reuse it.

**Non-Goals:**
- Exporting, downloading, or encoding MP4 files.
- Generating AI/avatar mouth-motion video.
- Creating a long-form curriculum or multi-day learning plan.
- Replacing the existing analysis flow or scoring model.
- Adding a new external video generation service.

## Decisions

### Decision: Generate the first teaching plan in the browser

The first version will derive a teaching plan from the existing `analysisResult`, `pinyinDiagnosis`, and `analysisSyllables` already stored in front-end state.

Rationale:
- The needed diagnostic and display data is already present after `/api/analyze` completes.
- Avoids adding a backend API before the plan format stabilizes.
- Keeps the first version fast to iterate and easy to test with existing analysis fixtures.

Alternative considered: Add `/api/teaching-clip` immediately. This would centralize plan generation but adds request/response plumbing before the product behavior is proven.

### Decision: Use a structured `teachingPlan` with ordered segments

The UI will render a plan object with a title, focus issue, and an ordered list of segments. Segment types can include `intro`, `initial`, `final`, `tone`, and `practice`.

Rationale:
- Separates teaching content selection from visual playback.
- Allows deterministic UI tests for plan generation.
- Makes future MP4 export possible by reusing the same plan schema.

### Decision: Prioritize one primary issue for MVP

When multiple issues exist, the teaching clip will choose one primary issue. Segmental issues (`initial`, `final`, `syllable`, `missing`) should be prioritized over tone-only issues because they more directly affect intelligibility; tone can still appear as a supporting segment when available for the chosen syllable.

Rationale:
- A short personalized clip should not overwhelm the learner.
- Existing diagnosis already orders issues by target syllable, which is a reasonable fallback.
- The clip can later expand to one primary issue plus one secondary issue.

### Decision: Reuse existing articulation assets and graceful fallbacks

The clip view should reuse the same asset lookup conventions as the detail view: `assets/articulation/<unit>/mouth.*` and `assets/articulation/<unit>/tongue.*`. If an image is missing, the UI should hide that image slot or fall back to the existing generated mouth/tongue diagrams.

Rationale:
- Keeps the clip visually consistent with the detail view.
- Avoids blocking the feature on a complete image library.

### Decision: Treat playback as guided UI progression, not encoded video

The clip will provide play/pause and next/previous controls that move through segments on a timer. Audio replay may be triggered per segment or by explicit buttons, but exact audio/video frame synchronization is not required in the first version.

Rationale:
- Provides the intended teaching experience without ffmpeg or browser recording complexity.
- Keeps the first version robust across local development environments.

### Decision: Support an optional pronunciation video clip library

The first implementation can use pre-cut source-video clips for individual initials and finals through `web/assets/pronunciation-clips/manifest.json`. The teaching-plan builder checks the manifest for the selected diagnosis unit and renders a video segment when a matching clip exists. If no clip exists yet, the same segment falls back to the existing articulation references and textual guidance.

Rationale:
- Lets the product call reusable real pronunciation footage by pinyin unit without waiting for a full video-generation system.
- Keeps source-video cutting as an offline asset pipeline, not a runtime dependency.
- Allows incremental coverage: missing initials/finals do not block the teaching clip.

The provided source video path is `C:\Users\21628\Desktop\6月17日 (4)(2).mp4`. Because clip boundaries must be labeled manually, a CSV segment list drives the offline builder script. An audio-energy helper generates draft speech regions as `auto_segments.csv/json`; the source-review helper then renders those candidates beside the source video, frame index, timestamp capture buttons, and CSV-copy helpers. The clip builder uses ffmpeg when available and falls back to PyAV when the ffmpeg command is unavailable.

## Risks / Trade-offs

- **Risk: The generated clip feels like cards instead of a video.** → Use a strong visual layout, segment progress indicator, play/pause auto-advance, and concise narration to create a short-clip experience.
- **Risk: Existing diagnosis may be too shallow for deep personalization.** → Start with deterministic issue-type templates and keep the plan schema extensible for richer diagnosis later.
- **Risk: Missing articulation images create blank teaching steps.** → Reuse existing fallback behavior and text cues; do not require every unit to have both images.
- **Risk: Multiple issues compete for attention.** → Limit MVP to one primary issue and explain that the clip focuses on the most important practice point for this attempt.
- **Risk: Future MP4 export needs backend ownership of the plan.** → Keep the `teachingPlan` schema serializable and independent from DOM state so it can move server-side later.
