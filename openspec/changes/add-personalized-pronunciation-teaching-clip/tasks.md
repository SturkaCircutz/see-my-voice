## 1. Teaching Plan Model

- [x] 1.1 Add front-end state fields for a generated teaching plan, selected clip segment index, and clip playback status.
- [x] 1.2 Implement a deterministic teaching-plan builder that reads the latest analysis result, diagnosis issues, and syllable map.
- [x] 1.3 Implement primary issue selection that prefers segmental intelligibility issues over tone-only issues when available.
- [x] 1.4 Generate ordered teaching segments where each segment maps to a diagnosed or review syllable and contains matched pronunciation video clips.
- [x] 1.5 Add fallback behavior for analyses with missing practice words, missing syllable rows, or no standard audio URL.

## 2. Clip View and Controls

- [x] 2.1 Add a new teaching clip view to the front-end navigation/rendering flow without disrupting existing practice, detail, progress, and tone drill views.
- [x] 2.2 Show the clip title, target text, primary issue summary, segment progress, current segment title, and guidance text.
- [x] 2.3 Add controls for generating/opening the clip after analysis, returning to practice, previous segment, next segment, play, and pause.
- [x] 2.4 Implement timer-based auto-advance through clip segments while preserving manual navigation.
- [x] 2.5 Ensure resetting or changing the practice text clears stale teaching clip state.
- [x] 2.6 Automatically generate the teaching video after every successful recording analysis without requiring a button in the practice view.
- [x] 2.7 Embed the generated teaching video at the top of the detail view under the learner-facing title "教学视频".
- [x] 2.8 For one teaching segment, hide the segment progress bar and previous/next controls.
- [x] 2.9 For multiple teaching segments, keep the segment progress bar and previous/next controls, with each segment representing a different wrong syllable.

## 3. Visual and Audio Guidance

- [x] 3.1 Reuse or adapt existing mouth/tongue reference rendering for teaching clip articulation segments.
- [x] 3.2 Reuse or adapt existing tone chart rendering for teaching clip tone segments.
- [x] 3.3 Hide unavailable articulation images gracefully and keep textual guidance visible.
- [x] 3.4 Reuse existing standard pronunciation playback behavior from the clip when standard audio is available.
- [x] 3.5 Present practice words from the diagnosis issue, with fallback to the target syllable or target text.
- [x] 3.6 Generate a review-style teaching video even when no diagnosis issue is found.
- [x] 3.7 Add a pronunciation clip manifest, source-video review helper, and offline clip build script for reusable initial/final clips.
- [x] 3.8 Label source-video time ranges and generate the actual initial/final clip files.
- [x] 3.9 Add audio-energy auto-segmentation drafts to reduce manual timestamp labeling.
- [x] 3.10 Keep the teaching video focused on pronunciation video clips; leave the existing detail-page analysis sections outside the teaching-video module.

## 4. Styling and User Experience

- [x] 4.1 Add CSS for the teaching clip layout, segment card, progress indicator, controls, articulation panels, and practice-word list.
- [x] 4.2 Make the clip view usable on the same mobile-sized layout as the existing app screens.
- [x] 4.3 Use learner-facing Chinese copy that explains the clip is focused on the most important issue from this attempt.
- [x] 4.4 Ensure the feature does not promise MP4 export or downloadable video in the UI.

## 5. Verification

- [x] 5.1 Add or update front-end unit tests for teaching-plan generation, issue prioritization, and fallback practice material.
- [ ] 5.2 Manually verify the full flow: record/analyze, generate clip, navigate segments, play/pause auto-advance, replay standard audio, and return to practice.
- [x] 5.3 Verify behavior when analysis has no diagnosis issues and when clip/articulation assets are unavailable.
- [x] 5.4 Run the existing web test suite and any relevant lint/build checks available for the project.
- [x] 5.5 Add a deterministic `?demoClip=1` route for manual teaching-clip UI verification without requiring a live microphone recording.
- [x] 5.6 Add automated coverage for wrong-syllable segment generation, review fallback, single-segment controls, and multi-segment navigation.
