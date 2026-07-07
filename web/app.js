import {
  getCalendarDays,
  createInitialState,
  getStreak,
  getSyllables,
  getProgressData,
  getPendingTeacherSubmissions,
  getPendingAssessmentProfiles,
  getSelectedChatThread,
  getSelectedStudentTask,
  getSelectedAssessmentProfile,
  getSelectedTeacherStudent,
  getSelectedTeacherMessages,
  getChatThreads,
  getEntryAssessmentItems,
  getTotalUnreadChatCount,
  getUnreadChatCount,
  getTeacherDashboardSummary,
  getTeacherStudents,
  getFilteredTeacherStudents,
  getTeacherStudentAttentionReasons,
  getTodayStudentTask,
  buildTeacherClassProgress,
  buildMandarinWeeklyReport,
  buildRecommendedTaskPackage,
  buildStudentAssessmentReport,
  reduceState,
  questionBankPackages,
  toneDrills,
  tips,
} from "./state.js?v=20260624-tasks-nav-1";

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
const nav = document.querySelector(".app-nav");
const API_BASE = String(window.SEE_MY_VOICE_API_BASE || "").replace(/\/$/, "");
const STORAGE_KEY = "see-my-voice-practice-state";
const STUDENT_NAV_ITEMS = [
  { view: "practice", label: "Practice", index: "01" },
  { view: "tasks", label: "Tasks", index: "02" },
  { view: "progress", label: "Progress", index: "03" },
  { view: "chat", label: "Chat", index: "04" },
  { view: "account", label: "Me", index: "05" },
];
const TEACHER_NAV_ITEMS = [
  { view: "home", label: "Home", index: "01" },
  { view: "students", label: "Learners", index: "02" },
  { view: "tasks", label: "Tasks", index: "03" },
  { view: "reviews", label: "Reviews", index: "04" },
  { view: "chat", label: "Chat", index: "05" },
  { view: "account", label: "Account", index: "06" },
];

let state = createInitialState();
let recordingTimer = null;
let playbackTimer = null;
let toastTimer = null;
let textInfoTimer = null;
let mediaRecorder = null;
let mediaStream = null;
let recordedChunks = [];
let isComposingText = false;
let cameraStream = null;
let standardUtterance = null;
let lastRecordingObjectUrl = "";
let standardAudio = null;
let pronunciationClipManifest = { clips: { initial: {}, final: {} } };
let clockTimer = null;
let chatSwipeState = null;

function backendUrl(path) {
  if (!path || /^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")), { once: true });
    reader.addEventListener("error", () => reject(reader.error || new Error("Recording could not be read.")), { once: true });
    reader.readAsDataURL(blob);
  });
}

const ARTICULATION_UNITS = new Set([
  "a",
  "ai",
  "an",
  "ang",
  "ao",
  "b",
  "c",
  "ch",
  "d",
  "e",
  "ei",
  "en",
  "eng",
  "er",
  "f",
  "g",
  "h",
  "i",
  "i_z",
  "i_zh",
  "ia",
  "ian",
  "iang",
  "iao",
  "in",
  "ing",
  "iong",
  "ie",
  "iu",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "ong",
  "ou",
  "p",
  "q",
  "r",
  "s",
  "sh",
  "t",
  "u",
  "ua",
  "uai",
  "uan",
  "uang",
  "uo",
  "ueng",
  "ui",
  "un",
  "v",
  "van",
  "ve",
  "vn",
  "x",
  "z",
  "zh",
]);

const INITIALS = ["zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s"];
const IMAGE_EXTENSIONS = ["png", "jpeg", "jpg", "webp"];
const SPLIT_ARTICULATION_UNITS = new Set(["b", "m", "p"]);
const ARTICULATION_IMAGE_UNITS = new Set([
  "a",
  "ai",
  "an",
  "ang",
  "ao",
  "b",
  "c",
  "ch",
  "d",
  "e",
  "ei",
  "en",
  "eng",
  "er",
  "f",
  "g",
  "h",
  "i",
  "i_z",
  "i_zh",
  "ia",
  "ian",
  "iang",
  "iao",
  "ie",
  "in",
  "ing",
  "iong",
  "iu",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "ong",
  "ou",
  "p",
  "q",
  "r",
  "s",
  "sh",
  "t",
  "u",
  "ua",
  "uai",
  "uan",
  "uang",
  "uo",
  "ueng",
  "ui",
  "un",
  "v",
  "van",
  "ve",
  "vn",
  "x",
  "z",
  "zh",
]);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatClock(date = new Date()) {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function statusTime() {
  return formatClock();
}

function avatarMarkup(label, src = "", className = "avatar") {
  const initials = String(label || "U").slice(0, 1);
  return src
    ? `<img class="${className}" src="${escapeHtml(src)}" alt="${escapeHtml(label)} avatar">`
    : `<span class="${className}" aria-hidden="true">${escapeHtml(initials)}</span>`;
}

function threadTypeLabel(thread) {
  return thread?.type === "class" ? "Class Group" : "Teacher Chat";
}

function threadLastMessage(thread) {
  return (thread?.messages || []).at(-1) || null;
}

function chatThreadDisplayTitle(thread, role, appState = state) {
  if (!thread || thread.type === "class") return thread?.title || "Class Group";
  if (role === "student") return appState.teacherDashboard?.teacherName || "Coach";
  const studentId = (thread.memberIds || []).find((id) => id !== "teacher-main");
  const student = getTeacherStudents(appState).find((item) => item.id === studentId);
  return student?.name || thread.title || "Student Chat";
}

function loadStoredState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const stored = JSON.parse(raw);
    state = {
      ...state,
      practiceHistory: Array.isArray(stored.practiceHistory) ? stored.practiceHistory : [],
      publishedTasks: Array.isArray(stored.publishedTasks) ? stored.publishedTasks : state.publishedTasks,
      taskSubmissions: Array.isArray(stored.taskSubmissions) ? stored.taskSubmissions : state.taskSubmissions,
      taskStepProgress: stored.taskStepProgress && typeof stored.taskStepProgress === "object" ? stored.taskStepProgress : state.taskStepProgress,
      taskMessages: Array.isArray(stored.taskMessages) ? stored.taskMessages : state.taskMessages,
      assessmentProfiles: Array.isArray(stored.assessmentProfiles) ? stored.assessmentProfiles : state.assessmentProfiles,
      chatThreads: Array.isArray(stored.chatThreads) ? stored.chatThreads : state.chatThreads,
      account: stored.account && typeof stored.account === "object" ? { ...state.account, ...stored.account } : state.account,
      selectedTaskId: stored.selectedTaskId || state.selectedTaskId,
      activeTaskPracticeId: stored.activeTaskPracticeId || "",
      activeTaskExerciseId: stored.activeTaskExerciseId || "",
      selectedChatThreadId: stored.selectedChatThreadId || state.selectedChatThreadId,
      assessmentSession: stored.assessmentSession && typeof stored.assessmentSession === "object"
        ? { ...state.assessmentSession, ...stored.assessmentSession }
        : state.assessmentSession,
        chatMode: ["list", "thread"].includes(stored.chatMode) ? stored.chatMode : state.chatMode,
        selectedToneDrill: stored.selectedToneDrill || state.selectedToneDrill,
        selectedProgressDate: stored.selectedProgressDate || state.selectedProgressDate,
        currentRole: ["guest", "student", "teacher"].includes(stored.currentRole) ? stored.currentRole : state.currentRole,
        currentView: ["home", "practice", "tasks", "detail", "progress", "toneDrill", "teachingClip", "teacher", "account", "chat", "taskDetail", "entryAssessment"].includes(stored.currentView)
          ? stored.currentView
          : state.currentView,
        teacherView: ["home", "students", "tasks", "assessmentEditor", "taskPackageEditor", "reviews", "reviewEditor", "chat", "account"].includes(stored.teacherView)
          ? stored.teacherView
          : state.teacherView,
        selectedReviewSubmissionId: stored.selectedReviewSubmissionId || "",
      };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function saveStoredState() {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        practiceHistory: state.practiceHistory || [],
        publishedTasks: state.publishedTasks || [],
        taskSubmissions: state.taskSubmissions || [],
        taskStepProgress: state.taskStepProgress || {},
        taskMessages: state.taskMessages || [],
        assessmentProfiles: state.assessmentProfiles || [],
        chatThreads: state.chatThreads || [],
        account: state.account || {},
        selectedTaskId: state.selectedTaskId || "",
        activeTaskPracticeId: state.activeTaskPracticeId || "",
        activeTaskExerciseId: state.activeTaskExerciseId || "",
        selectedChatThreadId: state.selectedChatThreadId || "",
        chatMode: state.chatMode || "list",
        assessmentSession: state.assessmentSession || {},
        selectedToneDrill: state.selectedToneDrill,
        selectedProgressDate: state.selectedProgressDate,
        currentRole: state.currentRole,
        currentView: state.currentView,
        teacherView: state.teacherView,
      }),
    );
  } catch {
    // Storage can fail in private windows; the app still works for the session.
  }
}

function standardPronunciationText() {
  if (state.currentView === "taskDetail" && state.activeTaskPracticeId && state.activeTaskExerciseId) {
    const task = getSelectedStudentTask(state);
    const exercise = (task?.exerciseSet || []).find((item) => item.id === state.activeTaskExerciseId);
    const items = practiceItemsForExercise(exercise);
    return (items[state.activeTaskItemIndex] || exercise?.targetText || task?.practiceText || state.targetText).trim();
  }
  if (state.currentView === "teachingClip" || (state.currentView === "detail" && state.teachingPlan)) {
    const segment = state.teachingPlan?.segments?.[state.selectedClipSegmentIndex];
    return segment?.practiceWords?.[0]
      || state.teachingPlan?.targetSyllable?.character
      || state.teachingPlan?.targetText
      || state.targetText.trim();
  }
  const activeSyllables = getSyllables(state);
  const syllable = activeSyllables[state.selectedSyllable];
  if (state.currentView === "detail" && syllable?.character) return syllable.character;
  return state.targetText.trim();
}

async function loadPronunciationClipManifest() {
  try {
    const response = await fetch("./assets/pronunciation-clips/manifest.json", { cache: "no-store" });
    if (!response.ok) return;
    pronunciationClipManifest = await response.json();
  } catch {
    pronunciationClipManifest = { clips: { initial: {}, final: {} } };
  }
}

function mouthShapeClass(syllable) {
  const final = syllable.pinyin?.replace(/[a-z]*?([aeiouv].*)\d?$/i, "$1") || "";
  if (/u|o|ong|ou/.test(final)) return "shape-round";
  if (/a|ai|ao|ang/.test(final)) return "shape-open";
  if (/i|e|ie|ian/.test(final)) return "shape-wide";
  return "shape-neutral";
}

function normalizePinyinUnit(value) {
  return String(value || "").toLowerCase().replaceAll("ü", "v").replaceAll("u:", "v");
}

function pinyinBodyFor(syllable) {
  return normalizePinyinUnit(syllable.pinyin || syllable.pinyinDisplay || "").replace(/\d/g, "");
}

function splitZeroInitialSpelling(pinyinBody) {
  if (!pinyinBody) return null;
  if (pinyinBody === "yi") return { initial: "", final: "i" };
  if (pinyinBody === "wu") return { initial: "", final: "u" };
  if (pinyinBody === "yu") return { initial: "", final: "v" };
  if (pinyinBody === "ye") return { initial: "", final: "ie" };
  if (pinyinBody === "yue") return { initial: "", final: "ve" };
  if (pinyinBody === "yuan") return { initial: "", final: "van" };
  if (pinyinBody === "yun") return { initial: "", final: "vn" };
  if (pinyinBody === "yin") return { initial: "", final: "in" };
  if (pinyinBody === "ying") return { initial: "", final: "ing" };
  if (pinyinBody === "you") return { initial: "", final: "iu" };
  if (pinyinBody === "ya") return { initial: "", final: "ia" };
  if (pinyinBody === "yan") return { initial: "", final: "ian" };
  if (pinyinBody === "yao") return { initial: "", final: "iao" };
  if (pinyinBody === "yang") return { initial: "", final: "iang" };
  if (pinyinBody === "yong") return { initial: "", final: "iong" };
  if (pinyinBody === "wo") return { initial: "", final: "uo" };
  if (pinyinBody === "wei") return { initial: "", final: "ui" };
  if (pinyinBody === "wen") return { initial: "", final: "un" };
  if (pinyinBody === "weng") return { initial: "", final: "ueng" };
  if (pinyinBody.startsWith("y")) return { initial: "", final: `i${pinyinBody.slice(1)}` };
  if (pinyinBody.startsWith("w")) return { initial: "", final: `u${pinyinBody.slice(1)}` };
  return null;
}

function normalizedFinal(syllable) {
  const pinyinBody = pinyinBodyFor(syllable);
  const zeroInitial = splitZeroInitialSpelling(pinyinBody);
  if (zeroInitial) return zeroInitial.final;
  const explicitFinal = normalizePinyinUnit(syllable.final);
  const raw = explicitFinal || pinyinBody.replace(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])/, "");
  return normalizePinyinUnit(raw);
}

function normalizedInitial(syllable) {
  const pinyinBody = pinyinBodyFor(syllable);
  if (splitZeroInitialSpelling(pinyinBody)) return "";
  const explicitInitial = normalizePinyinUnit(syllable.initial);
  return explicitInitial || INITIALS.find((item) => pinyinBody.startsWith(item)) || "";
}

function resolveArticulationUnit(value) {
  const unit = normalizePinyinUnit(value);
  const candidates = [
    unit,
    unit.slice(-3),
    unit.slice(-2),
    unit.slice(-1),
  ].filter(Boolean);
  return candidates.find((item) => ARTICULATION_UNITS.has(item)) || "";
}

function articulationUnits(syllable) {
  const units = [];
  const initial = resolveArticulationUnit(normalizedInitial(syllable));
  const final = resolveArticulationUnit(normalizedFinal(syllable));
  if (initial) units.push({ kind: "Initial", unit: initial });
  if (final && final !== initial) units.push({ kind: "Final", unit: final });
  return units;
}

function articulationUnit(syllable) {
  const final = normalizedFinal(syllable);
  return resolveArticulationUnit(final);
}

function preciseArticulationUnits(syllable) {
  return articulationUnits(syllable).filter((item) => ARTICULATION_IMAGE_UNITS.has(item.unit));
}

function missingArticulationImageUnits(syllable) {
  return articulationUnits(syllable).filter((item) => !ARTICULATION_IMAGE_UNITS.has(item.unit));
}

function hasArticulationReference(syllable) {
  return preciseArticulationUnits(syllable).length > 0;
}

function tonguePositionClass(syllable) {
  const initial =
    syllable.initial ||
    (syllable.pinyin || "").replace(/\d/g, "").match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])/)?.[0] ||
    "";
  if (["d", "t", "n", "l", "z", "c", "s"].includes(initial)) return "tongue-front";
  if (["j", "q", "x", "y"].includes(initial)) return "tongue-palate";
  if (["g", "k", "h"].includes(initial)) return "tongue-back";
  if (["zh", "ch", "sh", "r"].includes(initial)) return "tongue-curled";
  return "tongue-low";
}

function renderArticulationPhoto(item, imageType, syllable) {
  const label = `${item.kind} ${item.unit}`;
  const title = imageType === "mouth" ? "Mouth Shape" : "Tongue Position";
  const className = imageType === "mouth" ? "articulation-photo" : "tongue-photo";
  const fallbackSources = IMAGE_EXTENSIONS.map((ext) => `./assets/articulation/${item.unit}/${imageType}.${ext}`);
  const splitSources = [1, 2].map((index) => `./assets/articulation/${item.unit}/${imageType}-${index}.png`);
  const fallbackScript = `const sources=JSON.parse(this.dataset.sources);const next=Number(this.dataset.next||0);if(next<sources.length){this.dataset.next=String(next+1);this.src=sources[next];}else{this.closest('.articulation-image-shell').hidden=true;}`;
  const renderImage = (src, extraSources = fallbackSources) => `
    <img
      class="${className}"
      src="${src}"
      data-sources='${escapeHtml(JSON.stringify(extraSources))}'
      data-next="0"
      alt="${escapeHtml(syllable.character)} ${escapeHtml(label)} ${title} reference image"
      onerror="${fallbackScript}"
    >
  `;
  const imageContent = SPLIT_ARTICULATION_UNITS.has(item.unit)
    ? `
        <div class="articulation-split-pair">
          <div class="articulation-image-shell">${renderImage(splitSources[0], fallbackSources)}</div>
          <div class="articulation-image-shell">${renderImage(splitSources[1], [])}</div>
        </div>
      `
    : `
        <div class="articulation-image-shell">${renderImage(fallbackSources[0], fallbackSources.slice(1))}</div>
      `;
  return `
    <figure class="articulation-photo-card">
      <div class="articulation-photo-frame">
        ${imageContent}
      </div>
      <figcaption>
        <strong>${escapeHtml(item.unit)}</strong>
        <span>${escapeHtml(item.kind)} · ${title}</span>
      </figcaption>
    </figure>
  `;
}

function renderGeneratedMouth(syllable) {
  const units = preciseArticulationUnits(syllable);
  if (units.length) {
    return `
      <div class="articulation-unit-grid">
        ${units.map((item) => renderArticulationPhoto(item, "mouth", syllable)).join("")}
      </div>
    `;
  }

  return `
    <div class="mouth-animation ${mouthShapeClass(syllable)}">
      <div class="face-outline">
        <span class="eye left"></span>
        <span class="eye right"></span>
        <span class="nose"></span>
        <span class="lip upper"></span>
        <span class="mouth-hole"></span>
        <span class="lip lower"></span>
      </div>
      <span class="mouth-target">
        <strong>${escapeHtml(syllable.character)}</strong>
        <span>${escapeHtml(syllable.pinyinDisplay || syllable.pinyin)}</span>
      </span>
    </div>
  `;
}

function renderGeneratedTongue(syllable) {
  const units = preciseArticulationUnits(syllable);
  if (units.length) {
    return `
      <div class="tongue-unit-grid">
        ${units.map((item) => renderArticulationPhoto(item, "tongue", syllable)).join("")}
      </div>
    `;
  }

  return `
    <div class="tongue-diagram ${tonguePositionClass(syllable)}">
      <span class="palate-line"></span>
      <span class="upper-teeth"></span>
      <span class="lower-jaw"></span>
      <span class="tongue-shape"></span>
      <span class="tongue-dot"></span>
    </div>
  `;
}

const scoreItems = () => [
  { name: "Overall", value: state.score },
  { name: "Tone", value: state.pitchScore },
  { name: "Clarity", value: state.clarityScore },
  { name: "Rhythm", value: state.rhythmScore },
];

const taskScoreItems = (submission) => [
  { name: "Overall", value: submission?.aiScores?.overall ?? 0 },
  { name: "Tone", value: submission?.aiScores?.tone ?? 0 },
  { name: "Clarity", value: submission?.aiScores?.clarity ?? 0 },
  { name: "Rhythm", value: submission?.aiScores?.rhythm ?? submission?.rhythmScore ?? 0 },
];

const taskGoalMarkup = (goal) => {
  const text = String(goal || "").trim();
  if (text === "Stabilize the onset first, then move into words and short sentences.") return "";
  return text ? `<p>${escapeHtml(text)}</p>` : "";
};

const splitDiagnosisSummary = (summary) => {
  const text = String(summary || "").trim();
  const marker = ". The initial and final are close";
  if (!text.includes(marker)) return [text].filter(Boolean);
  const [first, rest] = text.split(marker);
  return [`${first}.`, `The initial and final are close${rest}`].filter(Boolean);
};

const trimDiagnosisDetail = (detail) => {
  const text = String(detail || "").trim();
  const firstSentence = text.match(/^[^.！？]+[.！？]/);
  return firstSentence ? firstSentence[0] : text;
};

const toneNumberFromSyllable = (syllable, issue) => {
  const toneMatch = String(syllable?.tone || issue?.focus || issue?.title || "").match(/T([1-5])/);
  return toneMatch ? toneMatch[1] : "";
};

const heardCharacterForIssue = (diagnosis, issue) => {
  const heardText = String(diagnosis?.heard_text || diagnosis?.heardText || state.asrHeard || "").trim();
  return Array.from(heardText)[Number(issue.index)] || "";
};

const diagnosisDetailLines = (issue, diagnosis) => {
  const syllable = Object.values(getSyllables(state)).find((item) => Number(item.index) === Number(issue.index));
  const summaryLines = splitDiagnosisSummary(issue.summary);
  const targetCharacter = syllable?.character || issue.practice?.[0] || "this sound";
  const targetPinyin = syllable?.pinyinDisplay || syllable?.pinyin || diagnosis?.target_pinyin?.[issue.index] || "";
  const heardCharacter = heardCharacterForIssue(diagnosis, issue) || "this sound";
  const heardPinyin = diagnosis?.heard_pinyin?.[issue.index] || "";
  const toneNumber = toneNumberFromSyllable(syllable, issue);
  const isToneIssue = issue.type === "tone" || issue.type === "syllable" || /whole syllable|Tone|T[1-5]/.test(String(issue.focus || issue.title || ""));

  if (isToneIssue && targetPinyin && heardPinyin) {
    return [
      `Target: ${targetCharacter} / ${targetPinyin}, system heard: ${heardCharacter} / ${heardPinyin}.`,
      "The initial and final are close; the main difference is the tone.",
      "Use the tone contour to practice pitch movement.",
    ];
  }

  if (summaryLines.length) {
    return [
      ...summaryLines,
      trimDiagnosisDetail(issue.detail),
    ].filter(Boolean);
  }

  return [
    toneNumber ? `Step ${toneNumber} tone may need work.` : `${issue.focus || issue.title || "this sound"} may need work.`,
    trimDiagnosisDetail(issue.detail),
  ].filter(Boolean);
};

function getLatestTaskSubmission(appState = state) {
  const task = getSelectedStudentTask(appState);
  return (appState.taskSubmissions || []).filter((submission) => submission.taskId === task?.id).at(-1) || null;
}

function getFocusSyllable(activeSyllables) {
  const weight = { focus: 0, warn: 1, good: 2 };
  return Object.values(activeSyllables).sort(
    (a, b) => (weight[a.level] ?? 3) - (weight[b.level] ?? 3) || a.score - b.score,
  )[0];
}

function getPracticeSteps() {
  const hasText = Boolean(state.targetText.trim());
  return [
    {
      label: "Ready",
      detail: "Confirm target sentence",
      state: hasText ? "done" : "current",
    },
    {
      label: "Recording",
      detail: state.recordingState === "recording" ? "Tap done when finished" : "Read the sentence",
      state: state.recordingState === "recording"
        ? "current"
        : state.recordingState === "complete"
          ? "done"
          : "pending",
    },
    {
      label: "Analysis",
      detail: state.modelStatus === "analyzing" ? "Listening" : "Generating feedback",
      state: state.modelStatus === "error"
        ? "error"
        : state.modelStatus === "analyzing"
          ? "current"
          : state.modelStatus === "complete"
            ? "done"
            : "pending",
    },
  ];
}

function getPracticeInsight(activeSyllables, focusSyllable) {
  if (state.modelStatus === "error") {
    return {
      tone: "error",
      title: "Analysis did not complete reliably",
      body: state.recordingError || "Check microphone permission or record again. The current practice sentence will stay here.",
      action: "Record Again",
    };
  }
  if (state.modelStatus === "analyzing") {
    return {
      tone: "working",
      title: "Analyzing Your Pronunciation",
      body: "Stay on this page. The score, pinyin diagnosis, and focus syllable will appear when analysis finishes.",
      action: "Waiting",
    };
  }
  if (state.recordingState === "recording") {
    return {
      tone: "working",
      title: "Read the full sentence at a natural speed",
      body: "Tap the recording button when you finish. Try to give every tone its full movement.",
      action: "Finish Recording",
    };
  }
  if (state.modelStatus === "complete") {
    const focusName = focusSyllable
      ? `“${focusSyllable.character}" ${focusSyllable.pinyinDisplay || focusSyllable.pinyin}`
      : "focus syllable";
    return {
      tone: focusSyllable?.level === "focus" ? "focus" : "good",
      title: state.score >= 85 ? "Overall pronunciation is clear" : "Start with the point that most affects intelligibility",
      body: focusSyllable
        ? `${focusName} is the syllable to review first. Check mouth shape and tongue position, then return to practice and record again.`
        : "Analysis is complete. Replay your recording, then practice again.",
      action: focusSyllable ? `View "${focusSyllable.character}" Details` : "View Details",
    };
  }
  return {
    tone: "ready",
    title: "Start the first recording when ready",
    body: "Read the target sentence once, then start recording. The system will break feedback into pinyin, tone, and syllables.",
    action: "Start Recording",
  };
}

function diagnosisIssueSummary(issue) {
  const syllable = Object.values(getSyllables(state)).find((item) => Number(item.index) === Number(issue.index));
  const character = syllable?.character || issue.practice?.[0] || "this sound";
  const toneNumber = toneNumberFromSyllable(syllable, issue);
  const toneText = toneNumber ? `Tone ${toneNumber}` : "";
  const typeText = issue.type === "initial"
    ? "Initial"
    : issue.type === "final"
      ? "Final"
      : issue.type === "tone"
        ? "Tone"
        : "Pronunciation";
  return {
    character,
    shortIssue: toneText
      ? `${toneText} may need work`
      : `${issue.focus || typeText} may need work`,
    label: toneText || issue.focus || issue.title || "Pronunciation focus",
  };
}

function renderPinyinDiagnosis() {
  const diagnosis = state.pinyinDiagnosis;
  if (!diagnosis) {
    return `
      <section class="panel diagnosis-card" aria-label="Pinyin Diagnosis">
        <span class="model-kicker">Pinyin Diagnosis</span>
        <strong>Possible pronunciation issues appear after recording</strong>
        <p>The system uses your recording to identify initials, finals, or tones that may affect intelligibility.</p>
      </section>
    `;
  }

  const issues = diagnosis.issues || [];
  return `
    <section class="panel diagnosis-card" aria-label="Pinyin Diagnosis">
      <span class="model-kicker">Pinyin Diagnosis</span>
      <strong>${issues.length ? `Found ${issues.length} sound(s) to review` : escapeHtml(diagnosis.summary)}</strong>
      <p>Target: ${escapeHtml((diagnosis.target_pinyin || []).join(" "))}　Heard: ${escapeHtml((diagnosis.heard_pinyin || []).join(" ") || "Not heard clearly")}</p>
      ${
        issues.length
          ? `<button class="teaching-clip-entry" type="button" data-action="generate-teaching-clip">
              Generate Personalized Teaching Clip
            </button>
            <div class="drill-list">
              ${issues
                .map(
                  (issue) => {
                    const summary = diagnosisIssueSummary(issue);
                    const detailLines = diagnosisDetailLines(issue, diagnosis);
                    return `
                    <details class="drill-card diagnosis-compact-card">
                      <summary>
                        <span class="diagnosis-character">${escapeHtml(summary.character)}</span>
                        <span>
                          <strong>${escapeHtml(summary.shortIssue)}</strong>
                          <small>${escapeHtml(summary.label)}</small>
                        </span>
                      </summary>
                      <div class="diagnosis-detail-body">
                        ${detailLines.map((line) => `<p class="diagnosis-detail-line">${escapeHtml(line)}</p>`).join("")}
                      ${
                        issue.practice?.length
                          ? `<div class="drill-words">${issue.practice
                              .map((word) => `<button type="button" data-set-text="${escapeHtml(word)}">${escapeHtml(word)}</button>`)
                              .join("")}</div>`
                          : ""
                      }
                      </div>
                    </details>
                  `;
                  },
                )
                .join("")}
            </div>`
          : ""
      }
    </section>
  `;
}

function renderTaskPinyinDiagnosis(submission) {
  const diagnosis = submission?.pinyinDiagnosis;
  if (!diagnosis) return "";
  return `
    <section class="panel diagnosis-card task-ai-diagnosis-card" aria-label="Task Pinyin Diagnosis">
      <span class="model-kicker">Pinyin Diagnosis</span>
      <strong>${escapeHtml(diagnosis.summary || submission.diagnosisSummary || "The pinyin diagnosis is complete.")}</strong>
      <p>Target: ${escapeHtml(submission.pinyinText || (diagnosis.target_pinyin || []).join(" "))}</p>
      <p>System heard: ${escapeHtml((diagnosis.heard_pinyin || []).join(" ") || submission.heardText || "Not heard clearly")}</p>
    </section>
  `;
}

function renderTaskAiFeedback(submission) {
  if (!submission) return "";
  const syllables = Object.values(submission.syllables || {});
  const focusSyllable = syllables.length ? getFocusSyllable(submission.syllables) : null;
  return `
    <section aria-label="Task AI Feedback" class="task-ai-feedback-block">
      <div class="score-heading">
        <div>
          <span class="model-kicker">Current Score</span>
          <strong>${submission.aiScores?.overall ?? "--"} </strong>
        </div>
        <span>${focusSyllable ? `Focus: ${escapeHtml(focusSyllable.character)}` : "Tone · Clarity · Rhythm"}</span>
      </div>
      <div class="score-grid">
        ${taskScoreItems(submission)
          .map(
            (item) => `
              <div class="score-cell">
                <strong class="score-value">${item.value}</strong>
                <span class="score-name">${item.name}</span>
              </div>
            `,
          )
          .join("")}
      </div>
      ${renderTaskPinyinDiagnosis(submission)}
      ${
        syllables.length
          ? `<section aria-labelledby="task-feedback-title">
              <p class="section-label" id="task-feedback-title">Syllable Feedback</p>
              <div class="syllable-list">
                ${syllables
                  .map(
                    (item) => `
                      <button class="syllable-card level-${item.level}" type="button" data-task-syllable="${escapeHtml(item.id)}">
                        <span>
                          <strong class="syllable-character">${escapeHtml(item.character)}</strong>
                          <span class="syllable-meta">${escapeHtml(item.pinyinDisplay || item.pinyin)} · ${escapeHtml(item.tone)} · ${item.score}</span>
                          <span class="syllable-feedback">${escapeHtml(item.feedback)}</span>
                        </span>
                        <span class="status-pill">${escapeHtml(item.status)}</span>
                      </button>
                    `,
                  )
                  .join("")}
              </div>
            </section>`
          : ""
      }
    </section>
  `;
}

function renderTaskStepVisualFeedback(activeItemText, completedItem) {
  const hasAnalysis = state.modelStatus === "complete" && (state.analysisResult || completedItem?.analysisResult);
  return `
    <section class="task-step-action-panel task-step-visual-feedback" aria-label="Task Visual Feedback">
      <span class="model-kicker">Visual Feedback</span>
      <strong>${hasAnalysis ? "Item Feedback and Demo Video" : "Video feedback appears after recording"}</strong>
      <p>${escapeHtml(hasAnalysis ? (state.modelSummary || "The analysis for this item is complete.") : `Listen to the standard pronunciation, then record "${activeItemText}". The demo video and suggestions will appear here afterward.`)}</p>
      ${
        hasAnalysis
          ? `${renderPinyinDiagnosis()}
             ${renderTeachingVideoPanel()}`
          : ""
      }
    </section>
  `;
}

function taskFocusTags(task) {
  return [...new Set([task?.focusTag, ...(task?.reviewTags || [])].filter(Boolean))];
}

function lowestScoredSyllable(submission) {
  const syllables = Object.values(submission?.syllables || {});
  return syllables.length
    ? syllables.sort((a, b) => Number(a.score || 0) - Number(b.score || 0))[0]
    : null;
}

function buildTaskSpecificFeedback(task, submission) {
  const tags = taskFocusTags(task);
  const focusText = tags.length ? tags.join(", ") : "this practice focus";
  const targetText = submission?.targetText || task?.practiceText || "this sentence";
  const score = Number(submission?.aiScores?.overall || 0);
  const weakSyllable = lowestScoredSyllable(submission);

  if (!submission) {
    return {
      title: "Waiting for first recording",
      body: `This task focuses on "${focusText}". Follow the steps above and slowly read "${targetText}". Task-specific feedback appears here after recording.`,
      next: `First check mouth shape and tongue position, then slowly repeat "${targetText}" completely.`,
    };
  }

  if (submission.teacherFeedback) {
    return {
      title: `${submission.teacherScore ?? submission.aiScores?.overall ?? "--"}  · Teacher Feedback`,
      body: submission.teacherFeedback,
      next: `Next practice still focuses on "${focusText}". Adjust with the teacher suggestion first, then record again.`,
    };
  }

  const levelText = score >= 85
    ? "This task was completed steadily"
    : score >= 70
      ? "This task is mostly complete, but the focus sound still needs more stability"
      : "This task still needs practice. Slow down first.";
  const scoreText = submission.aiScores
    ? `Overall ${submission.aiScores.overall ?? "--"}, tone ${submission.aiScores.tone ?? "--"}, clarity ${submission.aiScores.clarity ?? "--"}, rhythm ${submission.aiScores.rhythm ?? "--"}.`
    : "The system received this recording.";
  const weakText = weakSyllable
    ? `The main focus now is "${weakSyllable.character}" (${weakSyllable.pinyinDisplay || weakSyllable.pinyin}): ${weakSyllable.feedback}`
    : submission.aiSummary || submission.diagnosisSummary || "Keep practicing around this task focus.";

  return {
    title: levelText,
    body: `This task asks you to practice "${focusText}". Practice sentence: "${targetText}". ${scoreText} ${weakText}`,
    next: `Next time, practice "${tags[0] || weakSyllable?.character || targetText}", then read the full sentence. Slow down while recording and prioritize clear pronunciation movement.`,
  };
}

function questionBankById(id) {
  return questionBankPackages.find((pack) => pack.id === id) || questionBankPackages[0];
}

function practiceItemsForExercise(exercise) {
  if (Array.isArray(exercise?.practiceItems) && exercise.practiceItems.length) return exercise.practiceItems;
  if (exercise?.bankPackageId) return questionBankById(exercise.bankPackageId)?.items || [];
  return exercise?.targetText ? [exercise.targetText] : [];
}

function practiceItemsFromStepCard(card) {
  return (card.querySelector('[data-step-field="practiceItems"]')?.value || "")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function submissionRecordings(submission) {
  const recordings = (submission?.completedSteps || [])
    .flatMap((step) => (step.items || []).map((item, index) => ({
      id: `${step.id || "step"}-${index}`,
      stepTitle: step.title || submission.exerciseTitle || "Task Recording",
      targetText: item.targetText || step.targetText || submission.targetText || "",
      recordingUrl: item.recordingUrl || "",
    })))
    .filter((item) => item.recordingUrl);
  if (recordings.length) return recordings;
  return submission?.recordingUrl
    ? [{
      id: submission.id,
      stepTitle: submission.exerciseTitle || "Task Recording",
      targetText: submission.targetText || "",
      recordingUrl: submission.recordingUrl,
    }]
    : [];
}

function taskPackageUiState(task) {
  const exerciseSet = task.exerciseSet?.length ? task.exerciseSet : (task.items || []);
  const taskProgress = state.taskStepProgress?.[task.id] || {};
  const completedCount = exerciseSet.filter((exercise) => taskProgress[exercise.id]?.completed).length;
  const latestSubmission = (state.taskSubmissions || []).filter((submission) => submission.taskId === task.id).at(-1);
  const totalCount = exerciseSet.length || 1;
  if (latestSubmission?.teacherFeedback || latestSubmission?.status === "Teacher Reviewed") {
    return { label: "Complete", level: "done", completedCount, totalCount };
  }
  if (latestSubmission) {
    return { label: "Waiting for Teacher Feedback", level: "pending", completedCount: totalCount, totalCount };
  }
  if (completedCount >= totalCount) {
    return { label: "Ready to Submit", level: "pending", completedCount, totalCount };
  }
  return { label: "To Do", level: "todo", completedCount, totalCount };
}

function renderPracticeItemChips(items, className = "practice-item-list") {
  if (!items?.length) return "";
  return `
    <div class="${className}">
      ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function brandHeader({ progress = false } = {}) {
  const streak = getStreak(state);
  return `
    <header class="app-header ${progress ? "progress-header" : ""}">
      <div class="status-row">
        <span>${statusTime()}</span>
        <span>Mandarin pronunciation practice</span>
      </div>
      <div class="brand-row">
        <h1 class="brand"><span class="brand-accent">VoiceSight</span> &middot; ${progress ? "My Progress" : "See My Voice"}</h1>
        ${
          progress
            ? `<button class="period-button" type="button" data-action="toggle-period">${getProgressData(state).label}</button>`
            : `<button class="header-link" type="button" data-view="progress">Streak ${streak} days · Progress</button>`
        }
      </div>
    </header>
  `;
}

function renderHome() {
  return `
    <section class="screen role-home-screen" data-screen="home">
      <header class="role-home-header">
        <div class="status-row">
          <span>${statusTime()}</span>
          <span>VoiceSight · See My Voice</span>
        </div>
        <div>
          <h1>See My Voice</h1>
          <p>Mandarin pronunciation practice for foreign learners</p>
        </div>
      </header>
      <div class="role-home-content">
        <button class="role-entry-card is-student" type="button" data-role="student">
          <span class="model-kicker">Learner</span>
          <strong>Practice Today</strong>
          <p>Recording analysis, pronunciation details, teaching clips, and progress tracking.</p>
        </button>
        <button class="role-entry-card is-teacher" type="button" data-role="teacher">
          <span class="model-kicker">Teacher</span>
          <strong>Mandarin Practice Management</strong>
          <p>Learner management, practice packs, recording reviews, and feedback chat.</p>
        </button>
      </div>
    </section>
  `;
}

function renderAccount() {
  const currentLabel = state.currentRole === "teacher" ? "Teacher" : state.currentRole === "student" ? "Learner" : "Not selected";
  const account = state.account || {};
  const displayName = account.displayName || (state.currentRole === "teacher" ? state.teacherDashboard?.teacherName : "Learner") || "User";
  const streak = getStreak(state);
  const unread = getTotalUnreadChatCount(state, state.currentRole === "teacher" ? "teacher" : "student");
  const todayTask = getTodayStudentTask(state);
  return `
    <section class="screen account-screen" data-screen="account">
      <header class="app-header account-header">
        <div class="status-row">
          <span>${statusTime()}</span>
          <span>Account</span>
        </div>
        <div class="brand-row">
          <div>
            <h1 class="brand"><span class="brand-accent">VoiceSight</span> Account</h1>
            <p class="teacher-subtitle">Current: ${currentLabel}</p>
          </div>
        </div>
      </header>
      <div class="content account-content">
        <section class="panel account-card account-profile-card" aria-labelledby="account-profile-title">
          <div class="account-profile-row">
            <label class="avatar-picker" aria-label="Change avatar">
              ${avatarMarkup(displayName, account.avatarDataUrl, "account-avatar")}
              <input type="file" accept="image/*" data-field="avatar-file">
              <span>Change avatar</span>
            </label>
            <div>
              <span class="model-kicker">${account.isLoggedIn ? "Signed In" : "Local Demo Account"}</span>
              <h2 id="account-profile-title">${escapeHtml(displayName)}</h2>
              <p>Current: ${currentLabel}. Avatar and chat identity are saved in this browser.</p>
            </div>
          </div>
          <div class="account-stat-grid" aria-label="Account status">
            <div>
              <strong>${streak}</strong>
              <span>Practice Streak</span>
            </div>
            <div>
              <strong>${unread}</strong>
              <span>Unread Messages</span>
            </div>
            <div>
              <strong>${todayTask ? "Yes" : "No"}</strong>
              <span>Today Tasks</span>
            </div>
          </div>
        </section>

        <section class="panel account-card account-settings-card" aria-labelledby="account-login-title">
          <div class="account-section-heading">
            <div>
              <span class="model-kicker">Account Settings</span>
              <h2 id="account-login-title">${account.isLoggedIn ? "Update Login Info" : "Log In to Demo Account"}</h2>
            </div>
            <span class="status-pill">${account.isLoggedIn ? "Saved" : "Not Signed In"}</span>
          </div>
          <div class="account-form">
            <div class="account-role-picker" role="radiogroup" aria-label="Choose login role">
              <label class="${state.currentRole === "student" ? "is-selected" : ""}">
                <input type="radio" name="login-role" value="student" ${state.currentRole === "student" ? "checked" : ""}>
                <span>Learner</span>
              </label>
              <label class="${state.currentRole === "teacher" ? "is-selected" : ""}">
                <input type="radio" name="login-role" value="teacher" ${state.currentRole === "teacher" ? "checked" : ""}>
                <span>Teacher</span>
              </label>
            </div>
            <label>
              <span>Account</span>
              <input data-field="login-username" value="${escapeHtml(account.username || "")}" placeholder="Enter account">
            </label>
            <label>
              <span>Password</span>
              <input data-field="login-password" type="password" value="${escapeHtml(account.password || "")}" placeholder="Enter password">
            </label>
            <button class="teacher-primary-button" type="button" data-action="login-account">${account.isLoggedIn ? "Save Account" : "Log In"}</button>
            ${account.isLoggedIn ? `<button class="teacher-secondary-button" type="button" data-action="logout-account">Log Out</button>` : ""}
          </div>
        </section>

        <section class="account-local-note" aria-label="Local data note">
          This is a local demo account and does not connect to a real authentication system. Clearing browser data also removes the avatar, account, and chat history.
        </section>
      </div>
    </section>
  `;
}

function renderAssessmentEntryCard() {
  const account = state.account || {};
  const hasAssessmentProfile = (state.assessmentProfiles || []).length > 0;
  const completed = account.entryAssessmentCompleted || state.assessmentSession?.completed || hasAssessmentProfile;
  if (!account.isRegistered || completed) return "";
  const pendingProfiles = getPendingAssessmentProfiles(state);
  const latestProfile = (state.assessmentProfiles || []).at(-1);
  return `
    <section class="panel assessment-entry-card" aria-labelledby="assessment-entry-title">
      <div class="assessment-entry-heading">
        <div>
          <span class="model-kicker">Entry Assessment</span>
          <h2 id="assessment-entry-title">Create Your Starting Pronunciation Profile</h2>
          <p>Complete a short set of initial, final, tone, and sentence checks. The teacher can then confirm your first practice plan.</p>
        </div>
        <span class="status-pill">${pendingProfiles.length ? "Needs Teacher Confirmation" : "Ready"}</span>
      </div>
      ${
        latestProfile
          ? `<div class="assessment-profile-mini">
              <strong>${escapeHtml(latestProfile.status)}</strong>
              <p>${escapeHtml(latestProfile.profileSummary)}</p>
            </div>`
          : ""
      }
      <button class="assessment-entry-button" type="button" data-action="start-entry-assessment">
        Start Entry Assessment
      </button>
    </section>
  `;
}

function renderPractice() {
  const activeSyllables = getSyllables(state);
  const focusSyllable = getFocusSyllable(activeSyllables);
  const recordCopy = {
    idle: "Start Recording",
    recording: "Recording... Tap to Finish",
    complete: state.modelStatus === "analyzing" ? "Analyzing..." : "Analysis Complete · Practice Again",
  }[state.recordingState];

  const statusCopy = {
    idle: "Waiting for Recording",
    recording: "Recording",
    analyzing: "Analyzing Pronunciation",
    complete: "Analysis Complete",
    error: "Try Again",
  }[state.modelStatus];

  return `
    <section class="screen" data-screen="practice">
      ${brandHeader()}
      <div class="content">
        ${renderAssessmentEntryCard()}
        ${
          state.practiceBackView === "toneDrill"
            ? `<button class="practice-back-button" type="button" data-view="toneDrill">Back to Tone Bank</button>`
            : ""
        }
        <section class="sentence-card" aria-labelledby="sentence-title">
          <label class="eyebrow" for="target-text">Custom Practice</label>
          <input class="sentence-input" id="target-text" data-field="target-text" value="${escapeHtml(state.targetText)}" autocomplete="off" inputmode="text">
          <p class="pinyin">${state.pinyinText}</p>
        </section>

        <section class="model-card level-${state.modelStatus === "error" ? "focus" : "good"}" aria-label="Pronunciation feedback status">
          <div>
            <span class="model-kicker">Pronunciation Feedback</span>
            <strong>${statusCopy}</strong>
            <span>${state.recordingError ? escapeHtml(state.recordingError) : `System heard: ${state.asrHeard}`}</span>
          </div>
          <span class="status-pill">${state.modelStatus === "complete" ? "Complete" : "Ready"}</span>
        </section>

        <div class="record-row" aria-label="Practice actions">
          <button class="record-button" type="button" data-action="record" data-state="${state.recordingState}" ${state.modelStatus === "analyzing" ? "disabled" : ""}>
            <span class="record-state-dot"></span>${recordCopy}
          </button>
          <button class="square-button ${state.playing ? "is-active" : ""}" type="button" data-action="play">
            ${state.playing ? "Playing" : "Play"}
          </button>
          <button class="square-button" type="button" data-action="play-self" ${state.lastRecordingUrl ? "" : "disabled"}>
            Replay
          </button>
          <button class="square-button" type="button" data-action="reset">Reset</button>
        </div>

        <section aria-label="Pronunciation score">
          <div class="score-heading">
            <div>
              <span class="model-kicker">Current Score</span>
              <strong>${state.score ? `${state.score} ` : "Generated After Recording"}</strong>
            </div>
            <span>${state.modelStatus === "complete" && focusSyllable ? `Focus: ${focusSyllable.character}` : "Tone · Clarity · Rhythm"}</span>
          </div>
          <div class="score-grid">
            ${scoreItems()
              .map(
                (item) => `
                  <div class="score-cell">
                    <strong class="score-value">${item.value}</strong>
                    <span class="score-name">${item.name}</span>
                  </div>
                `,
              )
              .join("")}
          </div>
        </section>

        ${renderPinyinDiagnosis()}

        <section aria-labelledby="feedback-title">
          <p class="section-label" id="feedback-title">Syllable Feedback</p>
          <div class="syllable-list">
            ${Object.values(activeSyllables)
              .map(
                (item) => `
                  <button class="syllable-card level-${item.level}" type="button" data-syllable="${item.id}">
                    <span>
                      <strong class="syllable-character">${item.character}</strong>
                      <span class="syllable-meta">${item.pinyinDisplay || item.pinyin} · ${item.tone} · ${item.score}</span>
                      <span class="syllable-feedback">${item.feedback}</span>
                    </span>
                    <span class="status-pill">${item.status}</span>
                  </button>
                `,
              )
              .join("")}
          </div>
        </section>

        <button class="hint-card" type="button" data-syllable="fan">
          Select a syllable card to view a mouth-shape demo, tongue-position cue, tone curve, and detailed practice suggestion.
        </button>
      </div>
    </section>
  `;
}

function renderStudentTaskContent({ embedded = false } = {}) {
  const task = getSelectedStudentTask(state);
  if (!task) {
    return `
      <section class="panel today-task-card task-empty-card">
        <span class="model-kicker">Tasks</span>
        <h2>No Practice Pack Yet</h2>
        <p class="today-task-note">When your teacher publishes a practice pack, today's work, submissions, and teacher feedback will appear here.</p>
        <button class="teacher-secondary-button" type="button" data-view="practice">Go to Free Practice</button>
      </section>
    `;
  }
  const submissions = (state.taskSubmissions || []).filter((submission) => submission.taskId === task.id);
  const latestSubmission = submissions.at(-1);
  const exerciseSet = task.exerciseSet?.length
    ? task.exerciseSet
    : (task.items || []).map((item, index) => ({
        id: `legacy-${index}`,
        type: index === (task.items || []).length - 1 ? "Submit" : "Practice",
        title: item,
        instruction: index === (task.items || []).length - 1
          ? "Record and submit after completing this step."
          : "Complete this practice item from your teacher.",
        targetText: task.practiceText,
        requiredCount: index === (task.items || []).length - 1 ? 1 : task.repeatCount,
        requiresSubmission: index === (task.items || []).length - 1,
      }));
  const activeExercise = exerciseSet.find((exercise) => exercise.id === state.activeTaskExerciseId)
    || exerciseSet.find((exercise) => exercise.requiresSubmission)
    || exerciseSet[0];
  const taskProgress = state.taskStepProgress?.[task.id] || {};
  const completedCount = exerciseSet.filter((exercise) => taskProgress[exercise.id]?.completed).length;
  const allStepsCompleted = exerciseSet.length > 0 && completedCount === exerciseSet.length;
  const isStepMode = Boolean(state.activeTaskExerciseId);
  const isActiveTask = state.activeTaskPracticeId === task.id;
  const taskRecordCopy = state.modelStatus === "analyzing"
    ? "Analyzing and Submitting..."
    : state.recordingState === "recording"
      ? "Finish Recording and Submit"
      : isActiveTask && state.recordingState === "complete"
        ? "Record Again and Submit"
        : "Start Recording and Submit";
  const allTaskSubmissions = state.taskSubmissions || [];
  const reviewedCount = allTaskSubmissions.filter((submission) => submission.status === "Teacher Reviewed").length;
  const pendingCount = allTaskSubmissions.filter((submission) => submission.status === "Needs Teacher Feedback").length;
  const taskStatus = latestSubmission?.status || (submissions.length ? "Needs Teacher Feedback" : "Ready to Submit");
  const packageState = taskPackageUiState(task);
  const isCompletedPackage = packageState.label === "Complete";
  const teacherFeedbackTitle = latestSubmission?.teacherFeedback
    ? `${latestSubmission.teacherScore ?? "--"}  · Teacher Feedback`
    : "Teacher is reviewing";
  const teacherFeedbackBody = latestSubmission?.teacherFeedback
    || (latestSubmission ? "Your teacher has received the task recording. Feedback will appear here after review." : "Complete the tasks and submit them to receive teacher feedback here.");
  if (isStepMode) {
    const stepProgress = taskProgress[activeExercise?.id] || {};
    const activePracticeItems = practiceItemsForExercise(activeExercise);
    const activeItemIndex = Math.min(Math.max(Number(state.activeTaskItemIndex || 0), 0), Math.max(activePracticeItems.length - 1, 0));
    const activeItemText = activePracticeItems[activeItemIndex] || activeExercise?.targetText || task.practiceText || "我要吃饭";
    const completedItems = stepProgress.items || [];
    const completedItem = completedItems[activeItemIndex] || null;
    const allItemsDone = activePracticeItems.length > 0 && activePracticeItems.every((_, index) => completedItems[index]?.completed);
    const currentItemDone = Boolean(completedItems[activeItemIndex]?.completed);
    const itemRecordCopy = currentItemDone && state.recordingState !== "recording" && state.modelStatus !== "analyzing"
      ? "Record Again and Submit"
      : taskRecordCopy;
    return `
        <section class="panel task-simple-card">
          <button class="teacher-secondary-button task-back-button" type="button" data-action="return-task-steps">Back to Tasks</button>
          <span class="model-kicker">Step ${exerciseSet.findIndex((exercise) => exercise.id === activeExercise?.id) + 1}</span>
          <div class="today-task-heading">
            <div>
              <h2>${escapeHtml(activeExercise?.title || "Task Step")}</h2>
              <p>${escapeHtml(activeExercise?.instruction || "Complete this step from your teacher.")}</p>
            </div>
            <span class="status-pill">${stepProgress.completed ? "Saved" : "In Progress"}</span>
          </div>
          <div class="task-primary-target">
            <span>${escapeHtml(activeExercise?.type || "Practice")}</span>
            <strong>${escapeHtml(activeItemText)}</strong>
            <p>Item ${activeItemIndex + 1}/${activePracticeItems.length || 1}. ${activeExercise?.requiresSubmission ? "These recordings will be included in the final submission to your teacher." : "Record and save each item separately."}</p>
            <div class="practice-item-list task-item-list">
              ${activePracticeItems.map((item, index) => `
                <button class="${index === activeItemIndex ? "is-active" : ""} ${completedItems[index]?.completed ? "is-complete" : ""}" type="button" data-task-practice="${escapeHtml(task.id)}" data-task-exercise="${escapeHtml(activeExercise?.id || "")}" data-task-item-index="${index}">
                  ${escapeHtml(item)}
                </button>
              `).join("")}
            </div>
          </div>
          <div class="task-step-action-panel">
            <span class="model-kicker">Standard Audio and Recording</span>
            <p>Current item: ${escapeHtml(activeItemText)}. Listen to the standard pronunciation, then record your practice. Feedback and visual cues will appear on this page.</p>
            <button class="teacher-secondary-button" type="button" data-action="play">Play Standard Pronunciation</button>
            <div class="record-row task-record-row" aria-label="Practice Pack Recording Actions">
              <button class="record-button" type="button" data-action="task-record" data-task-practice="${escapeHtml(task.id)}" data-task-exercise="${escapeHtml(activeExercise?.id || "")}" data-task-item-index="${activeItemIndex}" ${state.modelStatus === "analyzing" ? "disabled" : ""}>
                <span class="record-state-dot"></span>${itemRecordCopy}
              </button>
              <button class="square-button" type="button" data-action="play-self" ${completedItem?.recordingUrl || state.lastRecordingUrl ? "" : "disabled"}>Replay</button>
            </div>
          </div>
          ${renderTaskStepVisualFeedback(activeItemText, completedItem)}
          ${
            allItemsDone
              ? `<div class="task-next-step">
                  <span>Complete</span>
                  <p>All ${activePracticeItems.length || 1} item(s) are saved. Return to the task steps and continue.</p>
                </div>`
              : ""
          }
        </section>
    `;
  }
  if (isCompletedPackage) {
    return `
        <section class="panel task-simple-card">
          <span class="model-kicker">Completed Practice Pack</span>
          <div class="today-task-heading">
            <div>
              <h2>${escapeHtml(task.title)}</h2>
              ${taskGoalMarkup(task.goal)}
            </div>
            <span class="status-pill">Complete</span>
          </div>
          <div class="teacher-task-meta">
            <span>${escapeHtml(task.suggestedDue)}</span>
            <span>Completed ${packageState.totalCount}/${packageState.totalCount} Step</span>
            <span>${submissions.length} submissions</span>
          </div>
        </section>

        <section class="panel task-feedback-card">
          <span class="model-kicker">Task Feedback</span>
          <strong>${escapeHtml(teacherFeedbackTitle)}</strong>
          <p>${escapeHtml(teacherFeedbackBody)}</p>
        </section>

        <button class="teacher-secondary-button" type="button" data-view="tasks">Back to Task List</button>
    `;
  }
  return `
        <section class="panel task-simple-card">
          <span class="model-kicker">Practice Pack</span>
          <div class="today-task-heading">
            <div>
              <h2>${escapeHtml(task.title)}</h2>
              ${taskGoalMarkup(task.goal)}
            </div>
            <span class="status-pill">${escapeHtml(task.status)}</span>
          </div>
          <div class="teacher-task-meta">
            <span>${escapeHtml(task.suggestedDue)}</span>
            <span>Completed ${completedCount}/${exerciseSet.length} steps</span>
            <span>Requires ${task.requiredSubmissions} recording(s)</span>
          </div>
          <div class="task-step-list">
            ${exerciseSet.map((exercise, index) => `
              <button class="task-step-card ${taskProgress[exercise.id]?.completed ? "is-complete" : ""}" type="button" data-task-practice="${escapeHtml(task.id)}" data-task-exercise="${escapeHtml(exercise.id)}">
                <span class="task-exercise-index">${index + 1}</span>
                <span>
                  <strong>${escapeHtml(exercise.title)}</strong>
                  <small>${escapeHtml(exercise.instruction)}</small>
                  <em>${escapeHtml(exercise.targetText || task.practiceText || "")} · ${exercise.requiredCount || 1} time(s)${exercise.requiresSubmission ? " · Recording Submit" : ""}</em>
                  ${renderPracticeItemChips(practiceItemsForExercise(exercise), "practice-item-list is-compact")}
                </span>
                <b>${taskProgress[exercise.id]?.completed ? "Complete" : "Start"}</b>
              </button>
            `).join("")}
          </div>
          <button class="teacher-primary-button" type="button" data-action="submit-task-to-teacher" data-task-practice="${escapeHtml(task.id)}" ${allStepsCompleted && !latestSubmission ? "" : "disabled"}>
            ${latestSubmission ? "Submitted to Teacher" : allStepsCompleted ? "Submit to Teacher" : "Complete All Steps to Submit"}
          </button>
        </section>

        <section class="panel task-feedback-card">
          <span class="model-kicker">Task Feedback</span>
          <strong>${escapeHtml(teacherFeedbackTitle)}</strong>
          <p>${escapeHtml(teacherFeedbackBody)}</p>
          ${latestSubmission?.recordingUrl ? `<button class="teacher-secondary-button" type="button" data-action="play-submission" data-submission-id="${escapeHtml(latestSubmission.id)}">Replay Submitted Recording</button>` : ""}
        </section>

        <button class="teacher-secondary-button" type="button" data-view="tasks">Back to Task List</button>
  `;
}

function renderStudentTasks() {
  const tasks = (state.publishedTasks || []).filter((task) => task.status === "Published");
  return `
    <section class="screen" data-screen="tasks">
      ${brandHeader()}
      <div class="content task-page-content">
        ${
          tasks.length
            ? `<div class="task-package-list" aria-label="Practice pack list">
                ${tasks.map((task) => {
                  const packageState = taskPackageUiState(task);
                  return `
                    <button class="panel task-package-card is-${packageState.level}" type="button" data-student-task="${escapeHtml(task.id)}">
                      <div class="task-package-topline">
                        <span class="model-kicker">Practice Pack</span>
                        <span class="status-pill">${escapeHtml(packageState.label)}</span>
                      </div>
                      <h2>${escapeHtml(task.title)}</h2>
                      ${taskGoalMarkup(task.goal)}
                      <div class="teacher-task-meta">
                        <span>${escapeHtml(task.suggestedDue)}</span>
                        <span>${packageState.completedCount}/${packageState.totalCount} Step</span>
                        <span>Submit ${task.requiredSubmissions} recording(s)</span>
                      </div>
                    </button>
                  `;
                }).join("")}
              </div>`
            : `<section class="panel today-task-card task-empty-card">
                <span class="model-kicker">Tasks</span>
                <h2>No Practice Packs</h2>
                <p class="today-task-note">When your teacher publishes a practice pack, it will appear here. You can use custom practice for now.</p>
                <button class="teacher-secondary-button" type="button" data-view="practice">Go to Custom Practice</button>
              </section>`
        }
      </div>
    </section>
  `;
}

function renderStudentTaskDetail() {
  return `
    <section class="screen" data-screen="task-detail">
      ${brandHeader()}
      <div class="content task-page-content">
        ${renderStudentTaskContent()}
      </div>
    </section>
  `;
}

function renderEntryAssessment() {
  const items = getEntryAssessmentItems();
  const session = state.assessmentSession || {};
  const currentIndex = Math.min(session.currentIndex || 0, items.length - 1);
  const currentItem = items[currentIndex];
  const results = session.results || [];
  const completed = results.length >= items.length;
  const actionButton = completed
    ? `<button class="assessment-entry-button" type="button" data-action="complete-entry-assessment">Submit Assessment to Teacher</button>`
    : `<button class="assessment-entry-button" type="button" data-action="assessment-record" ${state.modelStatus === "analyzing" ? "disabled" : ""}>
        ${
          state.modelStatus === "analyzing"
            ? "Analyzing..."
            : state.recordingState === "recording"
              ? "Finish This Recording"
              : "Start This Recording"
        }
      </button>`;
  return `
    <section class="screen" data-screen="entry-assessment">
      ${brandHeader()}
      <div class="content">
        <section class="panel assessment-entry-card">
          <div class="assessment-entry-heading">
            <div>
              <span class="model-kicker">Entry Assessment</span>
              <h2>${completed ? "Assessment Complete" : currentItem.title}</h2>
              <p>${completed ? "Assessment results are ready. Submit them so your teacher can confirm the first practice plan." : `Please read: ${currentItem.prompt} (${currentItem.pinyin})`}</p>
            </div>
            <span class="status-pill">${results.length}/${items.length}</span>
          </div>
          <div class="assessment-progress-track" aria-hidden="true">
            <span style="width:${Math.round((results.length / items.length) * 100)}%"></span>
          </div>
          ${
            completed
              ? `<div class="assessment-profile-mini">
                  <strong>Ready to Submit</strong>
                  <p>The system will use ${results.length} result(s) to create a starting pronunciation profile. Your teacher can confirm it and publish a practice pack.</p>
                </div>`
              : `<div class="task-focus-box">
                  <span class="model-kicker">${escapeHtml(currentItem.type)}</span>
                  <strong>${escapeHtml(currentItem.prompt)}</strong>
                  <p>Focus: ${escapeHtml(currentItem.focus)}</p>
                </div>`
          }
          ${
            actionButton
          }
        </section>
        <section class="panel student-submission-card">
          <span class="model-kicker">Completed Items</span>
          ${
            results.length
              ? results.map((result) => `
                  <article class="student-submission-row">
                    <strong>${escapeHtml(result.prompt)} · ${result.score} </strong>
                    <span>${escapeHtml(result.title)}</span>
                    <p>${escapeHtml(result.note)}</p>
                  </article>
                `).join("")
              : `<p class="today-task-note">No completed items yet.</p>`
          }
        </section>
      </div>
    </section>
  `;
}

function renderChatPage({ teacher = false } = {}) {
  const role = teacher ? "teacher" : "student";
  const threads = getChatThreads(state, role);
  const selectedThread = getSelectedChatThread(state, role) || threads[0] || null;
  const participantId = teacher ? "teacher-main" : "learner-b";
  const showThread = state.chatMode === "thread" && selectedThread;
  const shellOpen = teacher ? "" : `<section class="screen chat-screen" data-screen="chat">${brandHeader()}`;
  const shellClose = teacher ? "" : `</section>`;
  const chatHeader = teacher ? "" : "";
  const directThreads = threads.filter((thread) => thread.type !== "class");
  const classThreads = threads.filter((thread) => thread.type === "class");
  const students = getTeacherStudents(state);
  const quickReplies = teacher
    ? ["Improving. Keep going.", "This is steadier than last time.", "Read a little slower first.", "I will listen again.", "No rush. Follow the steps."]
    : ["Got it", "I finished the recording", "Please review it again", "I will keep practicing today"];
  const studentOptions = students
    .map((student) => `<option value="${escapeHtml(student.id)}" ${student.id === state.selectedTeacherStudentId ? "selected" : ""}>${escapeHtml(student.name)}</option>`)
    .join("");
  const studentCheckboxes = students
    .map((student) => `
      <label class="chat-student-option">
        <input type="checkbox" data-field="class-chat-student" value="${escapeHtml(student.id)}" checked>
        <span>${escapeHtml(student.name)}</span>
      </label>
    `)
    .join("");
  const renderThreadButton = (thread) => {
    const unread = getUnreadChatCount(state, thread, role);
    const last = threadLastMessage(thread);
    const typeLabel = threadTypeLabel(thread);
    const displayTitle = chatThreadDisplayTitle(thread, role);
    return `
      <div class="wechat-thread-row">
        <div class="wechat-thread-actions" aria-label="${escapeHtml(displayTitle)} conversation actions">
          <button class="wechat-thread-delete" type="button" data-action="delete-chat-thread" data-chat-thread-action="${escapeHtml(thread.id)}">Delete</button>
        </div>
        <button class="wechat-thread" type="button" data-chat-thread="${escapeHtml(thread.id)}" aria-label="${escapeHtml(displayTitle)}, swipe left to manage or right-click to delete">
          ${avatarMarkup(displayTitle, "", "chat-avatar")}
          <span>
            <strong>${escapeHtml(displayTitle)}</strong>
            <small>${escapeHtml(last?.body || typeLabel)}</small>
          </span>
          <span class="thread-meta">
            <time>${escapeHtml(last?.createdAt || "")}</time>
            <b>${typeLabel}</b>
          </span>
          ${unread ? `<em>${unread}</em>` : ""}
        </button>
      </div>
    `;
  };
  const threadList = `
    <section class="wechat-list-panel coach-chat-list">
      ${
        directThreads.length
          ? `<div class="wechat-thread-group">
              <p class="section-label">Teacher Chat</p>
              <div class="wechat-thread-list">${directThreads.map(renderThreadButton).join("")}</div>
            </div>`
          : ""
      }
      ${
        classThreads.length
          ? `<div class="wechat-thread-group">
              <p class="section-label">Class Group</p>
              <div class="wechat-thread-list">${classThreads.map(renderThreadButton).join("")}</div>
            </div>`
          : ""
      }
      ${
        teacher
          ? `<section class="chat-create-card" aria-label="Create Chat">
              <div class="chat-create-block">
              <span class="model-kicker">Create Class Group</span>
              <label>
                <span>Group name</span>
                <input data-field="class-chat-title" value="${escapeHtml(state.teacherDashboard?.className || "Mandarin Class")} Group" placeholder="Example: Wednesday Tone Practice">
              </label>
                <div class="chat-student-options" aria-label="Choose learners for the group">
                  ${studentCheckboxes}
                </div>
                <button class="teacher-primary-button" type="button" data-action="create-class-chat">Create Group</button>
              </div>
              <div class="chat-create-block">
                <span class="model-kicker">Create Learner Chat</span>
                <label>
                  <span>Choose Learner</span>
                  <select data-field="direct-chat-student">${studentOptions}</select>
                </label>
                <button class="teacher-secondary-button" type="button" data-action="create-direct-chat">Start Chat</button>
              </div>
            </section>`
          : `<section class="student-chat-tools" aria-label="Contact Teacher">
              <button class="teacher-secondary-button" type="button" data-action="create-student-direct-chat">Chat with Teacher</button>
            </section>`
      }
    </section>
  `;
  const threadWindow = selectedThread ? `
    <section class="wechat-chat-panel coach-chat-panel">
      <header class="wechat-chat-header">
        <button class="wechat-back-button" type="button" data-action="chat-back">‹</button>
        <div>
          <strong>${escapeHtml(chatThreadDisplayTitle(selectedThread, role))}</strong>
          <span>${threadTypeLabel(selectedThread)} · ${getUnreadChatCount(state, selectedThread, role)} Unread</span>
        </div>
        <span class="status-pill">${selectedThread.type === "class" ? "Class" : "Direct"}</span>
      </header>
      <div class="coach-thread-context">
        <span class="model-kicker">Communication Focus</span>
        <p>${selectedThread.type === "class" ? "Use class notices for shared plans. Use teacher chat for personal pronunciation questions." : "Use this thread to send practice updates, ask for recording review, or confirm the next practice focus."}</p>
      </div>
      ${
        selectedThread.type === "class"
          ? `<div class="wechat-thread-manage">
              <button type="button" data-action="delete-chat-thread" data-chat-thread-action="${escapeHtml(selectedThread.id)}">Delete Group</button>
            </div>`
          : ""
      }
      <div class="wechat-message-list">
        ${
          (selectedThread.messages || []).map((message) => {
            const mine = message.senderId === participantId;
            const readCount = (message.readBy || []).length;
            return `
              <article class="wechat-message ${mine ? "is-mine" : ""}">
                ${!mine ? avatarMarkup(message.senderName, "", "chat-avatar mini") : ""}
                <div>
                  <span>${escapeHtml(message.senderName)}</span>
                  <p>${escapeHtml(message.body)}</p>
                  <small>${escapeHtml(message.createdAt)} · ${mine ? (readCount > 1 ? "Read" : "Unread") : "Read"}</small>
                </div>
                ${mine ? avatarMarkup(message.senderName, state.account?.avatarDataUrl || "", "chat-avatar mini") : ""}
              </article>
            `;
          }).join("")
        }
      </div>
      <div class="wechat-emoji-row" aria-label="Quick replies">
        ${quickReplies.map((reply) => `<button type="button" data-chat-emoji="${escapeHtml(reply)}">${escapeHtml(reply)}</button>`).join("")}
      </div>
      <div class="wechat-compose">
        <input data-field="chat-message" placeholder="${teacher ? "Type encouragement, reminders, or practice advice" : "Type a practice update or question"}">
        <button type="button" data-action="send-chat-message">Send</button>
      </div>
    </section>
  ` : `
    <section class="wechat-list-panel">
      <p class="teacher-empty-copy">No conversations yet.</p>
    </section>
  `;
  return `
    ${shellOpen}
      ${chatHeader}
      <div class="content wechat-content">
        ${showThread ? threadWindow : threadList}
      </div>
    ${shellClose}
  `;
}

function detailHeader(syllable, { fromTask = false } = {}) {
  return `
    <header class="app-header detail-header">
      <div class="status-row">
        <span>${statusTime()}</span>
        <span>Syllable Detail</span>
      </div>
      <div class="detail-title-row">
        <div>
          <button class="back-button" type="button" ${fromTask ? 'data-action="return-task-detail"' : 'data-view="practice"'}>${fromTask ? "Back to Tasks" : "Back to Practice"}</button>
          <h1 class="detail-heading">Detailed Practice</h1>
          <p class="detail-subtitle">${syllable.pinyinDisplay || syllable.pinyin} · ${syllable.tone} · Current ${syllable.score} </p>
        </div>
        <div class="detail-character" aria-hidden="true">${syllable.character}</div>
      </div>
    </header>
  `;
}

function renderDetail() {
  const taskSubmission = state.taskDetailMode ? getLatestTaskSubmission(state) : null;
  const activeSyllables = taskSubmission?.syllables || getSyllables(state);
  const activeTeachingSegment = !taskSubmission ? state.teachingPlan?.segments?.[state.selectedClipSegmentIndex] : null;
  const segmentSyllable = activeTeachingSegment?.syllableId
    ? activeSyllables[activeTeachingSegment.syllableId]
    : activeTeachingSegment?.syllable;
  const syllable = segmentSyllable ?? activeSyllables[state.selectedSyllable] ?? Object.values(activeSyllables)[0];
  const hasReference = hasArticulationReference(syllable);
  const missingImageUnits = missingArticulationImageUnits(syllable);
  return `
    <section class="screen" data-screen="detail">
      ${detailHeader(syllable, { fromTask: Boolean(taskSubmission) })}
      <div class="content">
        ${taskSubmission ? "" : renderTeachingVideoPanel()}
        <section aria-labelledby="mouth-title">
          <p class="section-label" id="mouth-title">Mouth Shape and Tongue Position</p>
          <div class="panel mouth-grid">
            <div class="mouth-panel">
              <p class="panel-title">${hasReference ? "Reference Mouth Image" : "Auto Mouth Diagram"}</p>
              <div class="mouth-reference">
                ${renderGeneratedMouth(syllable)}
              </div>
              <p class="mouth-cue-line">${escapeHtml(syllable.mouthCue)}</p>
            </div>
            <div class="mouth-panel">
              <p class="panel-title">My Mirror</p>
              <div class="mirror-area" id="mirror-area">
                <span><strong>Waiting for Camera</strong>Allow the camera, then compare your lip and teeth position with the reference.</span>
              </div>
            </div>
          </div>
          <div class="panel tongue-reference">
            <div>
              <p class="panel-title">${hasReference ? "Reference Tongue Position Image" : "Auto Tongue Position Diagram"}</p>
              <p class="mouth-cue-line">${escapeHtml(syllable.tongueCue)}</p>
            </div>
            ${renderGeneratedTongue(syllable)}
          </div>
          ${
            missingImageUnits.length
              ? `<p class="model-summary">No precise mouth-shape or tongue-position image is available yet for ${missingImageUnits.map((item) => `${item.kind} ${item.unit}`).join(", ")}. Use the teaching video and text cue above.</p>`
              : ""
          }
        </section>

        <section class="panel chart-card" aria-labelledby="tone-title">
          <div class="chart-title">
            <h2 id="tone-title">Tone Comparison · Tone ${syllable.tone.replace("T", "")}</h2>
            <div class="chart-legend" aria-hidden="true">
              <span class="legend-key">Target</span>
              <span class="legend-key current">Yours</span>
            </div>
          </div>
          <canvas id="tone-chart" width="640" height="248" aria-label="Target tone and current tone contour comparison"></canvas>
        </section>

        <section class="panel analysis-card" aria-label="Syllable Analysis">
          <strong>Syllable Summary</strong>
          <span>${escapeHtml(syllable.feedback)}</span>
          ${
            syllable.issue
              ? `<span class="analysis-extra">${escapeHtml(syllable.issue.detail)}</span>`
              : ""
          }
        </section>

        <button class="replay-button ${state.playing ? "is-active" : ""}" type="button" data-action="play-detail">
          ${state.playing ? "Replaying Demo..." : "Replay Standard Pronunciation"}
        </button>
      </div>
    </section>
  `;
}

function renderProgress() {
  const progress = getProgressData(state);
  const calendarDays = getCalendarDays(state);
  return `
    <section class="screen" data-screen="progress">
      ${brandHeader({ progress: true })}
      <div class="content">
        <section aria-labelledby="trend-title">
          <p class="section-label" id="trend-title">Overall Score Trend</p>
          <div class="panel chart-card trend-wrap">
            <canvas id="progress-chart" width="640" height="248" aria-label="${progress.label} overall score line chart"></canvas>
          </div>
        </section>

        <section aria-labelledby="calendar-title">
          <p class="section-label" id="calendar-title">Practice Calendar</p>
          <div class="panel calendar-grid">
            ${calendarDays
              .map(
                (day) => `
                  <button class="calendar-day ${day.practiced ? "is-done" : ""} ${day.today ? "is-today" : ""} ${day.selected ? "is-selected" : ""}" type="button" data-progress-date="${escapeHtml(day.date)}">
                    <strong>${day.label}</strong>
                    <span>${day.practiced ? "Practiced" : "No Practice"}</span>
                  </button>
                `,
              )
              .join("")}
          </div>
        </section>

        <section aria-labelledby="words-title">
          <p class="section-label" id="words-title">Daily Practice Words</p>
          <div class="word-list">
            ${progress.words.length
              ? progress.words
              .map(
                (item) => `
                  <button class="word-row level-${item.level}" type="button" data-word="${item.word}" data-score="${item.score}" data-status="${item.status}">
                    <span class="word-top">
                      <strong class="word-name">${item.word}</strong>
                      <span class="word-status">${item.score} · ${item.status}</span>
                    </span>
                    <span class="progress-track" aria-hidden="true">
                      <span class="progress-fill" style="width:${item.score}%"></span>
                    </span>
                  </button>
                `,
              )
              .join("")
              : `<p class="panel today-task-note">No custom practice record for this day.</p>`}
          </div>
        </section>

        <section aria-labelledby="tones-title">
          <p class="section-label" id="tones-title">Tone Drills</p>
          <div class="panel tone-list">
            ${progress.tones
              .map(
                (item) => `
                  <button class="tone-card ${item.level}" type="button" data-tone-drill="${item.tone}">
                    <div class="tone-top">
                      <span class="tone-label">${item.label}</span>
                      <span class="tone-score">${item.score} </span>
                    </div>
                    <div class="progress-track" aria-hidden="true">
                      <div class="progress-fill" style="width:${item.score}%"></div>
                    </div>
                  </button>
                `,
              )
              .join("")}
          </div>
        </section>

        <button class="replay-button" type="button" data-view="practice">Back to Practice Today</button>
      </div>
    </section>
  `;
}

function teacherPageHeader(title, subtitle) {
  return `
    <header class="app-header teacher-header">
      <div class="status-row">
        <span>${statusTime()}</span>
        <span>Mandarin Practice Management</span>
      </div>
      <div class="brand-row">
        <div>
          <h1 class="brand"><span class="brand-accent">VoiceSight</span> Teacher</h1>
          <p class="teacher-subtitle">${escapeHtml(title)} \u00b7 ${escapeHtml(subtitle)}</p>
        </div>
      </div>
    </header>
  `;
}

function renderTeacherHomePage(summary, classProgress) {
  return `
    <section aria-labelledby="teacher-home-title">
      <p class="section-label" id="teacher-home-title">Today</p>
      <div class="teacher-metric-grid">
        <button class="teacher-metric-card is-warm" type="button" data-teacher-view="reviews">
          <strong>${summary.pendingSubmissions}</strong>
          <span>Recordings to Review</span>
        </button>
        <button class="teacher-metric-card ${summary.needsAttention ? "is-alert" : ""}" type="button" data-teacher-view="students" data-teacher-filter="attention">
          <strong>${summary.needsAttention}</strong>
          <span>Needs Attention</span>
        </button>
        <button class="teacher-metric-card" type="button" data-teacher-view="tasks">
          <strong>${summary.totalPublishedTasks || 0}</strong>
          <span>Published Practice Tasks</span>
        </button>
      </div>
    </section>

    <section class="panel teacher-class-progress-card" aria-labelledby="teacher-class-progress-title">
      <div class="teacher-review-heading">
        <div>
          <span class="model-kicker">Class Overview</span>
          <strong id="teacher-class-progress-title">Practice Completion and Focus Overview</strong>
        </div>
        <span class="status-pill">${classProgress.studentCount} learners</span>
      </div>
      <div class="teacher-class-progress-grid">
        <span><strong>${classProgress.completionRate}%</strong>Submission Coverage</span>
        <span><strong>${classProgress.taskCoverageRate}%</strong>Task Coverage</span>
        <span><strong>${classProgress.averageLatestScore}</strong>Average Assessment</span>
      </div>
      <div class="teacher-progress-bar" aria-label="Class submission coverage rate">
        <span style="width:${classProgress.completionRate}%"></span>
      </div>
      <div class="teacher-class-columns">
        <div>
          <span class="teacher-report-label">Common Focus Areas</span>
          <div class="teacher-tag-list">
            ${
              classProgress.commonFocusTags.length
                ? classProgress.commonFocusTags.map((item) => `<span>${escapeHtml(item.tag)} · ${item.count}</span>`).join("")
                : "<span>No common issue yet</span>"
            }
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderTeacherStudentsPage(students, selectedStudent, assessmentReport) {
  const activeFilter = state.teacherStudentFilter === "attention" ? "attention" : "all";
  const visibleStudents = activeFilter === "attention" ? getFilteredTeacherStudents(state) : students;
  const isEditingSummary = Boolean(selectedStudent && state.editingTeacherStudentSummaryId === selectedStudent.id);
  return `
    <section aria-labelledby="teacher-students-title">
      <p class="section-label" id="teacher-students-title">Learner Management</p>
      <div class="teacher-action-list teacher-filter-list" aria-label="Learner filters">
        <button type="button" data-teacher-view="students" data-teacher-filter="all" ${activeFilter === "all" ? "aria-current=\"page\"" : ""}>All Learners</button>
        <button type="button" data-teacher-view="students" data-teacher-filter="attention" ${activeFilter === "attention" ? "aria-current=\"page\"" : ""}>Needs Attention</button>
      </div>
      <div class="teacher-student-list">
        ${
          visibleStudents.length
            ? visibleStudents
              .map((student) => {
                const attentionCopy = getTeacherStudentAttentionReasons(student).join(" / ");
                return `
              <button class="teacher-student-card ${student.id === selectedStudent?.id ? "is-selected" : ""}" type="button" data-teacher-student="${escapeHtml(student.id)}">
                <span>
                  <strong>${escapeHtml(student.name)}</strong>
                  <span>${escapeHtml(student.stage)} · ${student.weeklyPracticeCount} sessions this week${attentionCopy ? ` · ${escapeHtml(attentionCopy)}` : ""}</span>
                </span>
                <span class="status-pill">${student.latestScore} </span>
              </button>
                `;
              })
              .join("")
            : `<p class="teacher-empty-copy">No learners currently need attention.</p>`
        }
      </div>
    </section>

    ${
      selectedStudent && assessmentReport
        ? `
          <section class="panel teacher-report-card" aria-labelledby="teacher-report-title">
            <span class="model-kicker">Learning Profile</span>
            <h2 id="teacher-report-title">${escapeHtml(assessmentReport.studentName)}</h2>
            <div class="teacher-report-score-grid">
              <span><strong>${assessmentReport.latestScore}</strong>Latest Assessment</span>
              <span><strong>${assessmentReport.averageAiScore}</strong>AI Average</span>
              <span><strong>${assessmentReport.teacherAverage || "--"}</strong>Teacher Average</span>
            </div>
            ${
              isEditingSummary
                ? `<form class="teacher-summary-form" data-student-summary-form="${escapeHtml(selectedStudent.id)}">
                    <label class="template-field">
                      <span>Teacher Stage Note</span>
                      <textarea data-field="teacher-student-summary" rows="3">${escapeHtml(assessmentReport.conclusion)}</textarea>
                    </label>
                    <button class="teacher-secondary-button" type="button" data-action="save-teacher-student-summary" data-student-id="${escapeHtml(selectedStudent.id)}">Save Stage Note</button>
                  </form>`
                : `<div class="teacher-summary-display">
                    <span>Teacher Stage Note</span>
                    <p>${escapeHtml(assessmentReport.conclusion)}</p>
                    <button class="teacher-secondary-button" type="button" data-action="edit-teacher-student-summary" data-student-id="${escapeHtml(selectedStudent.id)}">Edit Note</button>
                  </div>`
            }
            <div class="teacher-tag-list">
              ${(selectedStudent.focusTags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
            </div>
          </section>
        `
        : ""
    }
  `;
}

function renderTeacherTasksPage(selectedStudent, recommendedTask, publishedTask, assessmentProfile) {
  if (!selectedStudent || !recommendedTask) {
    return `<p class="teacher-empty-copy">Choose a learner first, then generate a practice task.</p>`;
  }
  const taskDraft = publishedTask || recommendedTask;
  const students = getTeacherStudents(state);
  return `
    <section class="panel teacher-next-card" aria-label="Create Practice Task">
      <span class="model-kicker">New Task</span>
      <strong>Create an Individual Practice Pack</strong>
      <p>Choose a learner, then edit a template using the question bank or custom steps.</p>
      <label class="template-field">
        <span>Choose Learner</span>
        <select data-field="new-task-student">
          ${students.map((student) => `<option value="${escapeHtml(student.id)}" ${student.id === selectedStudent.id ? "selected" : ""}>${escapeHtml(student.name)}</option>`).join("")}
        </select>
      </label>
      <button class="teacher-primary-button" type="button" data-action="start-new-teacher-task">Create Practice Task</button>
    </section>

    <section class="panel teacher-next-card" aria-label="AI Assisted Tasks">
      <span class="model-kicker">Task Center</span>
      <strong>${escapeHtml(taskDraft.title)}</strong>
      <div class="teacher-task-meta">
        <span>${escapeHtml(publishedTask?.status || recommendedTask.status)}</span>
        <span>${taskDraft.exerciseSet?.length || taskDraft.items?.length || 0} task steps</span>
      </div>
      <button class="teacher-primary-button" type="button" data-teacher-view="taskPackageEditor">
        ${publishedTask ? "Review and Edit Again" : "Review and Edit Practice Pack"}
      </button>
    </section>

    ${
      assessmentProfile
        ? `<section class="panel teacher-assessment-card" aria-labelledby="teacher-assessment-title">
            <div class="teacher-review-heading">
              <div>
                <span class="model-kicker">Entry Assessment Profile</span>
                <strong id="teacher-assessment-title">Entry Assessment · ${escapeHtml(assessmentProfile.status)}</strong>
              </div>
              <span class="teacher-review-score">${assessmentProfile.overallScore} </span>
            </div>
            <div class="teacher-task-meta">
              <span>${escapeHtml(assessmentProfile.status)}</span>
              <span>${assessmentProfile.issueTags.length} focus areas</span>
            </div>
            <button class="teacher-primary-button" type="button" data-teacher-view="assessmentEditor" ${assessmentProfile.status === "Teacher Confirmed" ? "disabled" : ""}>
              ${assessmentProfile.status === "Teacher Confirmed" ? "Initial Task Published" : "Edit Practice Pack Template"}
            </button>
          </section>`
        : ""
    }
  `;
}


function renderTaskPackageEditor(selectedStudent, recommendedTask, publishedTask) {
  const isNewTask = state.teacherTaskMode === "new";
  const taskDraft = isNewTask ? recommendedTask : (publishedTask || recommendedTask);
  if (!selectedStudent || !taskDraft) {
    return `
      <section class="panel teacher-assessment-card">
        <span class="model-kicker">Practice Pack Review</span>
        <strong>No editable practice pack yet</strong>
        <p>Choose a learner first. The system will draft a practice pack from the learner profile.</p>
        <button class="teacher-secondary-button" type="button" data-teacher-view="tasks">Back to Task Center</button>
      </section>
    `;
  }
  const exerciseSet = taskDraft.exerciseSet?.length ? taskDraft.exerciseSet : (taskDraft.items || []).map((item, index) => ({
    id: `editor-${index}`,
    type: index === 0 ? "Listening" : index === 1 ? "Repeat" : "Recording",
    title: item,
    instruction: index === 0 ? "Listen to the standard pronunciation and observe mouth shape and rhythm." : index === 1 ? "Repeat the focus sound slowly." : "Read the full sentence, record, and submit.",
    targetText: taskDraft.practiceText,
    requiredCount: index === 1 ? taskDraft.repeatCount : 1,
    requiresSubmission: index === (taskDraft.items || []).length - 1,
  }));
  return `
    <section class="assessment-editor-page" aria-labelledby="task-package-editor-title">
      <button class="teacher-secondary-button assessment-editor-back" type="button" data-teacher-view="tasks">Back to Task Center</button>

      <section class="panel assessment-editor-hero">
        <div>
          <span class="model-kicker">Practice Pack Review Template</span>
          <h2 id="task-package-editor-title">${isNewTask ? "Create Practice Task" : `${escapeHtml(selectedStudent.name)}'s Practice Task`}</h2>
          <p>${isNewTask ? `Create a practice pack for ${escapeHtml(selectedStudent.name)}. Use the question bank or build a fully custom set.` : "The system only drafts the pack. Confirm the target, practice load, and learner-facing instructions before publishing."}</p>
        </div>
        <span class="teacher-review-score">${escapeHtml(String(selectedStudent.latestScore || "--"))} </span>
      </section>

      <section class="panel assessment-template-section">
        <div class="assessment-template-step">
          <span>1</span>
          <div>
            <strong>Confirm Practice Target</strong>
            <p>Set the exact practice focus you want this learner to work on.</p>
          </div>
        </div>
        <div class="teacher-tag-list">
          ${(recommendedTask.reviewTags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
        <label class="template-field">
          <span>Task Title</span>
          <input data-field="recommended-task-title" value="${escapeHtml(taskDraft.title)}">
        </label>
        <label class="template-field">
          <span>Practice target shown on the learner task page</span>
          <textarea data-field="recommended-task-goal" rows="3">${escapeHtml(taskDraft.goal)}</textarea>
        </label>
      </section>

      <section class="panel assessment-template-section">
        <div class="assessment-template-step">
          <span>2</span>
          <div>
            <strong>Task Steps</strong>
            <p>Each step can use the question bank or custom items. Learners complete the steps one by one.</p>
          </div>
        </div>
        <div class="teacher-step-editor-list" data-step-editor-list>
          ${exerciseSet.map((exercise, index) => renderTeacherStepEditor(exercise, index)).join("")}
        </div>
        <button class="teacher-add-step-button" type="button" data-action="add-task-step">＋</button>
      </section>

      <section class="panel assessment-template-section">
        <div class="assessment-template-step">
          <span>3</span>
          <div>
            <strong>Instructions for the Learner</strong>
            <p>Explain why this practice matters, how to complete it, and what to notice first.</p>
          </div>
        </div>
        <label class="template-field">
          <span>Learner Instructions</span>
          <textarea data-field="recommended-teacher-note" rows="4">${escapeHtml(taskDraft.teacherNote)}</textarea>
        </label>
        <button class="teacher-primary-button" type="button" data-action="publish-recommended-task">
          ${publishedTask && !isNewTask ? "Save Changes and Republish" : "Submit to Learner"}
        </button>
      </section>
    </section>
  `;
}


function renderTeacherStepEditor(exercise, index) {
  const mode = exercise.sourceMode === "bank" ? "bank" : "custom";
  const selectedBank = questionBankById(exercise.bankPackageId);
  return `
    <article class="teacher-step-editor-card" data-step-editor-card data-step-mode="${escapeHtml(mode)}">
      <div class="teacher-step-editor-head">
        <div>
          <span class="teacher-step-number">${index + 1}</span>
          <strong class="teacher-step-title">Task Step ${index + 1}</strong>
        </div>
        <div class="step-source-toggle" role="group" aria-label="Task content source">
          <button class="${mode === "bank" ? "is-selected" : ""}" type="button" data-action="set-step-source" data-source-mode="bank">Use Question Bank</button>
          <button class="${mode === "custom" ? "is-selected" : ""}" type="button" data-action="set-step-source" data-source-mode="custom">Custom</button>
        </div>
        <button class="step-delete-button" type="button" data-action="delete-task-step" aria-label="Delete Task Step ${index + 1}">Delete</button>
      </div>
      <section class="step-bank-panel" data-bank-panel ${mode === "bank" ? "" : "hidden"}>
        <label class="template-field">
          <span>Choose Item Pack</span>
          <select data-step-field="bankPackageId">
            ${questionBankPackages.map((pack) => `<option value="${escapeHtml(pack.id)}" ${pack.id === selectedBank.id ? "selected" : ""}>${escapeHtml(pack.title)}</option>`).join("")}
          </select>
        </label>
        <div class="question-bank-preview" data-bank-preview>
          <strong>${escapeHtml(selectedBank.title)}</strong>
          <p>${escapeHtml(selectedBank.description)}</p>
          ${renderPracticeItemChips(selectedBank.items)}
        </div>
      </section>
      <div class="assessment-edit-grid">
        <label class="template-field">
          <span>Step Type</span>
          <input data-step-field="type" value="${escapeHtml(exercise.type || "Practice")}">
        </label>
        <label class="template-field">
          <span>Practice Count</span>
          <input data-step-field="requiredCount" type="number" min="1" value="${escapeHtml(exercise.requiredCount || 1)}">
        </label>
      </div>
      <label class="template-field">
        <span>Step name shown to the learner</span>
        <input data-step-field="title" value="${escapeHtml(exercise.title || "")}">
      </label>
      <label class="template-field">
        <span>Practice items shown to the learner</span>
        <textarea data-step-field="practiceItems" rows="3">${escapeHtml((practiceItemsForExercise(exercise).length ? practiceItemsForExercise(exercise) : selectedBank.items).join("\n"))}</textarea>
      </label>
      <label class="template-field">
        <span>Step Instruction</span>
        <textarea data-step-field="instruction" rows="2">${escapeHtml(exercise.instruction || "")}</textarea>
      </label>
      <label class="template-check-field">
        <input data-step-field="requiresSubmission" type="checkbox" ${exercise.requiresSubmission ? "checked" : ""}>
        <span>This step requires recording and will be submitted to the teacher</span>
      </label>
    </article>
  `;
}


function applyQuestionBankToStepCard(card, packageId) {
  const bank = questionBankById(packageId);
  const setValue = (field, value) => {
    const input = card.querySelector(`[data-step-field="${field}"]`);
    if (input) input.value = value;
  };
  setValue("bankPackageId", bank.id);
  setValue("title", bank.title);
  setValue("targetText", bank.targetText);
  setValue("instruction", bank.description);
  setValue("practiceItems", bank.items.join("\n"));
  const preview = card.querySelector("[data-bank-preview]");
  if (preview) {
    preview.innerHTML = `
      <strong>${escapeHtml(bank.title)}</strong>
      <p>${escapeHtml(bank.description)}</p>
      ${renderPracticeItemChips(bank.items)}
    `;
  }
}


function renumberTeacherStepCards(list) {
  list.querySelectorAll("[data-step-editor-card]").forEach((card, index) => {
    const number = card.querySelector(".teacher-step-number");
    const title = card.querySelector(".teacher-step-title");
    const deleteButton = card.querySelector('[data-action="delete-task-step"]');
    if (number) number.textContent = String(index + 1);
    if (title) title.textContent = `Task Step ${index + 1}`;
    if (deleteButton) deleteButton.setAttribute("aria-label", `Delete Task Step ${index + 1}`);
  });
}


function renderAssessmentTemplateEditor(assessmentProfile) {
  if (!assessmentProfile) {
    return `
      <section class="panel teacher-assessment-card">
        <span class="model-kicker">Practice Pack Template</span>
        <strong>No editable entry assessment profile yet</strong>
        <p>After the learner completes the entry assessment, the system creates a profile for the teacher to edit into a practice pack.</p>
        <button class="teacher-secondary-button" type="button" data-teacher-view="tasks">Back to Task Center</button>
      </section>
    `;
  }
  const repeatCount = assessmentProfile.overallScore < 70 ? 5 : 3;
  const bankPackage = questionBankById(
    questionBankPackages.find((pack) => pack.focusTags.some((tag) => (assessmentProfile.issueTags || []).join(" ").includes(tag)))?.id,
  );
  const assessmentExerciseSet = [
    {
      id: "assessment-listen",
      type: "Demo",
      title: "Listen to Standard Pronunciation and Observe Movement",
      instruction: "Listen to the standard pronunciation and observe mouth shape, tongue position, and rhythm.",
      targetText: bankPackage.targetText || "我要喝水",
      requiredCount: 2,
      sourceMode: "bank",
      bankPackageId: bankPackage.id,
      practiceItems: bankPackage.items,
    },
    {
      id: "assessment-focus",
      type: "Repeat",
      title: "Slow Repetition of Focus Sound",
      instruction: "Slow down the unstable focus sound from the assessment and keep the movement complete.",
      targetText: bankPackage.targetText || "我要喝水",
      requiredCount: repeatCount,
      sourceMode: "bank",
      bankPackageId: bankPackage.id,
      practiceItems: bankPackage.items,
    },
    {
      id: "assessment-submit",
      type: "Submit",
      title: "Full Short-Sentence Recording Submission",
      instruction: "Read the full sentence, record, and submit. The teacher will review it in the review center.",
      targetText: bankPackage.targetText || "我要喝水",
      requiredCount: 1,
      requiresSubmission: true,
      sourceMode: "bank",
      bankPackageId: bankPackage.id,
      practiceItems: bankPackage.items,
    },
  ];
  return `
    <section class="assessment-editor-page" aria-labelledby="assessment-editor-title">
      <button class="teacher-secondary-button assessment-editor-back" type="button" data-teacher-view="tasks">Back to Task Center</button>

      <section class="panel assessment-editor-hero">
        <div>
          <span class="model-kicker">Entry Assessment Practice Pack Template</span>
          <h2 id="assessment-editor-title">Initial Practice Pack</h2>
          <p>AI has generated a draft. Edit it for the learner, then submit it to the learner.</p>
        </div>
        <span class="teacher-review-score">${assessmentProfile.overallScore} </span>
      </section>

      <section class="panel assessment-template-section">
        <div class="assessment-template-step">
          <span>1</span>
          <div>
            <strong>Confirm Practice Target</strong>
            <p>Adjust the AI suggestion into the real practice focus for this learner.</p>
          </div>
        </div>
        <div class="teacher-tag-list">
          ${assessmentProfile.issueTags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
        <label class="template-field">
          <span>Assessment summary for the teacher</span>
          <textarea data-field="assessment-profile-summary" rows="3">${escapeHtml(assessmentProfile.profileSummary)}</textarea>
        </label>
        <label class="template-field">
          <span>Practice target shown on the learner task page</span>
          <textarea data-field="assessment-recommendation" rows="4">${escapeHtml(assessmentProfile.recommendation)}</textarea>
        </label>
      </section>

      <section class="panel assessment-template-section">
        <div class="assessment-template-step">
          <span>2</span>
          <div>
            <strong>Edit Tasks Published to the Learner</strong>
            <p>Adjust the task steps the learner needs to complete.</p>
          </div>
        </div>
        <label class="template-field">
          <span>Task Title</span>
          <input data-field="assessment-task-title" value="Entry Assessment Practice Pack">
        </label>
        <div class="teacher-step-editor-list" data-step-editor-list>
          ${assessmentExerciseSet.map((exercise, index) => renderTeacherStepEditor(exercise, index)).join("")}
        </div>
        <button class="teacher-add-step-button" type="button" data-action="add-task-step">＋</button>
      </section>

      <section class="panel assessment-template-section">
        <div class="assessment-template-step">
          <span>3</span>
          <div>
            <strong>Instructions for the Learner</strong>
            <p>This text appears on the learner task page. Keep it short, specific, and encouraging.</p>
          </div>
        </div>
        <label class="template-field">
          <span>Learner-facing instructions</span>
          <textarea data-field="assessment-teacher-note" rows="4">Your teacher adjusted this practice pack based on your entry assessment. Today, do not rush. Slow down the target sound, say it completely, and your teacher will listen again after you record.</textarea>
        </label>
        <button class="teacher-primary-button" type="button" data-action="publish-assessment-task">Submit to Learner</button>
      </section>
    </section>
  `;
}

function renderTeacherReviewsPage(pendingSubmissions) {
  return `
    <section class="panel teacher-review-card" aria-labelledby="teacher-review-title">
      <div class="teacher-review-heading">
        <div>
          <span class="model-kicker">Review Center</span>
          <strong id="teacher-review-title">Learner Recordings Waiting for Feedback</strong>
        </div>
        <span class="status-pill">${pendingSubmissions.length}</span>
      </div>
      ${
        pendingSubmissions.length
          ? `<div class="teacher-review-list">
              ${pendingSubmissions
                .map(
                  (submission) => `
                    <article class="teacher-submission-item">
                      <div class="teacher-submission-top">
                        <span>
                          <strong>${escapeHtml(submission.studentName)}</strong>
                          <span>${escapeHtml(submission.taskTitle)}</span>
                        </span>
                        <span class="teacher-review-score">${submission.aiScores.overall} </span>
                      </div>
                      <button class="teacher-primary-button" type="button" data-action="open-review-editor" data-review-editor="${escapeHtml(submission.id)}">
                        Edit Feedback
                      </button>
                    </article>
                  `,
                )
                .join("")}
            </div>`
          : `<p class="teacher-empty-copy">Recordings from teacher-assigned tasks will appear here. Add feedback after reviewing the AI first pass.</p>`
      }
    </section>
  `;
}

function renderTeacherReviewEditorPage(submission) {
  if (!submission) {
    return `
      <section class="panel teacher-review-card">
        <span class="model-kicker">Review Center</span>
        <strong>Recording Not Found</strong>
        <p>This recording may already be reviewed or may no longer be in the feedback queue.</p>
        <button class="teacher-secondary-button" type="button" data-teacher-view="reviews">Back to Review Center</button>
      </section>
    `;
  }
  const recordings = submissionRecordings(submission);
  return `
    <section class="panel teacher-review-card teacher-review-editor" aria-labelledby="teacher-review-editor-title">
      <button class="teacher-secondary-button assessment-editor-back" type="button" data-teacher-view="reviews">Back to Review Center</button>
      <div class="teacher-review-heading">
        <div>
          <span class="model-kicker">Edit Feedback</span>
          <strong id="teacher-review-editor-title">${escapeHtml(submission.studentName)}</strong>
          <p>${escapeHtml(submission.taskTitle)}</p>
        </div>
        <span class="teacher-review-score">${submission.aiScores.overall} </span>
      </div>
      <div class="teacher-submission-audio">
        ${
          recordings.length
            ? `
              <span class="teacher-audio-label">Learner Submitted Recordings · ${recordings.length}</span>
              <div class="teacher-recording-list">
                ${recordings.map((recording, index) => `
                  <article class="teacher-recording-item">
                    <div>
                      <strong>Recording ${index + 1}</strong>
                      <span>${escapeHtml(recording.stepTitle)} · ${escapeHtml(recording.targetText || "Unlabeled Item")}</span>
                    </div>
                    <audio controls src="${escapeHtml(recording.recordingUrl)}"></audio>
                  </article>
                `).join("")}
              </div>
            `
            : `<p>This submission has no linked recording yet. Ask the learner to record again and submit.</p>`
        }
      </div>
      <p>${escapeHtml(submission.aiSummary || submission.diagnosisSummary || "AI first-pass review is complete and waiting for teacher feedback.")}</p>
      <div class="teacher-task-meta">
        <span>Item: ${escapeHtml(submission.exerciseTitle || "Short-Sentence Recording Submit")}</span>
        <span>Target: ${escapeHtml(submission.targetText)}</span>
        <span>Heard: ${escapeHtml(submission.heardText || "To Confirm")}</span>
        <span>${escapeHtml(submission.status)}</span>
      </div>
      <div class="teacher-score-strip" aria-label="AI First-Pass Scores">
        <span>Tone ${submission.aiScores.tone}</span>
        <span>Clarity ${submission.aiScores.clarity}</span>
        <span>Rhythm ${submission.aiScores.rhythm}</span>
      </div>
      <div class="teacher-review-form">
        <label>
          <span>Teacher Score</span>
          <input data-review-score="${escapeHtml(submission.id)}" type="number" min="0" max="100" value="${submission.aiScores.overall}">
        </label>
        <label>
          <span>Feedback for Learner</span>
          <textarea data-review-feedback="${escapeHtml(submission.id)}" rows="4">This is closer to the target than last time. Keep slowing down the focus sound. Your teacher can see your progress.</textarea>
        </label>
        <button class="teacher-primary-button" type="button" data-review-submission="${escapeHtml(submission.id)}">
          Save Review and Feedback
        </button>
      </div>
    </section>
  `;
}

function renderTeacherChatPage(selectedStudent, selectedMessages) {
  return `
    <section class="panel teacher-message-card" aria-labelledby="teacher-message-title">
      <div class="teacher-review-heading">
        <div>
          <span class="model-kicker">Chat</span>
          <strong id="teacher-message-title">${selectedStudent ? `${escapeHtml(selectedStudent.name)} · Task Messages` : "Task Messages"}</strong>
        </div>
        <span class="status-pill">${selectedMessages.length}</span>
      </div>
      ${
        selectedMessages.length
          ? `<div class="teacher-message-list">
              ${selectedMessages
                .map(
                  (message) => `
                    <article class="teacher-message-item">
                      <span>${escapeHtml(message.senderName)} · ${escapeHtml(message.createdAt)}</span>
                      <p>${escapeHtml(message.body)}</p>
                      <small>Related practice: ${escapeHtml(message.relatedText || "This task")}</small>
                    </article>
                  `,
                )
                .join("")}
            </div>`
          : `<p class="teacher-empty-copy">Teacher feedback is saved as task messages that learners can see in today's tasks.</p>`
      }
      <div class="teacher-quick-replies" aria-label="Common Encouragement">
        <span class="teacher-report-label">Common Feedback</span>
        <button type="button">This is clearer than last time</button>
        <button type="button">Next time, slow down the focus sound</button>
        <button type="button">Your teacher can see your progress</button>
      </div>
    </section>
  `;
}

function renderTeacherDashboard() {
  const summary = getTeacherDashboardSummary(state);
  const classProgress = buildTeacherClassProgress(state);
  const students = getTeacherStudents(state);
  const pendingSubmissions = getPendingTeacherSubmissions(state);
  const selectedStudent = getSelectedTeacherStudent(state);
  const assessmentProfile = getSelectedAssessmentProfile(state);
  const selectedMessages = getSelectedTeacherMessages(state);
  const recommendedTask = buildRecommendedTaskPackage(selectedStudent);
  const assessmentReport = buildStudentAssessmentReport(state, selectedStudent);
  const publishedTask = (state.publishedTasks || []).find((task) => task.targetStudentId === selectedStudent?.id);
  const selectedReviewSubmission = pendingSubmissions.find((submission) => submission.id === state.selectedReviewSubmissionId)
    || pendingSubmissions[0]
    || null;
  const teacherPages = {
    home: () => renderTeacherHomePage(summary, classProgress),
    students: () => renderTeacherStudentsPage(students, selectedStudent, assessmentReport),
    tasks: () => renderTeacherTasksPage(selectedStudent, recommendedTask, publishedTask, assessmentProfile),
    assessmentEditor: () => renderAssessmentTemplateEditor(assessmentProfile),
    taskPackageEditor: () => renderTaskPackageEditor(selectedStudent, recommendedTask, publishedTask),
    reviews: () => renderTeacherReviewsPage(pendingSubmissions),
    reviewEditor: () => renderTeacherReviewEditorPage(selectedReviewSubmission),
    chat: () => renderChatPage({ teacher: true }),
  };
  const teacherTitles = {
    home: "Home",
    students: "Learner Management",
    tasks: "Task Center",
    assessmentEditor: "Review Practice Pack",
    taskPackageEditor: "Review Practice Pack",
    reviews: "Review Center",
    reviewEditor: "Edit Feedback",
    chat: "Chat",
  };
  const activeTeacherView = teacherPages[state.teacherView] ? state.teacherView : "home";
  return `
    <section class="screen teacher-screen" data-screen="teacher">
      ${teacherPageHeader(teacherTitles[activeTeacherView], `${state.teacherDashboard.teacherName} · ${state.teacherDashboard.className}`)}
      <div class="content teacher-content">
        ${teacherPages[activeTeacherView]()}
      </div>
    </section>
  `;
}

function renderToneDrill() {
  const drill = toneDrills[state.selectedToneDrill] || toneDrills["3"];
  return `
    <section class="screen" data-screen="tone-drill">
      <header class="app-header tone-drill-header">
        <div class="status-row">
          <span>${statusTime()}</span>
          <span>Tone Drill</span>
        </div>
        <div class="tone-drill-title-row">
          <div>
            <button class="tone-back-icon" type="button" data-view="progress" aria-label="Back to Progress">
              <span aria-hidden="true">‹</span>
              <span>Progress</span>
            </button>
            <h1 class="tone-drill-heading">${escapeHtml(drill.label)}</h1>
            <p class="tone-drill-subtitle">${escapeHtml(drill.description)}</p>
          </div>
          <div class="tone-number" aria-hidden="true">${escapeHtml(state.selectedToneDrill)}</div>
        </div>
      </header>
      <div class="content">
        <section class="panel tone-drill-intro">
          <span class="model-kicker">Auto Question Bank</span>
          <strong>Choose a character to start a focused practice drill</strong>
          <p>These characters share the same tone. Select one to switch to practice, hear the standard audio, record, and review the tone contour.</p>
        </section>
        <div class="tone-drill-grid">
          ${drill.words
            .map(
              (word) => `
                <button class="tone-drill-word" type="button" data-set-text="${escapeHtml(word)}">
                  ${escapeHtml(word)}
                </button>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderClipSegmentContent(segment, plan) {
  const syllable = plan.targetSyllable || Object.values(getSyllables(state))[0];
  if (segment.type === "syllable-video") {
    const clips = segment.videoClips || [];
    return `
      <div class="clip-syllable-videos">
        ${
          clips.length
            ? clips.map((clip) => `
                <div class="clip-syllable-video">
                  <p class="panel-title">${escapeHtml(clip.title || clip.videoTitle || "PronunciationDemo")}</p>
                  ${
                    clip.videoUrl
                      ? `
                        <div class="clip-video-shell">
                          <video class="clip-video" controls playsinline ${clip.posterUrl ? `poster="${escapeHtml(clip.posterUrl)}"` : ""}>
                            <source src="${escapeHtml(clip.videoUrl)}" type="video/mp4">
                          </video>
                        </div>
                      `
                      : `<p class="clip-asset-note">No clipped video asset is available for this pronunciation yet.</p>`
                  }
                  <p class="clip-asset-note">${escapeHtml(clip.guidanceText || clip.videoTitle || "")}</p>
                </div>
              `).join("")
            : `<p class="clip-asset-note">No usable video asset is matched to this syllable yet.</p>`
        }
      </div>
      ${
        segment.standardAudioUrl || plan.standardAudioUrl
          ? `<button class="replay-button" type="button" data-action="clip-replay-standard">Play Full Standard Pronunciation</button>`
          : ""
      }
    `;
  }
  if (segment.type === "video-articulation") {
    return `
      <div class="clip-video-shell">
        <video class="clip-video" controls playsinline ${segment.posterUrl ? `poster="${escapeHtml(segment.posterUrl)}"` : ""}>
          <source src="${escapeHtml(segment.videoUrl)}" type="video/mp4">
        </video>
      </div>
      <p class="clip-asset-note">${escapeHtml(segment.videoTitle || `${segment.unit} pronunciation clip`)}</p>
    `;
  }
  if (segment.type === "articulation") {
    return `
      <p class="clip-asset-note">No playable video clip is matched to this sound yet. Listen to the standard pronunciation for now; video will appear when the asset is added.</p>
    `;
  }
  if (segment.type === "tone") {
    return `
      <div class="panel chart-card clip-tone-card">
        <div class="chart-title">
          <h2>Tone Contour</h2>
          <div class="chart-legend" aria-hidden="true">
            <span class="legend-key">Target</span>
            <span class="legend-key current">Yours</span>
          </div>
        </div>
        <canvas id="clip-tone-chart" width="640" height="248" aria-label="Teaching clip tone contour chart"></canvas>
      </div>
    `;
  }
  if (segment.type === "practice") {
    return `
      <div class="clip-practice-words">
        ${(segment.practiceWords || [])
          .map((word) => `<button type="button" data-set-text="${escapeHtml(word)}">${escapeHtml(word)}</button>`)
          .join("")}
      </div>
      <button class="replay-button" type="button" data-action="clip-replay-standard">Play Standard Pronunciation</button>
    `;
  }
  return `
    <div class="clip-focus-character" aria-hidden="true">
      ${escapeHtml(plan.targetSyllable?.character || plan.focusIssue?.focus || "Practice")}
    </div>
  `;
}

function renderTeachingVideoPanel() {
  const plan = state.teachingPlan;
  if (!plan) {
    return `
      <section class="panel clip-summary" aria-label="Teaching Video">
        <span class="model-kicker">Teaching Video</span>
        <strong>Generated after recording</strong>
        <p>After one recording analysis, your personalized teaching video appears here.</p>
      </section>
    `;
  }

  const segments = plan.segments || [];
  const index = Math.min(state.selectedClipSegmentIndex, Math.max(segments.length - 1, 0));
  const segment = segments[index] || segments[0];
  const progress = segments.length ? `${index + 1} / ${segments.length}` : "0 / 0";
  const showSegmentNavigation = segments.length > 1;
  const segmentTabs = segments.map((item, itemIndex) => {
    const label = item.character || item.title || `Step ${itemIndex + 1}`;
    const pinyin = item.pinyin || "";
    return `
      <button
        type="button"
        class="clip-character-tab ${itemIndex === index ? "is-active" : ""}"
        data-action="clip-segment"
        data-clip-segment="${itemIndex}"
        aria-pressed="${itemIndex === index ? "true" : "false"}"
      >
        <strong>${escapeHtml(label)}</strong>
        ${pinyin ? `<span>${escapeHtml(pinyin)}</span>` : ""}
      </button>
    `;
  }).join("");
  return `
    <section class="panel clip-player detail-teaching-video" aria-labelledby="detail-teaching-video-title">
      <span class="model-kicker">Teaching Video</span>
      <h2 id="detail-teaching-video-title">Teaching Video</h2>
      <p class="detail-subtitle">${escapeHtml(plan.title || "This Personalized Teaching Video")}</p>
      ${
        showSegmentNavigation
          ? `
            <div class="clip-character-tabs" aria-label="Choose a character in the sentence">
              ${segmentTabs}
            </div>
            <div class="clip-progress-row">
              <span>${progress}</span>
            </div>
            <div class="clip-progress-track" aria-hidden="true">
              <span style="width:${segments.length ? ((index + 1) / segments.length) * 100 : 0}%"></span>
            </div>
          `
          : ""
      }
      <h3>${escapeHtml(segment.title)}</h3>
      <p>${escapeHtml(segment.guidanceText)}</p>
      ${renderClipSegmentContent(segment, plan)}
      ${
        showSegmentNavigation
          ? `
            <div class="clip-controls" aria-label="Teaching video controls">
              <button type="button" data-action="clip-prev" ${index <= 0 ? "disabled" : ""}>Previous</button>
              <button type="button" data-action="clip-next" ${index >= segments.length - 1 ? "disabled" : ""}>Next</button>
            </div>
          `
          : ""
      }
    </section>
  `;
}

function renderTeachingClip() {
  const plan = state.teachingPlan;
  if (!plan) {
    return `
      <section class="screen" data-screen="teaching-clip">
        <header class="app-header detail-header">
          <div class="status-row">
            <span>${statusTime()}</span>
            <span>Teaching Clip</span>
          </div>
          <div class="detail-title-row">
            <div>
              <button class="back-button" type="button" data-view="practice">Back to Practice</button>
              <h1 class="detail-heading">No Teaching Clip Yet</h1>
              <p class="detail-subtitle">Generated after one analysis.</p>
            </div>
          </div>
        </header>
      </section>
    `;
  }

  const segments = plan.segments || [];
  const index = Math.min(state.selectedClipSegmentIndex, Math.max(segments.length - 1, 0));
  const segment = segments[index] || segments[0];
  const progress = segments.length ? `${index + 1} / ${segments.length}` : "0 / 0";
  return `
    <section class="screen" data-screen="teaching-clip">
      <header class="app-header clip-header">
        <div class="status-row">
          <span>${statusTime()}</span>
          <span>Personalized Teaching Clip</span>
        </div>
        <div class="detail-title-row">
          <div>
            <button class="back-button" type="button" data-view="practice">Back to Practice</button>
            <h1 class="detail-heading">${escapeHtml(plan.title)}</h1>
            <p class="detail-subtitle">Target sentence: ${escapeHtml(plan.targetText || state.targetText)}</p>
          </div>
          <div class="detail-character" aria-hidden="true">${escapeHtml(plan.targetSyllable?.character || "Practice")}</div>
        </div>
      </header>
      <div class="content">
        <section class="panel clip-summary">
          <span class="model-kicker">Current Focus</span>
          <strong>${escapeHtml(plan.focusIssue?.title || plan.focusIssue?.focus || "Pronunciation Practice")}</strong>
          <p>${escapeHtml(plan.focusIssue?.summary || "The system will arrange practice based on your analysis result.")}</p>
        </section>

        <section class="panel clip-player" aria-labelledby="clip-segment-title">
          <div class="clip-progress-row">
            <span>${progress}</span>
          </div>
          <div class="clip-progress-track" aria-hidden="true">
            <span style="width:${segments.length ? ((index + 1) / segments.length) * 100 : 0}%"></span>
          </div>
          <h2 id="clip-segment-title">${escapeHtml(segment.title)}</h2>
          <p>${escapeHtml(segment.guidanceText)}</p>
          ${renderClipSegmentContent(segment, plan)}
        </section>

        <div class="clip-controls" aria-label="Teaching Clip Controls">
          <button type="button" data-action="clip-prev" ${index <= 0 ? "disabled" : ""}>Previous</button>
          <button type="button" data-action="clip-next" ${index >= segments.length - 1 ? "disabled" : ""}>Next</button>
        </div>
      </div>
    </section>
  `;
}

function renderNav() {
  if (!nav) return;
  if (state.currentRole === "student") {
    nav.hidden = false;
    nav.classList.toggle("is-teacher", false);
    nav.innerHTML = STUDENT_NAV_ITEMS.map((item) => `
      <button type="button" data-view="${item.view}" aria-current="${
        item.view === state.currentView || (item.view === "tasks" && state.currentView === "taskDetail") ? "page" : "false"
      }">
        <span class="nav-index">${item.index}</span>
        <span>${item.label}${item.view === "chat" && getTotalUnreadChatCount(state, "student") ? ` · ${getTotalUnreadChatCount(state, "student")}` : ""}</span>
      </button>
    `).join("");
    return;
  }
  if (state.currentRole === "teacher") {
    nav.hidden = false;
    nav.classList.toggle("is-teacher", true);
    nav.innerHTML = TEACHER_NAV_ITEMS.map((item) => `
      <button type="button" data-teacher-view="${item.view}" aria-current="${
        state.currentView === "account"
          ? item.view === "account" ? "page" : "false"
          : item.view === (
            state.teacherView === "assessmentEditor" || state.teacherView === "taskPackageEditor"
              ? "tasks"
              : state.teacherView === "reviewEditor"
                ? "reviews"
                : state.teacherView
          ) ? "page" : "false"
      }">
        <span class="nav-index">${item.index}</span>
        <span>${item.label}${item.view === "chat" && getTotalUnreadChatCount(state, "teacher") ? ` · ${getTotalUnreadChatCount(state, "teacher")}` : ""}</span>
      </button>
    `).join("");
    return;
  }
  nav.hidden = true;
  nav.innerHTML = "";
}

function render() {
  saveStoredState();
  const views = {
    home: renderHome,
    account: renderAccount,
    practice: renderPractice,
    tasks: renderStudentTasks,
    taskDetail: renderStudentTaskDetail,
    entryAssessment: renderEntryAssessment,
    chat: () => renderChatPage({ teacher: false }),
    detail: renderDetail,
    progress: renderProgress,
    teacher: renderTeacherDashboard,
    toneDrill: renderToneDrill,
    teachingClip: renderTeachingClip,
  };

  app.innerHTML = (views[state.currentView] || renderHome)();
  renderNav();

  requestAnimationFrame(() => {
    if (state.currentView === "detail") {
      drawToneChart();
      startCameraPreview();
    } else {
      stopCameraPreview();
    }
    if (state.currentView === "progress") drawProgressChart();
    if (state.currentView === "teachingClip" || (state.currentView === "detail" && state.teachingPlan)) {
      drawClipToneChart();
    }
  });
}

function syncSentenceInput() {
  const input = document.querySelector("#target-text");
  if (input instanceof HTMLInputElement && input.value !== state.targetText) {
    input.value = state.targetText;
  }
}

function drawLineChart(canvas, series, options = {}) {
  if (!canvas?.getContext) return;
  const context = canvas.getContext("2d");
  if (!context) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 320;
  const height = canvas.clientHeight || 124;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  context.scale(dpr, dpr);
  context.clearRect(0, 0, width, height);

  const padding = { top: 15, right: 13, bottom: 25, left: 13 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  context.lineWidth = 1;
  context.strokeStyle = "#ece8e0";
  for (let row = 0; row < 3; row += 1) {
    const y = padding.top + (innerHeight * row) / 2;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
  }

  series.forEach((item) => {
    context.beginPath();
    context.lineWidth = item.width ?? 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = item.color;
    item.values.forEach((value, index) => {
      const x =
        padding.left +
        (innerWidth * index) / Math.max(item.values.length - 1, 1);
      const y = padding.top + (innerHeight * value) / 100;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();

    if (item.points) {
      item.values.forEach((value, index) => {
        const x =
          padding.left +
          (innerWidth * index) / Math.max(item.values.length - 1, 1);
        const y = padding.top + (innerHeight * value) / 100;
        context.beginPath();
        context.fillStyle = item.color;
        context.arc(x, y, index === item.values.length - 1 ? 4 : 3, 0, Math.PI * 2);
        context.fill();
      });
    }
  });

  if (options.labels) {
    context.fillStyle = "#aaa6ad";
    context.font = "10px -apple-system, sans-serif";
    context.textAlign = "center";
    options.labels.forEach((label, index) => {
      const x =
        padding.left +
        (innerWidth * index) / Math.max(options.labels.length - 1, 1);
      context.fillText(label, x, height - 6);
    });
  }

  if (options.finalLabel) {
    context.fillStyle = options.finalLabel.color;
    context.font = "700 11px -apple-system, sans-serif";
    context.textAlign = "right";
    context.fillText(options.finalLabel.text, width - padding.right, 11);
  }
}

function drawToneChart() {
  const activeSyllables = getSyllables(state);
  const syllable = activeSyllables[state.selectedSyllable] ?? Object.values(activeSyllables)[0];
  drawLineChart(document.querySelector("#tone-chart"), [
    { values: syllable.targetTone, color: "#209a78", width: 3 },
    { values: syllable.currentTone, color: "#cf4b31", width: 3 },
  ]);
}

function drawClipToneChart() {
  const segment = state.teachingPlan?.segments?.[state.selectedClipSegmentIndex];
  if (segment?.type !== "tone") return;
  drawLineChart(document.querySelector("#clip-tone-chart"), [
    { values: segment.targetTone || [50, 50, 50, 50, 50, 50], color: "#209a78", width: 3 },
    { values: segment.currentTone || [50, 50, 50, 50, 50, 50], color: "#cf4b31", width: 3 },
  ]);
}

function pauseAllClipVideos() {
  document.querySelectorAll(".clip-video").forEach((video) => {
    video.pause?.();
  });
}

function drawProgressChart() {
  const progress = getProgressData(state);
  const min = 50;
  const max = 90;
  const normalized = progress.scores.map(
    (score) => (score > 0 ? 100 - ((score - min) / (max - min)) * 100 : 100),
  );
  const latestScore = [...progress.scores].reverse().find((score) => score > 0) || 0;
  drawLineChart(
    document.querySelector("#progress-chart"),
    [{ values: normalized, color: "#cf4b31", width: 3, points: true }],
    {
      labels: progress.labels,
      finalLabel: {
        text: latestScore ? `${latestScore} ` : "No Practice",
        color: "#cf4b31",
      },
    },
  );
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1800);
}

function clearTimers() {
  window.clearTimeout(recordingTimer);
  window.clearTimeout(playbackTimer);
  window.clearTimeout(textInfoTimer);
  recordingTimer = null;
  playbackTimer = null;
  textInfoTimer = null;
}

function scheduleClipAdvance() {
  window.clearTimeout(playbackTimer);
  if (!state.clipPlaying || !["teachingClip", "detail"].includes(state.currentView)) return;
  const count = state.teachingPlan?.segments?.length || 0;
  if (count <= 1) return;
  if (!count || state.selectedClipSegmentIndex >= count - 1) {
    state = reduceState(state, { type: "SET_CLIP_PLAYING", playing: false });
    render();
    return;
  }
  playbackTimer = window.setTimeout(() => {
    state = reduceState(state, { type: "NEXT_CLIP_SEGMENT" });
    render();
    scheduleClipAdvance();
  }, 5200);
}

async function startCameraPreview() {
  const mirror = document.querySelector("#mirror-area");
  if (!mirror) return;

  let video = mirror.querySelector("video");
  if (!video) {
    mirror.innerHTML = `<video autoplay muted playsinline aria-label="My Live Mirror"></video>`;
    video = mirror.querySelector("video");
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    mirror.innerHTML = `<span><strong>Cannot Open Camera</strong>This browser does not support camera preview.</span>`;
    return;
  }

  try {
    if (!cameraStream) {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
    }
    video.srcObject = cameraStream;
  } catch {
    mirror.innerHTML = `<span><strong>Camera Not Enabled</strong>Allow camera access before using mouth-shape comparison.</span>`;
  }
}

function stopCameraPreview() {
  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = null;
}

async function refreshTextInfo(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const response = await fetch(backendUrl(`/api/text-info?text=${encodeURIComponent(trimmed)}`));
  if (!response.ok) return;
  const info = await response.json();
  if (state.targetText.trim() !== trimmed) return;
  state = reduceState(state, { type: "APPLY_TEXT_INFO", info });
  render();
}

function scheduleTextInfo(text) {
  window.clearTimeout(textInfoTimer);
  textInfoTimer = window.setTimeout(() => {
    refreshTextInfo(text).catch(() => {
      // Keep typing smooth even if the backend is not ready yet.
    });
  }, 220);
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser does not support microphone recording. Use a current version of Chrome, Edge, or Safari.");
  }
  recordedChunks = [];
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(mediaStream);
  mediaRecorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) recordedChunks.push(event.data);
  });
  mediaRecorder.start();
}

function stopTracks() {
  mediaStream?.getTracks().forEach((track) => track.stop());
  mediaStream = null;
}

async function stopRecordingAndAnalyze() {
  if (!mediaRecorder || mediaRecorder.state === "inactive") return;
  const blob = await new Promise((resolve) => {
    mediaRecorder.addEventListener(
      "stop",
      () => resolve(new Blob(recordedChunks, { type: mediaRecorder.mimeType || "audio/webm" })),
      { once: true },
    );
    mediaRecorder.stop();
  });
  stopTracks();
  if (lastRecordingObjectUrl) URL.revokeObjectURL(lastRecordingObjectUrl);
  lastRecordingObjectUrl = URL.createObjectURL(blob);
  const persistentRecordingUrl = await blobToDataUrl(blob);
  await analyzeRecording(blob, persistentRecordingUrl);
}

async function analyzeRecording(blob, persistentRecordingUrl = "") {
  const form = new FormData();
  form.append("text", standardPronunciationText() || state.targetText.trim());
  form.append("audio", blob, "practice.webm");
  state = reduceState(state, { type: "ANALYZE_START" });
  render();

  const response = await fetch(backendUrl("/api/analyze"), { method: "POST", body: form });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Analysis failed. Confirm that the backend is running.");
  }
  state = reduceState(state, {
    type: "APPLY_ANALYSIS",
    result: payload,
    recordingUrl: persistentRecordingUrl || lastRecordingObjectUrl,
    clipManifest: pronunciationClipManifest,
  });
  render();
  showToast("Analysis complete. Results have been updated.");
}

function demoTeachingClipResult() {
  return {
    target_text: "光",
    pinyin_display: ["guang1"],
    communication_result: {
      readiness_score: 62,
      main_feedback: "The system found that final uang mouth-shape transition is the best focus for this practice.",
    },
    asr: {
      heard_text: "刚",
      text_similarity: 60,
    },
    pinyin_diagnosis: {
      method: "demo",
      issues: [
        {
          index: 0,
          type: "final",
          title: "Final uang needs to be more complete",
          summary: "The target final is uang. The movement from rounded lips to open mouth and final nasal ending is not stable yet.",
          focus: "Final uang",
          detail: "Start with rounded lips for u, open naturally into ang, then complete the final nasal ending.",
          practice: ["光", "广", "逛"],
        },
      ],
    },
    tone_timing: {
      overall_score: 62,
      boundary_confidence: "medium",
      syllables: [
        {
          index: 0,
          char: "光",
          pinyin: "guang1",
          pinyin_display: "guang1",
          initial: "g",
          final: "uang",
          tone: "1",
          tone_score: 70,
          feedback: "Tone 1 stays mostly steady. Focus first on the final mouth-shape transition.",
          tone_curve: {
            target: [50, 50, 50, 50, 50, 50],
            user: [45, 52, 48, 55, 50, 46],
            has_user_pitch: true,
          },
        },
      ],
    },
  };
}

function loadDemoTeachingClip() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("demoClip") !== "1") return false;
  state = reduceState(state, { type: "SELECT_ROLE", role: "student" });
  state = reduceState(state, { type: "SET_TARGET_TEXT", text: "?" });
  state = reduceState(state, {
    type: "APPLY_ANALYSIS",
    result: demoTeachingClipResult(),
    clipManifest: pronunciationClipManifest,
  });
  state = reduceState(state, { type: "NAVIGATE", view: "detail" });
  render();
  return true;
}

function setPlaying(copy) {
  window.clearTimeout(playbackTimer);
  state = reduceState(state, { type: "SET_PLAYING", playing: true });
  render();
  showToast(copy);
  playbackTimer = window.setTimeout(() => {
    state = reduceState(state, { type: "SET_PLAYING", playing: false });
    render();
  }, 1300);
}

function speakStandard(copy) {
  const text = standardPronunciationText();
  if (!text) {
    showToast("Enter the Mandarin sentence you want to practice first.");
    return;
  }

  window.clearTimeout(playbackTimer);
  standardAudio?.pause();
  standardAudio = null;

  if (state.currentView === "teachingClip") {
    speakStandardWithAi(copy, text);
    return;
  }

  if (state.standardAudioUrl) {
    standardAudio = new Audio(backendUrl(state.standardAudioUrl));
    state = reduceState(state, { type: "SET_PLAYING", playing: true });
    render();
    showToast(`${copy} (human standard audio)`);
    standardAudio.addEventListener("ended", () => {
      state = reduceState(state, { type: "SET_PLAYING", playing: false });
      render();
    });
    standardAudio.addEventListener("error", () => {
      state = reduceState(state, { type: "SET_PLAYING", playing: false });
      render();
      showToast("Human standard audio could not play. Switching to system Chinese speech.");
      state = reduceState(state, { type: "SET_PLAYING", playing: false });
      speakStandardWithTts(copy, text);
    }, { once: true });
    standardAudio.play().catch(() => speakStandardWithTts(copy, text));
    return;
  }

  speakStandardWithAi(copy, text);
}

async function fetchAiStandardAudio(text) {
  const response = await fetch(backendUrl("/api/tts"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "AI standard audio failed.");
  }
  return backendUrl(payload.audioUrl);
}

function speakStandardWithAi(copy, text) {
  state = reduceState(state, { type: "SET_PLAYING", playing: true });
  render();
  showToast("Generating AI standard audio.");

  fetchAiStandardAudio(text)
    .then((audioUrl) => {
      standardAudio?.pause();
      standardAudio = new Audio(audioUrl);
      standardAudio.addEventListener("ended", () => {
        state = reduceState(state, { type: "SET_PLAYING", playing: false });
        render();
      });
      standardAudio.addEventListener(
        "error",
        () => {
          state = reduceState(state, { type: "SET_PLAYING", playing: false });
          render();
          speakStandardWithTts(copy, text);
        },
        { once: true },
      );
      showToast(`${copy} (AI standard audio)`);
      return standardAudio.play();
    })
    .catch(() => {
      state = reduceState(state, { type: "SET_PLAYING", playing: false });
      render();
      speakStandardWithTts(copy, text);
    });
}

function speakStandardWithTts(copy, text) {
  if (!("speechSynthesis" in window)) {
    setPlaying("This browser does not support standard pronunciation playback.");
    return;
  }

  window.speechSynthesis.cancel();
  standardUtterance = new SpeechSynthesisUtterance(text);
  standardUtterance.lang = "zh-CN";
  standardUtterance.rate = 0.78;
  standardUtterance.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  standardUtterance.voice =
    voices.find((voice) => voice.lang === "zh-CN") ||
    voices.find((voice) => voice.lang.startsWith("zh")) ||
    null;

  state = reduceState(state, { type: "SET_PLAYING", playing: true });
  render();
  showToast(`${copy} (system Chinese speech)`);

  standardUtterance.onend = () => {
    state = reduceState(state, { type: "SET_PLAYING", playing: false });
    render();
  };
  standardUtterance.onerror = () => {
    state = reduceState(state, { type: "SET_PLAYING", playing: false });
    render();
    showToast("Standard pronunciation playback failed. Check browser sound settings.");
  };

  window.speechSynthesis.speak(standardUtterance);
}

function playSelfRecording() {
  if (!state.lastRecordingUrl) {
    showToast("No recording is available to replay yet.");
    return;
  }
  const audio = new Audio(state.lastRecordingUrl);
  audio.play().then(() => {
    showToast("Playing your recording.");
  }).catch(() => {
    showToast("Could not play your recording. Please record again.");
  });
}

function playSubmissionRecording(submissionId) {
  const submission = (state.taskSubmissions || []).find((item) => item.id === submissionId);
  if (!submission?.recordingUrl) {
    showToast("This submission has no playable recording.");
    return;
  }
  const audio = new Audio(submission.recordingUrl);
  audio.play().then(() => {
    showToast("Playing this task recording.");
  }).catch(() => {
    showToast("Could not play this recording. It may need to be resubmitted.");
  });
}

function handleAction(target) {
  const actionTarget = target.closest("[data-action]");
  const action = actionTarget?.dataset.action;
  if (!action) return false;

  if (action === "record") {
    if (state.recordingState === "complete") {
      state = reduceState(state, { type: "RESET_PRACTICE" });
      render();
      showToast("Practice reset. You can record again.");
      return true;
    }
    if (!state.targetText.trim()) {
      showToast("Enter the Mandarin sentence you want to practice first.");
      return true;
    }
    if (state.recordingState === "idle") {
      startRecording()
        .then(() => {
          state = reduceState(state, { type: "RECORD_START" });
          render();
          showToast("Recording. Read the sentence on screen.");
        })
        .catch((error) => {
          state = reduceState(state, { type: "ANALYZE_ERROR", message: error.message });
          render();
          showToast(error.message);
        });
      return true;
    }
    if (state.recordingState === "recording") {
      stopRecordingAndAnalyze().catch((error) => {
        stopTracks();
        state = reduceState(state, { type: "ANALYZE_ERROR", message: error.message });
        render();
        showToast(error.message);
      });
      return true;
    }
    return true;
  }

  if (action === "reset") {
    clearTimers();
    state = reduceState(state, { type: "RESET_PRACTICE" });
    stopTracks();
    scheduleTextInfo(state.targetText);
    render();
    showToast("Practice has been reset to the starting data.");
    return true;
  }

  if (action === "play" || action === "play-detail") {
    speakStandard(action === "play" ? "Playing reference pronunciation." : "Replaying standard pronunciation.");
    return true;
  }

  if (action === "generate-teaching-clip") {
    state = reduceState(state, {
      type: "GENERATE_TEACHING_CLIP",
      clipManifest: pronunciationClipManifest,
    });
    render();
    app.scrollTop = 0;
    showToast(state.currentView === "teachingClip"
      ? "Generated personalized teaching clip."
      : "This analysis did not find an item that needs a clip.");
    return true;
  }

  if (action === "clip-prev") {
    pauseAllClipVideos();
    clearTimers();
    state = reduceState(state, { type: "PREVIOUS_CLIP_SEGMENT" });
    render();
    return true;
  }

  if (action === "clip-segment") {
    pauseAllClipVideos();
    clearTimers();
    state = reduceState(state, {
      type: "SET_CLIP_SEGMENT",
      index: Number(actionTarget.dataset.clipSegment || 0),
    });
    render();
    return true;
  }

  if (action === "clip-next") {
    pauseAllClipVideos();
    clearTimers();
    state = reduceState(state, { type: "NEXT_CLIP_SEGMENT" });
    state = reduceState(state, { type: "SET_CLIP_PLAYING", playing: false });
    render();
    return true;
  }

  if (action === "clip-replay-standard") {
    speakStandard("Playing clip practice standard audio.");
    return true;
  }

  if (action === "play-self") {
    playSelfRecording();
    return true;
  }

  if (action === "play-submission") {
    playSubmissionRecording(actionTarget.dataset.submissionId);
    return true;
  }

  if (action === "open-review-editor") {
    state = reduceState(state, {
      type: "NAVIGATE_TEACHER",
      view: "reviewEditor",
      submissionId: actionTarget.dataset.reviewEditor,
    });
    render();
    app.scrollTop = 0;
    showToast("Opened the feedback editor for this recording.");
    return true;
  }

  if (action === "toggle-period") {
    showToast("Progress now shows your real practice records.");
    return true;
  }

  if (action === "teacher-task-placeholder") {
    showToast("Task pack generated. Publish/save will be connected in the next stage.");
    return true;
  }

  if (action === "start-entry-assessment") {
    state = reduceState(state, { type: "START_ENTRY_ASSESSMENT" });
    render();
    app.scrollTop = 0;
    showToast("Entry assessment started. Record each item one by one.");
    return true;
  }

  if (action === "complete-assessment-item") {
    state = reduceState(state, { type: "COMPLETE_ASSESSMENT_ITEM" });
    render();
    showToast("This item is recorded. Continue to the next item.");
    return true;
  }

  if (action === "assessment-record") {
    if (state.modelStatus === "analyzing") return true;
    if (state.recordingState === "recording") {
      stopRecordingAndAnalyze().catch((error) => {
        stopTracks();
        state = reduceState(state, { type: "ANALYZE_ERROR", message: error.message });
        render();
        showToast(error.message);
      });
      return true;
    }
    const currentItem = getEntryAssessmentItems()[state.assessmentSession?.currentIndex || 0];
    if (currentItem?.prompt && state.targetText !== currentItem.prompt) {
      state = reduceState(state, { type: "SET_TARGET_TEXT", text: currentItem.prompt });
    }
    startRecording()
      .then(() => {
        state = reduceState(state, { type: "RECORD_START" });
        render();
        showToast("Recording. Read this item.");
      })
      .catch((error) => {
        state = reduceState(state, { type: "ANALYZE_ERROR", message: error.message });
        render();
        showToast(error.message);
      });
    return true;
  }

  if (action === "task-record") {
    const taskId = actionTarget.dataset.taskPractice || state.selectedTaskId;
    const exerciseId = actionTarget.dataset.taskExercise || state.activeTaskExerciseId || "";
    const itemIndex = Number(actionTarget.dataset.taskItemIndex || state.activeTaskItemIndex || 0);
    if (state.modelStatus === "analyzing") return true;
    if (state.activeTaskPracticeId !== taskId || state.activeTaskExerciseId !== exerciseId || state.activeTaskItemIndex !== itemIndex || state.recordingState === "complete") {
      state = reduceState(state, { type: "START_TASK_PRACTICE", taskId, exerciseId, itemIndex });
      render();
      scheduleTextInfo(state.targetText);
    }
    if (!state.targetText.trim()) {
      showToast("This practice pack does not have a recordable target sentence yet.");
      return true;
    }
    if (state.recordingState === "recording") {
      stopRecordingAndAnalyze().catch((error) => {
        stopTracks();
        state = reduceState(state, { type: "ANALYZE_ERROR", message: error.message });
        render();
        showToast(error.message);
      });
      return true;
    }
    startRecording()
      .then(() => {
        state = reduceState(state, { type: "RECORD_START" });
        render();
        showToast("Recording. Read the practice pack target sentence.");
      })
      .catch((error) => {
        state = reduceState(state, { type: "ANALYZE_ERROR", message: error.message });
        render();
        showToast(error.message);
      });
    return true;
  }

  if (action === "save-task-step") {
    const taskId = actionTarget.dataset.taskPractice || state.selectedTaskId;
    const exerciseId = actionTarget.dataset.taskExercise || state.activeTaskExerciseId || "";
    const itemIndex = Number(actionTarget.dataset.taskItemIndex || state.activeTaskItemIndex || 0);
    state = reduceState(state, {
      type: "SAVE_TASK_STEP",
      taskId,
      exerciseId,
      itemIndex,
      keepExerciseActive: true,
      nextItemIndex: itemIndex + 1,
      recordingUrl: state.lastRecordingUrl,
      result: state.analysisResult,
    });
    render();
    showToast("This step is saved. Continue to the next step.");
    return true;
  }

  if (action === "submit-task-to-teacher") {
    const taskId = actionTarget.dataset.taskPractice || state.selectedTaskId;
    const beforeCount = state.taskSubmissions.length;
    state = reduceState(state, { type: "SUBMIT_TASK_TO_TEACHER", taskId });
    render();
    showToast(state.taskSubmissions.length > beforeCount ? "Task submitted to teacher." : "Complete all task steps first.");
    return true;
  }

  if (action === "return-task-steps") {
    state = {
      ...state,
      activeTaskPracticeId: "",
      activeTaskExerciseId: "",
      recordingState: "idle",
      modelStatus: "idle",
      recordingError: "",
    };
    render();
    app.scrollTop = 0;
    return true;
  }

  if (action === "save-teacher-student-summary") {
    const studentId = actionTarget.dataset.studentId || state.selectedTeacherStudentId;
    const summary = app.querySelector("[data-field=\"teacher-student-summary\"]")?.value || "";
    state = reduceState(state, {
      type: "UPDATE_TEACHER_STUDENT_SUMMARY",
      studentId,
      summary,
    });
    render();
    showToast("Learning profile note saved.");
    return true;
  }

  if (action === "edit-teacher-student-summary") {
    state = reduceState(state, {
      type: "EDIT_TEACHER_STUDENT_SUMMARY",
      studentId: target.dataset.studentId || state.selectedTeacherStudentId,
    });
    render();
    showToast("Stage note is ready to edit.");
    return true;
  }

  if (action === "add-task-step") {
    const list = app.querySelector("[data-step-editor-list]");
    if (!list) return true;
    const index = list.querySelectorAll("[data-step-editor-card]").length;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = renderTeacherStepEditor({
      id: `custom-${index + 1}`,
      type: "Practice",
      title: "New Practice Step",
      instruction: "Complete this step from your teacher.",
      targetText: "",
      requiredCount: 1,
      sourceMode: "custom",
      practiceItems: [],
    }, index);
    const article = wrapper.firstElementChild;
    list.append(article);
    renumberTeacherStepCards(list);
    article.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return true;
  }

  if (action === "start-new-teacher-task") {
    const studentId = app.querySelector('[data-field="new-task-student"]')?.value || state.selectedTeacherStudentId;
    state = reduceState(state, { type: "SELECT_TEACHER_STUDENT", studentId });
    state = reduceState(state, { type: "START_NEW_TEACHER_TASK" });
    render();
    app.scrollTop = 0;
    showToast("Opened a new task template.");
    return true;
  }

  if (action === "delete-task-step") {
    const card = target.closest("[data-step-editor-card]");
    const list = target.closest("[data-step-editor-list]");
    if (!card || !list) return true;
    const cards = list.querySelectorAll("[data-step-editor-card]");
    if (cards.length <= 1) {
      showToast("Keep at least one task step.");
      return true;
    }
    card.remove();
    renumberTeacherStepCards(list);
    showToast("Deleted this task step.");
    return true;
  }

  if (action === "set-step-source") {
    const card = target.closest("[data-step-editor-card]");
    if (!card) return true;
    const mode = target.dataset.sourceMode === "bank" ? "bank" : "custom";
    card.dataset.stepMode = mode;
    card.querySelectorAll("[data-source-mode]").forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.sourceMode === mode);
    });
    const panel = card.querySelector("[data-bank-panel]");
    if (panel) panel.hidden = mode !== "bank";
    if (mode === "bank") {
      applyQuestionBankToStepCard(card, card.querySelector('[data-step-field="bankPackageId"]')?.value);
    }
    return true;
  }

  if (action === "complete-entry-assessment") {
    state = reduceState(state, { type: "COMPLETE_ENTRY_ASSESSMENT" });
    render();
    showToast("Entry assessment profile generated. Waiting for teacher confirmation.");
    return true;
  }

  if (action === "publish-assessment-task") {
    const exerciseSet = Array.from(app.querySelectorAll("[data-step-editor-card]")).map((card, index) => {
      const practiceItems = practiceItemsFromStepCard(card);
      return {
        id: `assessment-step-${index + 1}`,
        type: card.querySelector('[data-step-field="type"]')?.value || "Practice",
        title: card.querySelector('[data-step-field="title"]')?.value || `Task Step ${index + 1}`,
        instruction: card.querySelector('[data-step-field="instruction"]')?.value || "Complete this step from your teacher.",
        targetText: practiceItems[0] || "",
        requiredCount: card.querySelector('[data-step-field="requiredCount"]')?.value || "1",
        requiresSubmission: Boolean(card.querySelector('[data-step-field="requiresSubmission"]')?.checked),
        sourceMode: card.dataset.stepMode === "bank" ? "bank" : "custom",
        bankPackageId: card.querySelector('[data-step-field="bankPackageId"]')?.value || "",
        practiceItems,
      };
    });
    const edits = {
      recommendation: app.querySelector('[data-field="assessment-recommendation"]')?.value || "",
      title: app.querySelector('[data-field="assessment-task-title"]')?.value || "",
      practiceText: exerciseSet.flatMap((exercise) => exercise.practiceItems).filter(Boolean)[0] || "",
      repeatCount: exerciseSet[0]?.requiredCount || "1",
      requiredSubmissions: exerciseSet.filter((exercise) => exercise.requiresSubmission).length || 1,
      items: exerciseSet.map((exercise, index) => `${index + 1}. ${exercise.title}`),
      exerciseSet,
      teacherNote: app.querySelector('[data-field="assessment-teacher-note"]')?.value || "",
    };
    state = reduceState(state, { type: "PUBLISH_ASSESSMENT_TASK", edits });
    render();
    showToast("Teacher-edited initial practice task published to learner.");
    return true;
  }

  if (action === "publish-recommended-task") {
    const exerciseSet = Array.from(app.querySelectorAll("[data-step-editor-card]")).map((card, index) => {
      const practiceItems = practiceItemsFromStepCard(card);
      return {
        id: `step-${index + 1}`,
        type: card.querySelector('[data-step-field="type"]')?.value || "Practice",
        title: card.querySelector('[data-step-field="title"]')?.value || `Task Step ${index + 1}`,
        instruction: card.querySelector('[data-step-field="instruction"]')?.value || "Complete this step from your teacher.",
        targetText: practiceItems[0] || "",
        requiredCount: card.querySelector('[data-step-field="requiredCount"]')?.value || "1",
        requiresSubmission: Boolean(card.querySelector('[data-step-field="requiresSubmission"]')?.checked),
        sourceMode: card.dataset.stepMode === "bank" ? "bank" : "custom",
        bankPackageId: card.querySelector('[data-step-field="bankPackageId"]')?.value || "",
        practiceItems,
      };
    });
    const edits = {
      title: app.querySelector('[data-field="recommended-task-title"]')?.value || "",
      goal: app.querySelector('[data-field="recommended-task-goal"]')?.value || "",
      practiceText: exerciseSet.flatMap((exercise) => exercise.practiceItems).filter(Boolean)[0] || "",
      suggestedDue: "",
      repeatCount: exerciseSet[0]?.requiredCount || "1",
      requiredSubmissions: exerciseSet.filter((exercise) => exercise.requiresSubmission).length || 1,
      items: exerciseSet.map((exercise, index) => `${index + 1}. ${exercise.title}`),
      exerciseSet,
      teacherNote: app.querySelector('[data-field="recommended-teacher-note"]')?.value || "",
    };
    state = reduceState(state, { type: "PUBLISH_RECOMMENDED_TASK", edits });
    state = reduceState(state, { type: "NAVIGATE_TEACHER", view: "tasks" });
    render();
    showToast("Teacher-reviewed practice task published to learner.");
    return true;
  }

  if (action === "login-account") {
    const username = app.querySelector('[data-field="login-username"]')?.value || "";
    const password = app.querySelector('[data-field="login-password"]')?.value || "";
    const role = app.querySelector('input[name="login-role"]:checked')?.value || "";
    if (!["student", "teacher"].includes(role)) {
      showToast("Choose learner or teacher role first.");
      return true;
    }
    state = reduceState(state, {
      type: "LOGIN_ACCOUNT",
      username,
      password,
      displayName: username || state.account?.displayName || "",
    });
    state = reduceState(state, { type: "SELECT_ROLE", role });
    state = role === "teacher"
      ? reduceState(state, { type: "NAVIGATE_TEACHER", view: "home" })
      : reduceState(state, { type: "NAVIGATE", view: "practice" });
    render();
    app.scrollTop = 0;
    showToast(role === "teacher" ? "Logged in as teacher." : "Logged in as learner.");
    return true;
  }

  if (action === "logout-account") {
    state = reduceState(state, { type: "LOGOUT_ACCOUNT" });
    render();
    showToast("Logged out.");
    return true;
  }

  if (action === "send-chat-message") {
    const input = app.querySelector('[data-field="chat-message"]');
    state = reduceState(state, { type: "SEND_CHAT_MESSAGE", body: input?.value || "" });
    render();
    showToast("Message sent.");
    return true;
  }

  if (action === "create-class-chat") {
    const title = app.querySelector('[data-field="class-chat-title"]')?.value?.trim() || "New Class Group";
    const memberIds = Array.from(app.querySelectorAll('[data-field="class-chat-student"]:checked'))
      .map((input) => input.value)
      .filter(Boolean);
    if (!memberIds.length) {
      showToast("Choose at least one learner for the group.");
      return true;
    }
    state = reduceState(state, { type: "CREATE_CLASS_CHAT", title, memberIds });
    render();
    showToast("Class group created.");
    return true;
  }

  if (action === "create-direct-chat") {
    const studentId = app.querySelector('[data-field="direct-chat-student"]')?.value || state.selectedTeacherStudentId;
    state = reduceState(state, { type: "CREATE_DIRECT_CHAT", studentId });
    render();
    showToast("Learner chat created.");
    return true;
  }

  if (action === "create-student-direct-chat") {
    state = reduceState(state, { type: "CREATE_STUDENT_DIRECT_CHAT" });
    render();
    showToast("Teacher chat opened.");
    return true;
  }

  if (action === "delete-chat-thread") {
    const threadId = target.dataset.chatThreadAction;
    const thread = (state.chatThreads || []).find((item) => item.id === threadId);
    if (!threadId || !thread) return true;
    const label = thread.type === "class" ? "Group" : "Conversation";
    const confirmed = window.confirm(`Delete "${thread.title}" ${label}? Chat history will be removed from the local demo data.`);
    if (!confirmed) return true;
    state = reduceState(state, { type: "DELETE_CHAT_THREAD", threadId });
    render();
    app.scrollTop = 0;
    showToast(thread.type === "class" ? "Group deleted." : "Conversation deleted.");
    return true;
  }

  if (action === "chat-back") {
    state = { ...state, chatMode: "list" };
    render();
    app.scrollTop = 0;
    return true;
  }

  if (action === "return-task-detail") {
    state = {
      ...state,
      currentRole: "student",
      currentView: "taskDetail",
      taskDetailMode: false,
    };
    render();
    app.scrollTop = 0;
    return true;
  }

  return false;
}

function handleClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (handleAction(target)) return;

  const roleButton = target.closest("[data-role]");
  if (roleButton) {
    clearTimers();
    stopCameraPreview();
    state = reduceState(state, {
      type: "SELECT_ROLE",
      role: roleButton.dataset.role,
    });
    render();
    app.scrollTop = 0;
    return;
  }

  const teacherViewButton = target.closest("[data-teacher-view]");
  if (teacherViewButton) {
    clearTimers();
    stopCameraPreview();
    state = reduceState(state, {
      type: "NAVIGATE_TEACHER",
      view: teacherViewButton.dataset.teacherView,
      studentFilter: teacherViewButton.dataset.teacherFilter,
    });
    render();
    app.scrollTop = 0;
    return;
  }

  const viewButton = target.closest("[data-view]");
  if (viewButton) {
    clearTimers();
    if (viewButton.dataset.view !== "detail") stopCameraPreview();
    if (viewButton.dataset.view === "tasks") {
      state = {
        ...state,
        taskDetailMode: false,
        activeTaskPracticeId: "",
        activeTaskExerciseId: "",
        activeTaskItemIndex: 0,
        recordingState: "idle",
        modelStatus: "idle",
      };
    }
    if (viewButton.dataset.view === "practice" && state.activeTaskPracticeId) {
      state = reduceState(state, { type: "RESTORE_CUSTOM_PRACTICE" });
      render();
      scheduleTextInfo(state.targetText);
      app.scrollTop = 0;
      return;
    }
    state = { ...state, taskDetailMode: false };
    state = reduceState(state, {
      type: "NAVIGATE",
      view: viewButton.dataset.view,
    });
    render();
    app.scrollTop = 0;
    return;
  }

  const studentTaskButton = target.closest("[data-student-task]");
  if (studentTaskButton) {
    clearTimers();
    state = { ...state, taskDetailMode: false };
    state = reduceState(state, {
      type: "SELECT_STUDENT_TASK",
      taskId: studentTaskButton.dataset.studentTask,
    });
    render();
    app.scrollTop = 0;
    showToast("Opened task details.");
    return;
  }

  const progressDateButton = target.closest("[data-progress-date]");
  if (progressDateButton) {
    state = reduceState(state, {
      type: "SELECT_PROGRESS_DATE",
      date: progressDateButton.dataset.progressDate,
    });
    render();
    requestAnimationFrame(drawProgressChart);
    return;
  }

  const taskPracticeButton = target.closest("[data-task-practice]");
  if (taskPracticeButton && !target.closest('[data-action="task-record"]')) {
    clearTimers();
    state = reduceState(state, {
      type: "START_TASK_PRACTICE",
      taskId: taskPracticeButton.dataset.taskPractice,
      exerciseId: taskPracticeButton.dataset.taskExercise || "",
      itemIndex: Number(taskPracticeButton.dataset.taskItemIndex || 0),
    });
    render();
    scheduleTextInfo(state.targetText);
    app.scrollTop = 0;
    showToast("Entered recording practice for this task.");
    return;
  }

  const chatThreadButton = target.closest("[data-chat-thread]");
  if (chatThreadButton) {
    state = reduceState(state, {
      type: "SELECT_CHAT_THREAD",
      threadId: chatThreadButton.dataset.chatThread,
    });
    render();
    return;
  }

  const chatEmojiButton = target.closest("[data-chat-emoji]");
  if (chatEmojiButton) {
    state = reduceState(state, {
      type: "SEND_CHAT_MESSAGE",
      body: chatEmojiButton.dataset.chatEmoji,
    });
    render();
    return;
  }

  const syllableButton = target.closest("[data-syllable]");
  if (syllableButton) {
    clearTimers();
    state = { ...state, taskDetailMode: false };
    state = reduceState(state, {
      type: "SELECT_SYLLABLE",
      syllableId: syllableButton.dataset.syllable,
      clipManifest: pronunciationClipManifest,
    });
    const activeSyllables = getSyllables(state);
    render();
    app.scrollTop = 0;
    showToast(`Viewing pronunciation details for "${activeSyllables[state.selectedSyllable].character}".`);
    return;
  }

  const taskSyllableButton = target.closest("[data-task-syllable]");
  if (taskSyllableButton) {
    const latestSubmission = getLatestTaskSubmission(state);
    const syllables = latestSubmission?.syllables || {};
    if (!syllables[taskSyllableButton.dataset.taskSyllable]) return;
    state = {
      ...state,
      currentView: "detail",
      selectedSyllable: taskSyllableButton.dataset.taskSyllable,
      taskDetailMode: true,
    };
    render();
    app.scrollTop = 0;
    return;
  }

  const teacherStudentButton = target.closest("[data-teacher-student]");
  if (teacherStudentButton) {
    state = reduceState(state, {
      type: "SELECT_TEACHER_STUDENT",
      studentId: teacherStudentButton.dataset.teacherStudent,
    });
    render();
    app.scrollTop = 0;
    showToast("Switched learner pronunciation profile.");
    return;
  }

  const reviewSubmissionButton = target.closest("[data-review-submission]");
  if (reviewSubmissionButton) {
    const submissionId = reviewSubmissionButton.dataset.reviewSubmission;
    const scoreInput = app.querySelector(`[data-review-score="${CSS.escape(submissionId)}"]`);
    const feedbackInput = app.querySelector(`[data-review-feedback="${CSS.escape(submissionId)}"]`);
    state = reduceState(state, {
      type: "REVIEW_TASK_SUBMISSION",
      submissionId,
      teacherScore: scoreInput?.value,
      feedback: feedbackInput?.value || "This is closer to the target than last time. Keep slowing down the focus sound. Your teacher can see your progress.",
    });
    render();
    app.scrollTop = 0;
    showToast("Teacher feedback saved. The learner can see it.");
    return;
  }

  const copyReportButton = target.closest("[data-copy-report]");
  if (copyReportButton) {
    navigator.clipboard?.writeText(copyReportButton.dataset.copyReport || "")
      .then(() => showToast("Mandarin progress report draft copied."))
      .catch(() => showToast("This browser does not support automatic copying. Select the report text manually."));
    return;
  }

  const tipButton = target.closest("[data-tip]");
  if (tipButton) {
    state = reduceState(state, {
      type: "SELECT_TIP",
      tipId: tipButton.dataset.tip,
    });
    render();
    showToast(`Selected "${tipButton.querySelector(".tip-title").textContent}" suggestion.`);
    return;
  }

  const setTextButton = target.closest("[data-set-text]");
  if (setTextButton) {
    const text = setTextButton.dataset.setText || "";
    clearTimers();
    state = reduceState(state, {
      type: "SET_TARGET_TEXT",
      text,
      returnToToneDrill: state.currentView === "toneDrill",
    });
    state = reduceState(state, { type: "NAVIGATE", view: "practice" });
    render();
    scheduleTextInfo(text);
    app.scrollTop = 0;
    showToast(`Switched to focused practice for "${text}".`);
    return;
  }

  const toneDrillButton = target.closest("[data-tone-drill]");
  if (toneDrillButton) {
    state = reduceState(state, {
      type: "SET_TONE_DRILL",
      tone: toneDrillButton.dataset.toneDrill,
    });
    render();
    app.scrollTop = 0;
    return;
  }

  const wordButton = target.closest("[data-word]");
  if (wordButton) {
    showToast(
      `${wordButton.dataset.word}：${wordButton.dataset.score} ，${wordButton.dataset.status}.`,
    );
  }
}

function handleInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.dataset.field === "target-text") {
    state = reduceState(state, { type: "SET_TARGET_TEXT", text: target.value });
    if (!isComposingText) scheduleTextInfo(target.value);
  }
}

function handleChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) return;
  if (target.dataset.stepField === "bankPackageId") {
    const card = target.closest("[data-step-editor-card]");
    if (card) {
      card.dataset.stepMode = "bank";
      card.querySelectorAll("[data-source-mode]").forEach((button) => {
        button.classList.toggle("is-selected", button.dataset.sourceMode === "bank");
      });
      const panel = card.querySelector("[data-bank-panel]");
      if (panel) panel.hidden = false;
      applyQuestionBankToStepCard(card, target.value);
    }
    return;
  }
  if (!(target instanceof HTMLInputElement)) return;
  if (target.name === "login-role") {
    state = reduceState(state, { type: "SELECT_ROLE", role: target.value });
    state = { ...state, currentView: "account" };
    render();
    return;
  }
  if (target.dataset.field !== "avatar-file") return;
  const file = target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    state = reduceState(state, { type: "UPDATE_AVATAR", avatarDataUrl: String(reader.result || "") });
    render();
    showToast("Avatar updated.");
  });
  reader.readAsDataURL(file);
}

function handleKeydown(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.dataset.field !== "chat-message" || event.key !== "Enter") return;
  event.preventDefault();
  state = reduceState(state, { type: "SEND_CHAT_MESSAGE", body: target.value || "" });
  render();
}

function handleChatContextMenu(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const threadButton = target.closest("[data-chat-thread]");
  if (!threadButton || state.currentRole !== "student" || state.currentView !== "chat") return;
  event.preventDefault();
  const threadId = threadButton.dataset.chatThread;
  const thread = (state.chatThreads || []).find((item) => item.id === threadId);
  if (!threadId || !thread) return;
  const label = thread.type === "class" ? "Group" : "Direct Chat";
  const confirmed = window.confirm(`Delete "${thread.title}" ${label}? This chat will be removed from the learner list.`);
  if (!confirmed) return;
  state = reduceState(state, { type: "DELETE_CHAT_THREAD", threadId });
  render();
  app.scrollTop = 0;
  showToast(`${label} deleted.`);
}

function handleTouchStart(event) {
  const row = event.target instanceof Element ? event.target.closest(".wechat-thread-row") : null;
  if (!row || !event.touches.length) return;
  const touch = event.touches[0];
  chatSwipeState = {
    row,
    startX: touch.clientX,
    startY: touch.clientY,
  };
}

function handleTouchEnd(event) {
  if (!chatSwipeState || !event.changedTouches.length) return;
  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - chatSwipeState.startX;
  const deltaY = touch.clientY - chatSwipeState.startY;
  if (Math.abs(deltaX) > 36 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
    document.querySelectorAll(".wechat-thread-row.is-actions-open").forEach((row) => {
      if (row !== chatSwipeState.row) row.classList.remove("is-actions-open");
    });
    chatSwipeState.row.classList.toggle("is-actions-open", deltaX < 0);
  }
  chatSwipeState = null;
}

function handleCompositionStart(event) {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.dataset.field === "target-text") {
    isComposingText = true;
  }
}

function handleCompositionEnd(event) {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.dataset.field === "target-text") {
    isComposingText = false;
    state = reduceState(state, { type: "SET_TARGET_TEXT", text: target.value });
    scheduleTextInfo(target.value);
  }
}

document.addEventListener("click", handleClick);
document.addEventListener("input", handleInput);
document.addEventListener("change", handleChange);
document.addEventListener("keydown", handleKeydown);
document.addEventListener("contextmenu", handleChatContextMenu);
document.addEventListener("touchstart", handleTouchStart, { passive: true });
document.addEventListener("touchend", handleTouchEnd, { passive: true });
document.addEventListener("compositionstart", handleCompositionStart);
document.addEventListener("compositionend", handleCompositionEnd);
window.speechSynthesis?.addEventListener?.("voiceschanged", () => {});
window.addEventListener("resize", () => {
  if (state.currentView === "detail") drawToneChart();
  if (state.currentView === "progress") drawProgressChart();
});

loadStoredState();
loadPronunciationClipManifest().finally(() => {
  if (!loadDemoTeachingClip()) {
    render();
    scheduleTextInfo(state.targetText);
  }
  syncSentenceInput();
  window.clearInterval(clockTimer);
  clockTimer = window.setInterval(() => {
    const active = document.activeElement;
    const isTyping = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
    if (!isTyping) render();
  }, 30000);
});
