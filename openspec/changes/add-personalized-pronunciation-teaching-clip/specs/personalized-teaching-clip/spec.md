## ADDED Requirements

### Requirement: Offer personalized teaching clip after analysis
The system SHALL offer a personalized pronunciation teaching clip after a completed pronunciation analysis when the analysis identifies at least one pronunciation issue.

#### Scenario: Analysis contains diagnosis issues
- **WHEN** the user completes recording analysis
- **AND** the analysis result contains one or more `pinyin_diagnosis.issues`
- **THEN** the system SHALL show an action to generate a personalized teaching clip

#### Scenario: Analysis has no detected issue
- **WHEN** the user completes recording analysis
- **AND** the analysis result contains no `pinyin_diagnosis.issues`
- **THEN** the system SHALL not require the user to generate a teaching clip for issue remediation
- **AND** the system SHALL continue to show the normal pronunciation feedback

### Requirement: Generate teaching plan from detected issue
The system SHALL generate a structured teaching plan that focuses on a detected pronunciation issue from the user's latest analysis.

#### Scenario: Generate plan for primary issue
- **WHEN** the user chooses to generate a teaching clip after analysis
- **THEN** the system SHALL select a primary issue from the latest diagnosis
- **AND** the system SHALL include the target syllable, issue type, issue summary, and practice guidance in the teaching plan

#### Scenario: Multiple issues are present
- **WHEN** the latest analysis contains multiple pronunciation issues
- **THEN** the system SHALL choose a primary issue for the first version of the teaching clip
- **AND** the system SHALL prefer segmental intelligibility issues over tone-only issues when a segmental issue is available

### Requirement: Present clip as ordered teaching segments
The system SHALL present the personalized teaching clip as an ordered sequence of in-browser teaching segments.

#### Scenario: Clip opens from analysis result
- **WHEN** the user opens the personalized teaching clip
- **THEN** the system SHALL show the clip title, target text, primary issue, and the first teaching segment

#### Scenario: Segment sequence is available
- **WHEN** a teaching plan is generated
- **THEN** the plan SHALL contain ordered segments for explaining the issue and guiding practice
- **AND** each segment SHALL contain a title and learner-facing guidance text

### Requirement: Show articulation references for segmental guidance
The system SHALL show available mouth and tongue references when a teaching segment focuses on a syllable, initial, or final.

#### Scenario: Reference images are available
- **WHEN** a teaching segment focuses on an articulation unit with available mouth or tongue reference images
- **THEN** the system SHALL display the available reference images in the clip segment

#### Scenario: Reference images are missing
- **WHEN** a teaching segment focuses on an articulation unit without available reference images
- **THEN** the system SHALL still show textual guidance for the segment
- **AND** the system SHALL avoid showing a broken image as instructional content

### Requirement: Reuse pronunciation video clips when available
The system SHALL use pre-cut pronunciation video clips for teaching segments when a matching clip exists for the selected initial or final.

#### Scenario: Matching video clip exists
- **WHEN** a teaching segment focuses on an initial or final
- **AND** the pronunciation clip manifest contains a matching clip for that unit
- **THEN** the system SHALL show the matching video clip in the teaching segment

#### Scenario: Matching video clip is unavailable
- **WHEN** a teaching segment focuses on an initial or final
- **AND** the pronunciation clip manifest does not contain a matching clip for that unit
- **THEN** the system SHALL fall back to articulation references and learner-facing guidance
- **AND** the system SHALL keep the teaching clip usable

### Requirement: Show tone guidance when available
The system SHALL include tone guidance in the teaching clip when the selected issue or selected syllable includes tone information.

#### Scenario: Tone issue is selected
- **WHEN** the primary teaching issue is a tone issue
- **THEN** the system SHALL show the target tone curve for that syllable
- **AND** the system SHALL show the user's tone curve when it is available from the latest analysis

#### Scenario: Segmental issue includes syllable tone data
- **WHEN** the primary teaching issue is an initial, final, missing, or whole-syllable issue
- **AND** the selected syllable includes tone data
- **THEN** the system SHALL include tone guidance as a supporting practice segment

### Requirement: Provide focused practice follow-up
The system SHALL end the personalized teaching clip with practice material related to the selected issue.

#### Scenario: Issue includes practice words
- **WHEN** the selected diagnosis issue includes practice words
- **THEN** the teaching clip SHALL present those practice words in a follow-up practice segment

#### Scenario: No practice words are available
- **WHEN** the selected diagnosis issue does not include practice words
- **THEN** the teaching clip SHALL include the target syllable or target text as fallback practice material

### Requirement: Support clip playback controls
The system SHALL let the user control the in-browser personalized teaching clip.

#### Scenario: Navigate between segments
- **WHEN** the user clicks next or previous controls
- **THEN** the system SHALL move to the next or previous teaching segment without losing the generated teaching plan

#### Scenario: Play and pause guided sequence
- **WHEN** the user starts playback
- **THEN** the system SHALL advance through teaching segments automatically
- **AND** the user SHALL be able to pause the sequence before it finishes

### Requirement: Reuse standard pronunciation audio
The system SHALL allow replay of standard pronunciation audio from the personalized teaching clip when standard audio is available.

#### Scenario: Standard audio exists for clip target
- **WHEN** the teaching clip target has an available standard audio URL
- **THEN** the clip SHALL provide a way to replay the standard pronunciation

#### Scenario: Standard audio is unavailable
- **WHEN** the teaching clip target has no available standard audio URL
- **THEN** the clip SHALL remain usable without audio replay
