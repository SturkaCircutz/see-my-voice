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
  buildRehabWeeklyReport,
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
const STORAGE_KEY = "see-my-voice-practice-state";
const STUDENT_NAV_ITEMS = [
  { view: "practice", label: "\u7ec3\u4e60", index: "01" },
  { view: "tasks", label: "\u4efb\u52a1", index: "02" },
  { view: "progress", label: "\u8fdb\u5ea6", index: "03" },
  { view: "chat", label: "\u804a\u5929", index: "04" },
  { view: "account", label: "\u6211\u7684", index: "05" },
];
const TEACHER_NAV_ITEMS = [
  { view: "home", label: "\u9996\u9875", index: "01" },
  { view: "students", label: "\u5b66\u751f", index: "02" },
  { view: "tasks", label: "\u4efb\u52a1", index: "03" },
  { view: "reviews", label: "\u6279\u6539", index: "04" },
  { view: "chat", label: "\u804a\u5929", index: "05" },
  { view: "account", label: "\u7528\u6237", index: "06" },
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
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function statusTime() {
  return formatClock();
}

function avatarMarkup(label, src = "", className = "avatar") {
  const initials = String(label || "用").slice(0, 1);
  return src
    ? `<img class="${className}" src="${escapeHtml(src)}" alt="${escapeHtml(label)}头像">`
    : `<span class="${className}" aria-hidden="true">${escapeHtml(initials)}</span>`;
}

function threadTypeLabel(thread) {
  return thread?.type === "class" ? "班级群聊" : "老师私聊";
}

function threadLastMessage(thread) {
  return (thread?.messages || []).at(-1) || null;
}

function chatThreadDisplayTitle(thread, role, appState = state) {
  if (!thread || thread.type === "class") return thread?.title || "班级群聊";
  if (role === "student") return appState.teacherDashboard?.teacherName || "王老师";
  const studentId = (thread.memberIds || []).find((id) => id !== "teacher-main");
  const student = getTeacherStudents(appState).find((item) => item.id === studentId);
  return student?.name || thread.title || "学生私聊";
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
  if (initial) units.push({ kind: "声母", unit: initial });
  if (final && final !== initial) units.push({ kind: "韵母", unit: final });
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
  const title = imageType === "mouth" ? "嘴形" : "舌位";
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
      alt="${escapeHtml(syllable.character)} ${escapeHtml(label)} 的${title}参考图"
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
  { name: "综合", value: state.score },
  { name: "声调", value: state.pitchScore },
  { name: "清晰度", value: state.clarityScore },
  { name: "节奏", value: state.rhythmScore },
];

const taskScoreItems = (submission) => [
  { name: "综合", value: submission?.aiScores?.overall ?? 0 },
  { name: "声调", value: submission?.aiScores?.tone ?? 0 },
  { name: "清晰度", value: submission?.aiScores?.clarity ?? 0 },
  { name: "节奏", value: submission?.aiScores?.rhythm ?? submission?.rhythmScore ?? 0 },
];

const taskGoalMarkup = (goal) => {
  const text = String(goal || "").trim();
  if (text === "先稳定起音动作，再接入词语和短句。") return "";
  return text ? `<p>${escapeHtml(text)}</p>` : "";
};

const splitDiagnosisSummary = (summary) => {
  const text = String(summary || "").trim();
  const marker = "。声母和韵母接近";
  if (!text.includes(marker)) return [text].filter(Boolean);
  const [first, rest] = text.split(marker);
  return [`${first}。`, `声母和韵母接近${rest}`].filter(Boolean);
};

const trimDiagnosisDetail = (detail) => {
  const text = String(detail || "").trim();
  const firstSentence = text.match(/^[^。！？]+[。！？]/);
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
  const targetCharacter = syllable?.character || issue.practice?.[0] || "这个音";
  const targetPinyin = syllable?.pinyinDisplay || syllable?.pinyin || diagnosis?.target_pinyin?.[issue.index] || "";
  const heardCharacter = heardCharacterForIssue(diagnosis, issue) || "这个音";
  const heardPinyin = diagnosis?.heard_pinyin?.[issue.index] || "";
  const toneNumber = toneNumberFromSyllable(syllable, issue);
  const isToneIssue = issue.type === "tone" || issue.type === "syllable" || /整音节|声调|T[1-5]/.test(String(issue.focus || issue.title || ""));

  if (isToneIssue && targetPinyin && heardPinyin) {
    return [
      `目标是 ${targetCharacter} / ${targetPinyin}，系统听成了 ${heardCharacter} / ${heardPinyin}。`,
      "声母和韵母接近，主要差异在声调",
      "对照声调趋势线练习高低变化。",
    ];
  }

  if (summaryLines.length) {
    return [
      ...summaryLines,
      trimDiagnosisDetail(issue.detail),
    ].filter(Boolean);
  }

  return [
    toneNumber ? `第${toneNumber}声调可能存在问题。` : `${issue.focus || issue.title || "这个音"}可能存在问题。`,
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
      label: "准备",
      detail: "确认目标句",
      state: hasText ? "done" : "current",
    },
    {
      label: "录音",
      detail: state.recordingState === "recording" ? "说完点完成" : "读出句子",
      state: state.recordingState === "recording"
        ? "current"
        : state.recordingState === "complete"
          ? "done"
          : "pending",
    },
    {
      label: "分析",
      detail: state.modelStatus === "analyzing" ? "正在听辨" : "生成反馈",
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
      title: "这次没有稳定完成分析",
      body: state.recordingError || "请检查麦克风权限或重新录一遍，系统会保留当前练习句。",
      action: "重新录音",
    };
  }
  if (state.modelStatus === "analyzing") {
    return {
      tone: "working",
      title: "正在分析你的发音",
      body: "先不要离开页面。完成后会显示总分、拼音诊断和最需要练的音节。",
      action: "等待结果",
    };
  }
  if (state.recordingState === "recording") {
    return {
      tone: "working",
      title: "保持自然语速读完整句",
      body: "说完后点击录音按钮结束。尽量让每个声调有完整起伏。",
      action: "完成录音",
    };
  }
  if (state.modelStatus === "complete") {
    const focusName = focusSyllable
      ? `“${focusSyllable.character}” ${focusSyllable.pinyinDisplay || focusSyllable.pinyin}`
      : "重点音节";
    return {
      tone: focusSyllable?.level === "focus" ? "focus" : "good",
      title: state.score >= 85 ? "整体已经比较清楚" : "先抓一个最影响听懂的点",
      body: focusSyllable
        ? `${focusName} 是本轮最值得复盘的音节。先看嘴型和舌位，再回到练习页重录一次。`
        : "本轮分析完成。可以回听自己的录音，再进行下一次练习。",
      action: focusSyllable ? `查看“${focusSyllable.character}”详情` : "查看详情",
    };
  }
  return {
    tone: "ready",
    title: "准备好后开始第一遍录音",
    body: "先读一遍目标句，再点开始录音。录完后系统会把问题拆成拼音、声调和音节反馈。",
    action: "开始录音",
  };
}

function diagnosisIssueSummary(issue) {
  const syllable = Object.values(getSyllables(state)).find((item) => Number(item.index) === Number(issue.index));
  const character = syllable?.character || issue.practice?.[0] || "这个音";
  const toneNumber = toneNumberFromSyllable(syllable, issue);
  const toneText = toneNumber ? `第${toneNumber}声调` : "";
  const typeText = issue.type === "initial"
    ? "声母"
    : issue.type === "final"
      ? "韵母"
      : issue.type === "tone"
        ? "声调"
        : "发音";
  return {
    character,
    shortIssue: toneText
      ? `${toneText}可能存在问题`
      : `${issue.focus || typeText}可能存在问题`,
    label: toneText || issue.focus || issue.title || "发音重点",
  };
}

function renderPinyinDiagnosis() {
  const diagnosis = state.pinyinDiagnosis;
  if (!diagnosis) {
    return `
      <section class="panel diagnosis-card" aria-label="拼音诊断">
        <span class="model-kicker">拼音诊断</span>
        <strong>录音后显示可能不准的音</strong>
        <p>系统会根据你的录音给出发音反馈，指出可能影响别人听懂的声母、韵母或声调。</p>
      </section>
    `;
  }

  const issues = diagnosis.issues || [];
  return `
    <section class="panel diagnosis-card" aria-label="拼音诊断">
      <span class="model-kicker">拼音诊断</span>
      <strong>${issues.length ? `发现 ${issues.length} 个需要关注的音` : escapeHtml(diagnosis.summary)}</strong>
      <p>目标：${escapeHtml((diagnosis.target_pinyin || []).join(" "))}　听到：${escapeHtml((diagnosis.heard_pinyin || []).join(" ") || "未稳定听清")}</p>
      ${
        issues.length
          ? `<button class="teaching-clip-entry" type="button" data-action="generate-teaching-clip">
              生成本次个性化教学短片
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
    <section class="panel diagnosis-card task-ai-diagnosis-card" aria-label="任务拼音诊断">
      <span class="model-kicker">拼音诊断</span>
      <strong>${escapeHtml(diagnosis.summary || submission.diagnosisSummary || "系统已完成本次拼音诊断。")}</strong>
      <p>目标：${escapeHtml(submission.pinyinText || (diagnosis.target_pinyin || []).join(" "))}</p>
      <p>系统听到：${escapeHtml((diagnosis.heard_pinyin || []).join(" ") || submission.heardText || "未稳定听清")}</p>
    </section>
  `;
}

function renderTaskAiFeedback(submission) {
  if (!submission) return "";
  const syllables = Object.values(submission.syllables || {});
  const focusSyllable = syllables.length ? getFocusSyllable(submission.syllables) : null;
  return `
    <section aria-label="任务 AI 反馈" class="task-ai-feedback-block">
      <div class="score-heading">
        <div>
          <span class="model-kicker">本轮分数</span>
          <strong>${submission.aiScores?.overall ?? "--"} 分</strong>
        </div>
        <span>${focusSyllable ? `重点：${escapeHtml(focusSyllable.character)}` : "声调 · 清晰度 · 节奏"}</span>
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
              <p class="section-label" id="task-feedback-title">音节反馈</p>
              <div class="syllable-list">
                ${syllables
                  .map(
                    (item) => `
                      <button class="syllable-card level-${item.level}" type="button" data-task-syllable="${escapeHtml(item.id)}">
                        <span>
                          <strong class="syllable-character">${escapeHtml(item.character)}</strong>
                          <span class="syllable-meta">${escapeHtml(item.pinyinDisplay || item.pinyin)} · ${escapeHtml(item.tone)} · ${item.score}分</span>
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
    <section class="task-step-action-panel task-step-visual-feedback" aria-label="任务视觉化反馈">
      <span class="model-kicker">视觉化反馈</span>
      <strong>${hasAnalysis ? "本题发音反馈与示范视频" : "录音后生成视频反馈"}</strong>
      <p>${escapeHtml(hasAnalysis ? (state.modelSummary || "系统已完成本题分析。") : `先听标准发音，再录“${activeItemText}”。完成后这里会直接显示本题的示范视频和发音建议。`)}</p>
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
  const focusText = tags.length ? tags.join("、") : "本次训练重点";
  const targetText = submission?.targetText || task?.practiceText || "这句话";
  const score = Number(submission?.aiScores?.overall || 0);
  const weakSyllable = lowestScoredSyllable(submission);

  if (!submission) {
    return {
      title: "等待第一次录音",
      body: `这个任务主要练“${focusText}”。先按上面的步骤慢慢读“${targetText}”，完成录音后这里会显示和本任务对应的反馈。`,
      next: `建议先看口型和舌位，再用慢速跟读把“${targetText}”说完整。`,
    };
  }

  if (submission.teacherFeedback) {
    return {
      title: `${submission.teacherScore ?? submission.aiScores?.overall ?? "--"} 分 · 老师已反馈`,
      body: submission.teacherFeedback,
      next: `下一次练习仍然围绕“${focusText}”，先按老师建议调整，再重新录音。`,
    };
  }

  const levelText = score >= 85
    ? "这次任务完成比较稳定"
    : score >= 70
      ? "这次任务已经基本完成，但重点音还需要再稳一点"
      : "这次任务还需要继续练习，建议先放慢速度";
  const scoreText = submission.aiScores
    ? `本次综合 ${submission.aiScores.overall ?? "--"} 分，声调 ${submission.aiScores.tone ?? "--"} 分，清晰度 ${submission.aiScores.clarity ?? "--"} 分，节奏 ${submission.aiScores.rhythm ?? "--"} 分。`
    : "系统已收到这次录音。";
  const weakText = weakSyllable
    ? `目前最需要注意的是“${weakSyllable.character}”（${weakSyllable.pinyinDisplay || weakSyllable.pinyin}），${weakSyllable.feedback}`
    : submission.aiSummary || submission.diagnosisSummary || "可以继续围绕本任务重点练习。";

  return {
    title: levelText,
    body: `这个任务要求练“${focusText}”，练习句子是“${targetText}”。${scoreText}${weakText}`,
    next: `下一次建议先单独练“${tags[0] || weakSyllable?.character || targetText}”，再读完整句；录音时放慢一点，优先保证发音动作清楚。`,
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

function taskPackageUiState(task) {
  const exerciseSet = task.exerciseSet?.length ? task.exerciseSet : (task.items || []);
  const taskProgress = state.taskStepProgress?.[task.id] || {};
  const completedCount = exerciseSet.filter((exercise) => taskProgress[exercise.id]?.completed).length;
  const latestSubmission = (state.taskSubmissions || []).filter((submission) => submission.taskId === task.id).at(-1);
  const totalCount = exerciseSet.length || 1;
  if (latestSubmission?.teacherFeedback || latestSubmission?.status === "教师已复评") {
    return { label: "已完成", level: "done", completedCount, totalCount };
  }
  if (latestSubmission) {
    return { label: "待老师反馈", level: "pending", completedCount: totalCount, totalCount };
  }
  if (completedCount >= totalCount) {
    return { label: "待提交", level: "pending", completedCount, totalCount };
  }
  return { label: "待完成", level: "todo", completedCount, totalCount };
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
        <span>&#20013;&#25991;&#21457;&#38899;&#35757;&#32451;</span>
      </div>
      <div class="brand-row">
        <h1 class="brand"><span class="brand-accent">&#32472;&#22768;</span> &middot; ${progress ? "&#25105;&#30340;&#36827;&#27493;" : "See My Voice"}</h1>
        ${
          progress
            ? `<button class="period-button" type="button" data-action="toggle-period">${getProgressData(state).label}</button>`
            : `<button class="header-link" type="button" data-view="progress">&#36830;&#32493; ${streak} &#22825; &middot; &#36827;&#24230;</button>`
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
          <span>\u7ed8\u58f0 See My Voice</span>
        </div>
        <div>
          <h1>\u7ed8\u58f0</h1>
          <p>\u542c\u969c\u5b66\u751f\u666e\u901a\u8bdd\u53d1\u97f3\u5eb7\u590d\u8bad\u7ec3</p>
        </div>
      </header>
      <div class="role-home-content">
        <button class="role-entry-card is-student" type="button" data-role="student">
          <span class="model-kicker">\u5b66\u751f\u7aef</span>
          <strong>\u4eca\u65e5\u7ec3\u4e60</strong>
          <p>\u5f55\u97f3\u5206\u6790\u3001\u53d1\u97f3\u8be6\u60c5\u3001\u6559\u5b66\u89c6\u9891\u548c\u8fdb\u5ea6\u67e5\u770b\u3002</p>
        </button>
        <button class="role-entry-card is-teacher" type="button" data-role="teacher">
          <span class="model-kicker">\u6559\u5e08\u7aef</span>
          <strong>\u5eb7\u590d\u8bad\u7ec3\u7ba1\u7406</strong>
          <p>\u5b66\u751f\u7ba1\u7406\u3001\u4efb\u52a1\u53d1\u5e03\u3001\u5f55\u97f3\u6279\u6539\u548c\u6c9f\u901a\u53cd\u9988\u3002</p>
        </button>
      </div>
    </section>
  `;
}

function renderAccount() {
  const currentLabel = state.currentRole === "teacher" ? "&#25945;&#24072;&#31471;" : state.currentRole === "student" ? "&#23398;&#29983;&#31471;" : "&#26410;&#36873;&#25321;";
  const account = state.account || {};
  const displayName = account.displayName || (state.currentRole === "teacher" ? state.teacherDashboard?.teacherName : "陈小禾") || "用户";
  const streak = getStreak(state);
  const unread = getTotalUnreadChatCount(state, state.currentRole === "teacher" ? "teacher" : "student");
  const todayTask = getTodayStudentTask(state);
  return `
    <section class="screen account-screen" data-screen="account">
      <header class="app-header account-header">
        <div class="status-row">
          <span>${statusTime()}</span>
          <span>&#29992;&#25143;</span>
        </div>
        <div class="brand-row">
          <div>
            <h1 class="brand"><span class="brand-accent">&#32472;&#22768;</span> &#29992;&#25143;</h1>
            <p class="teacher-subtitle">&#24403;&#21069;&#65306;${currentLabel}</p>
          </div>
        </div>
      </header>
      <div class="content account-content">
        <section class="panel account-card account-profile-card" aria-labelledby="account-profile-title">
          <div class="account-profile-row">
            <label class="avatar-picker" aria-label="更换头像">
              ${avatarMarkup(displayName, account.avatarDataUrl, "account-avatar")}
              <input type="file" accept="image/*" data-field="avatar-file">
              <span>更换头像</span>
            </label>
            <div>
              <span class="model-kicker">${account.isLoggedIn ? "已登录" : "本地演示账号"}</span>
              <h2 id="account-profile-title">${escapeHtml(displayName)}</h2>
              <p>当前：${currentLabel}。头像和聊天身份会保存在本机浏览器。</p>
            </div>
          </div>
          <div class="account-stat-grid" aria-label="账号状态">
            <div>
              <strong>${streak}</strong>
              <span>连续练习</span>
            </div>
            <div>
              <strong>${unread}</strong>
              <span>未读消息</span>
            </div>
            <div>
              <strong>${todayTask ? "有" : "无"}</strong>
              <span>今日任务</span>
            </div>
          </div>
        </section>

        <section class="panel account-card account-settings-card" aria-labelledby="account-login-title">
          <div class="account-section-heading">
            <div>
              <span class="model-kicker">账号设置</span>
              <h2 id="account-login-title">${account.isLoggedIn ? "更新登录信息" : "登录演示账号"}</h2>
            </div>
            <span class="status-pill">${account.isLoggedIn ? "已保存" : "未登录"}</span>
          </div>
          <div class="account-form">
            <div class="account-role-picker" role="radiogroup" aria-label="选择登录身份">
              <label class="${state.currentRole === "student" ? "is-selected" : ""}">
                <input type="radio" name="login-role" value="student" ${state.currentRole === "student" ? "checked" : ""}>
                <span>学生</span>
              </label>
              <label class="${state.currentRole === "teacher" ? "is-selected" : ""}">
                <input type="radio" name="login-role" value="teacher" ${state.currentRole === "teacher" ? "checked" : ""}>
                <span>教师</span>
              </label>
            </div>
            <label>
              <span>账号</span>
              <input data-field="login-username" value="${escapeHtml(account.username || "")}" placeholder="请输入账号">
            </label>
            <label>
              <span>密码</span>
              <input data-field="login-password" type="password" value="${escapeHtml(account.password || "")}" placeholder="请输入密码">
            </label>
            <button class="teacher-primary-button" type="button" data-action="login-account">${account.isLoggedIn ? "保存账号" : "登录"}</button>
            ${account.isLoggedIn ? `<button class="teacher-secondary-button" type="button" data-action="logout-account">退出登录</button>` : ""}
          </div>
        </section>

        <section class="account-local-note" aria-label="本地数据说明">
          本页只是本地演示账号，不会连接真实认证系统。清除浏览器数据会同时清除头像、账号和聊天记录。
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
          <span class="model-kicker">入门测评</span>
          <h2 id="assessment-entry-title">生成初始发音画像</h2>
          <p>完成一组声母、韵母、声调和短句测评后，老师会在教师端确认初始训练方案。</p>
        </div>
        <span class="status-pill">${pendingProfiles.length ? "待老师确认" : "可开始"}</span>
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
        开始入门测评
      </button>
    </section>
  `;
}

function renderPractice() {
  const activeSyllables = getSyllables(state);
  const focusSyllable = getFocusSyllable(activeSyllables);
  const recordCopy = {
    idle: "开始录音",
    recording: "正在录音… 点击完成",
    complete: state.modelStatus === "analyzing" ? "正在分析…" : "分析完成 · 再练一次",
  }[state.recordingState];

  const statusCopy = {
    idle: "等待录音",
    recording: "正在录音",
    analyzing: "正在分析发音",
    complete: "分析完成",
    error: "需要重试",
  }[state.modelStatus];

  return `
    <section class="screen" data-screen="practice">
      ${brandHeader()}
      <div class="content">
        ${renderAssessmentEntryCard()}
        ${
          state.practiceBackView === "toneDrill"
            ? `<button class="practice-back-button" type="button" data-view="toneDrill">返回专项题库</button>`
            : ""
        }
        <section class="sentence-card" aria-labelledby="sentence-title">
          <label class="eyebrow" for="target-text">自定义练习</label>
          <input class="sentence-input" id="target-text" data-field="target-text" value="${escapeHtml(state.targetText)}" autocomplete="off" inputmode="text">
          <p class="pinyin">${state.pinyinText}</p>
        </section>

        <section class="model-card level-${state.modelStatus === "error" ? "focus" : "good"}" aria-label="发音反馈状态">
          <div>
            <span class="model-kicker">发音反馈</span>
            <strong>${statusCopy}</strong>
            <span>${state.recordingError ? escapeHtml(state.recordingError) : `系统听到：${state.asrHeard}`}</span>
          </div>
          <span class="status-pill">${state.modelStatus === "complete" ? "已完成" : "准备中"}</span>
        </section>

        <div class="record-row" aria-label="练习操作">
          <button class="record-button" type="button" data-action="record" data-state="${state.recordingState}" ${state.modelStatus === "analyzing" ? "disabled" : ""}>
            <span class="record-state-dot"></span>${recordCopy}
          </button>
          <button class="square-button ${state.playing ? "is-active" : ""}" type="button" data-action="play">
            ${state.playing ? "播放中" : "播放"}
          </button>
          <button class="square-button" type="button" data-action="play-self" ${state.lastRecordingUrl ? "" : "disabled"}>
            回听
          </button>
          <button class="square-button" type="button" data-action="reset">重来</button>
        </div>

        <section aria-label="发音评分">
          <div class="score-heading">
            <div>
              <span class="model-kicker">本轮分数</span>
              <strong>${state.score ? `${state.score} 分` : "录音后生成"}</strong>
            </div>
            <span>${state.modelStatus === "complete" && focusSyllable ? `重点：${focusSyllable.character}` : "声调 · 清晰度 · 节奏"}</span>
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
          <p class="section-label" id="feedback-title">音节反馈</p>
          <div class="syllable-list">
            ${Object.values(activeSyllables)
              .map(
                (item) => `
                  <button class="syllable-card level-${item.level}" type="button" data-syllable="${item.id}">
                    <span>
                      <strong class="syllable-character">${item.character}</strong>
                      <span class="syllable-meta">${item.pinyinDisplay || item.pinyin} · ${item.tone} · ${item.score}分</span>
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
          点击音节卡片查看嘴型示范、舌位提示、声调曲线和详细练习建议。
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
        <span class="model-kicker">任务</span>
        <h2>暂无可完成任务</h2>
        <p class="today-task-note">老师发布训练包后，会在这里显示今日作业、提交记录和老师反馈。</p>
        <button class="teacher-secondary-button" type="button" data-view="practice">去自由练习</button>
      </section>
    `;
  }
  const submissions = (state.taskSubmissions || []).filter((submission) => submission.taskId === task.id);
  const latestSubmission = submissions.at(-1);
  const exerciseSet = task.exerciseSet?.length
    ? task.exerciseSet
    : (task.items || []).map((item, index) => ({
        id: `legacy-${index}`,
        type: index === (task.items || []).length - 1 ? "提交" : "练习",
        title: item,
        instruction: index === (task.items || []).length - 1
          ? "完成这一步后录音提交给老师。"
          : "按老师安排完成这一项练习。",
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
    ? "正在分析并提交..."
    : state.recordingState === "recording"
      ? "完成录音并提交"
      : isActiveTask && state.recordingState === "complete"
        ? "重新录音提交"
        : "开始录音提交";
  const allTaskSubmissions = state.taskSubmissions || [];
  const reviewedCount = allTaskSubmissions.filter((submission) => submission.status === "教师已复评").length;
  const pendingCount = allTaskSubmissions.filter((submission) => submission.status === "待教师复评").length;
  const taskStatus = latestSubmission?.status || (submissions.length ? "待教师复评" : "待提交");
  const packageState = taskPackageUiState(task);
  const isCompletedPackage = packageState.label === "已完成";
  const teacherFeedbackTitle = latestSubmission?.teacherFeedback
    ? `${latestSubmission.teacherScore ?? "--"} 分 · 老师已反馈`
    : "老师还在批阅中";
  const teacherFeedbackBody = latestSubmission?.teacherFeedback
    || (latestSubmission ? "老师已经收到你的任务录音，批阅完成后会在这里同步显示具体反馈。" : "完成任务并提交后，老师会在这里给出本任务反馈。");
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
      ? "重新录音提交"
      : taskRecordCopy;
    return `
        <section class="panel task-simple-card">
          <button class="teacher-secondary-button task-back-button" type="button" data-action="return-task-steps">返回任务</button>
          <span class="model-kicker">第 ${exerciseSet.findIndex((exercise) => exercise.id === activeExercise?.id) + 1} 步</span>
          <div class="today-task-heading">
            <div>
              <h2>${escapeHtml(activeExercise?.title || "任务步骤")}</h2>
              <p>${escapeHtml(activeExercise?.instruction || "按老师要求完成这一小步。")}</p>
            </div>
            <span class="status-pill">${stepProgress.completed ? "已保存" : "进行中"}</span>
          </div>
          <div class="task-primary-target">
            <span>${escapeHtml(activeExercise?.type || "练习")}</span>
            <strong>${escapeHtml(activeItemText)}</strong>
            <p>第 ${activeItemIndex + 1}/${activePracticeItems.length || 1} 题。${activeExercise?.requiresSubmission ? "这些录音会作为最后提交给老师的作业。" : "每个题目都需要单独录音保存。"}</p>
            <div class="practice-item-list task-item-list">
              ${activePracticeItems.map((item, index) => `
                <button class="${index === activeItemIndex ? "is-active" : ""} ${completedItems[index]?.completed ? "is-complete" : ""}" type="button" data-task-practice="${escapeHtml(task.id)}" data-task-exercise="${escapeHtml(activeExercise?.id || "")}" data-task-item-index="${index}">
                  ${escapeHtml(item)}
                </button>
              `).join("")}
            </div>
          </div>
          <div class="task-step-action-panel">
            <span class="model-kicker">标准音与录音</span>
            <p>当前题目：${escapeHtml(activeItemText)}。先听标准发音，再录音练习；系统会在本页生成反馈和视觉化提示。</p>
            <button class="teacher-secondary-button" type="button" data-action="play">播放标准发音</button>
            <div class="record-row task-record-row" aria-label="训练包录音操作">
              <button class="record-button" type="button" data-action="task-record" data-task-practice="${escapeHtml(task.id)}" data-task-exercise="${escapeHtml(activeExercise?.id || "")}" data-task-item-index="${activeItemIndex}" ${state.modelStatus === "analyzing" ? "disabled" : ""}>
                <span class="record-state-dot"></span>${itemRecordCopy}
              </button>
              <button class="square-button" type="button" data-action="play-self" ${completedItem?.recordingUrl || state.lastRecordingUrl ? "" : "disabled"}>回听</button>
            </div>
          </div>
          ${renderTaskStepVisualFeedback(activeItemText, completedItem)}
          ${
            allItemsDone
              ? `<div class="task-next-step">
                  <span>已完成</span>
                  <p>这一小步里的 ${activePracticeItems.length || 1} 个题目都已保存，可以返回任务步骤继续完成下一项。</p>
                </div>`
              : ""
          }
        </section>
    `;
  }
  if (isCompletedPackage) {
    return `
        <section class="panel task-simple-card">
          <span class="model-kicker">已完成训练包</span>
          <div class="today-task-heading">
            <div>
              <h2>${escapeHtml(task.title)}</h2>
              ${taskGoalMarkup(task.goal)}
            </div>
            <span class="status-pill">已完成</span>
          </div>
          <div class="teacher-task-meta">
            <span>${escapeHtml(task.suggestedDue)}</span>
            <span>完成 ${packageState.totalCount}/${packageState.totalCount} 步</span>
            <span>${submissions.length} 次提交</span>
          </div>
        </section>

        <section class="panel task-feedback-card">
          <span class="model-kicker">本任务反馈</span>
          <strong>${escapeHtml(teacherFeedbackTitle)}</strong>
          <p>${escapeHtml(teacherFeedbackBody)}</p>
        </section>

        <button class="teacher-secondary-button" type="button" data-view="tasks">返回任务列表</button>
    `;
  }
  return `
        <section class="panel task-simple-card">
          <span class="model-kicker">训练包</span>
          <div class="today-task-heading">
            <div>
              <h2>${escapeHtml(task.title)}</h2>
              ${taskGoalMarkup(task.goal)}
            </div>
            <span class="status-pill">${escapeHtml(task.status)}</span>
          </div>
          <div class="teacher-task-meta">
            <span>${escapeHtml(task.suggestedDue)}</span>
            <span>已完成 ${completedCount}/${exerciseSet.length} 步</span>
            <span>需提交 ${task.requiredSubmissions} 次录音</span>
          </div>
          <div class="task-step-list">
            ${exerciseSet.map((exercise, index) => `
              <button class="task-step-card ${taskProgress[exercise.id]?.completed ? "is-complete" : ""}" type="button" data-task-practice="${escapeHtml(task.id)}" data-task-exercise="${escapeHtml(exercise.id)}">
                <span class="task-exercise-index">${index + 1}</span>
                <span>
                  <strong>${escapeHtml(exercise.title)}</strong>
                  <small>${escapeHtml(exercise.instruction)}</small>
                  <em>${escapeHtml(exercise.targetText || task.practiceText || "")} · ${exercise.requiredCount || 1} 次${exercise.requiresSubmission ? " · 录音提交" : ""}</em>
                  ${renderPracticeItemChips(practiceItemsForExercise(exercise), "practice-item-list is-compact")}
                </span>
                <b>${taskProgress[exercise.id]?.completed ? "已完成" : "去完成"}</b>
              </button>
            `).join("")}
          </div>
          <button class="teacher-primary-button" type="button" data-action="submit-task-to-teacher" data-task-practice="${escapeHtml(task.id)}" ${allStepsCompleted && !latestSubmission ? "" : "disabled"}>
            ${latestSubmission ? "已提交给老师" : allStepsCompleted ? "提交给老师" : "完成所有步骤后提交"}
          </button>
        </section>

        <section class="panel task-feedback-card">
          <span class="model-kicker">本任务反馈</span>
          <strong>${escapeHtml(teacherFeedbackTitle)}</strong>
          <p>${escapeHtml(teacherFeedbackBody)}</p>
          ${latestSubmission?.recordingUrl ? `<button class="teacher-secondary-button" type="button" data-action="play-submission" data-submission-id="${escapeHtml(latestSubmission.id)}">回听提交录音</button>` : ""}
        </section>

        <button class="teacher-secondary-button" type="button" data-view="tasks">返回任务列表</button>
  `;
}

function renderStudentTasks() {
  const tasks = (state.publishedTasks || []).filter((task) => task.status === "已发布");
  return `
    <section class="screen" data-screen="tasks">
      ${brandHeader()}
      <div class="content task-page-content">
        ${
          tasks.length
            ? `<div class="task-package-list" aria-label="训练包列表">
                ${tasks.map((task) => {
                  const packageState = taskPackageUiState(task);
                  return `
                    <button class="panel task-package-card is-${packageState.level}" type="button" data-student-task="${escapeHtml(task.id)}">
                      <div class="task-package-topline">
                        <span class="model-kicker">训练包</span>
                        <span class="status-pill">${escapeHtml(packageState.label)}</span>
                      </div>
                      <h2>${escapeHtml(task.title)}</h2>
                      ${taskGoalMarkup(task.goal)}
                      <div class="teacher-task-meta">
                        <span>${escapeHtml(task.suggestedDue)}</span>
                        <span>${packageState.completedCount}/${packageState.totalCount} 步</span>
                        <span>提交 ${task.requiredSubmissions} 次录音</span>
                      </div>
                    </button>
                  `;
                }).join("")}
              </div>`
            : `<section class="panel today-task-card task-empty-card">
                <span class="model-kicker">任务</span>
                <h2>暂无训练包</h2>
                <p class="today-task-note">老师发布训练包后，会在这里显示。你可以先去练习页做自定义练习。</p>
                <button class="teacher-secondary-button" type="button" data-view="practice">去自定义练习</button>
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
    ? `<button class="assessment-entry-button" type="button" data-action="complete-entry-assessment">提交测评给老师</button>`
    : `<button class="assessment-entry-button" type="button" data-action="assessment-record" ${state.modelStatus === "analyzing" ? "disabled" : ""}>
        ${
          state.modelStatus === "analyzing"
            ? "正在分析..."
            : state.recordingState === "recording"
              ? "完成本题录音"
              : "开始本题录音"
        }
      </button>`;
  return `
    <section class="screen" data-screen="entry-assessment">
      ${brandHeader()}
      <div class="content">
        <section class="panel assessment-entry-card">
          <div class="assessment-entry-heading">
            <div>
              <span class="model-kicker">入门测评</span>
              <h2>${completed ? "测评已完成" : currentItem.title}</h2>
              <p>${completed ? "已生成测评结果，可以提交给老师确认初始训练方案。" : `请读出：${currentItem.prompt}（${currentItem.pinyin}）`}</p>
            </div>
            <span class="status-pill">${results.length}/${items.length}</span>
          </div>
          <div class="assessment-progress-track" aria-hidden="true">
            <span style="width:${Math.round((results.length / items.length) * 100)}%"></span>
          </div>
          ${
            completed
              ? `<div class="assessment-profile-mini">
                  <strong>可提交</strong>
                  <p>系统将根据 ${results.length} 项结果生成初始发音画像，老师确认后再发布训练包。</p>
                </div>`
              : `<div class="task-focus-box">
                  <span class="model-kicker">${escapeHtml(currentItem.type)}</span>
                  <strong>${escapeHtml(currentItem.prompt)}</strong>
                  <p>观察重点：${escapeHtml(currentItem.focus)}</p>
                </div>`
          }
          ${
            actionButton
          }
        </section>
        <section class="panel student-submission-card">
          <span class="model-kicker">已完成题目</span>
          ${
            results.length
              ? results.map((result) => `
                  <article class="student-submission-row">
                    <strong>${escapeHtml(result.prompt)} · ${result.score} 分</strong>
                    <span>${escapeHtml(result.title)}</span>
                    <p>${escapeHtml(result.note)}</p>
                  </article>
                `).join("")
              : `<p class="today-task-note">还没有完成题目。</p>`
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
  const participantId = teacher ? "teacher-main" : "student-chen";
  const showThread = state.chatMode === "thread" && selectedThread;
  const shellOpen = teacher ? "" : `<section class="screen chat-screen" data-screen="chat">${brandHeader()}`;
  const shellClose = teacher ? "" : `</section>`;
  const chatHeader = teacher ? "" : "";
  const directThreads = threads.filter((thread) => thread.type !== "class");
  const classThreads = threads.filter((thread) => thread.type === "class");
  const students = getTeacherStudents(state);
  const quickReplies = teacher
    ? ["有进步，继续保持", "这次比上次更稳定", "先慢一点读", "我会再听一次", "别着急，按步骤来"]
    : ["收到", "我已完成录音", "请老师再看一下", "今天会继续练"];
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
        <div class="wechat-thread-actions" aria-label="${escapeHtml(displayTitle)}会话操作">
          <button class="wechat-thread-delete" type="button" data-action="delete-chat-thread" data-chat-thread-action="${escapeHtml(thread.id)}">删除</button>
        </div>
        <button class="wechat-thread" type="button" data-chat-thread="${escapeHtml(thread.id)}" aria-label="${escapeHtml(displayTitle)}，左滑可管理，学生端也可以右键删除">
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
              <p class="section-label">老师私聊</p>
              <div class="wechat-thread-list">${directThreads.map(renderThreadButton).join("")}</div>
            </div>`
          : ""
      }
      ${
        classThreads.length
          ? `<div class="wechat-thread-group">
              <p class="section-label">班级群聊</p>
              <div class="wechat-thread-list">${classThreads.map(renderThreadButton).join("")}</div>
            </div>`
          : ""
      }
      ${
        teacher
          ? `<section class="chat-create-card" aria-label="创建聊天">
              <div class="chat-create-block">
                <span class="model-kicker">创建班级群聊</span>
                <label>
                  <span>群聊名字</span>
                  <input data-field="class-chat-title" value="${escapeHtml(state.teacherDashboard?.className || "启音一班")}群聊" placeholder="例如：周三声调练习群">
                </label>
                <div class="chat-student-options" aria-label="选择加入群聊的学生">
                  ${studentCheckboxes}
                </div>
                <button class="teacher-primary-button" type="button" data-action="create-class-chat">创建群聊</button>
              </div>
              <div class="chat-create-block">
                <span class="model-kicker">创建学生私聊</span>
                <label>
                  <span>选择学生</span>
                  <select data-field="direct-chat-student">${studentOptions}</select>
                </label>
                <button class="teacher-secondary-button" type="button" data-action="create-direct-chat">开始私聊</button>
              </div>
            </section>`
          : `<section class="student-chat-tools" aria-label="联系老师">
              <button class="teacher-secondary-button" type="button" data-action="create-student-direct-chat">和老师私聊</button>
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
          <span>${threadTypeLabel(selectedThread)} · ${getUnreadChatCount(state, selectedThread, role)} 未读</span>
        </div>
        <span class="status-pill">${selectedThread.type === "class" ? "班级" : "私聊"}</span>
      </header>
      <div class="coach-thread-context">
        <span class="model-kicker">沟通重点</span>
        <p>${selectedThread.type === "class" ? "班级通知适合确认共性安排；个人发音问题建议在老师私聊里继续说。" : "这里适合发送练习完成情况、请老师复看录音，或确认下一次训练重点。"}</p>
      </div>
      ${
        selectedThread.type === "class"
          ? `<div class="wechat-thread-manage">
              <button type="button" data-action="delete-chat-thread" data-chat-thread-action="${escapeHtml(selectedThread.id)}">删除群聊</button>
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
                  <small>${escapeHtml(message.createdAt)} · ${mine ? (readCount > 1 ? "已读" : "未读") : "已读"}</small>
                </div>
                ${mine ? avatarMarkup(message.senderName, state.account?.avatarDataUrl || "", "chat-avatar mini") : ""}
              </article>
            `;
          }).join("")
        }
      </div>
      <div class="wechat-emoji-row" aria-label="快捷回复">
        ${quickReplies.map((reply) => `<button type="button" data-chat-emoji="${escapeHtml(reply)}">${escapeHtml(reply)}</button>`).join("")}
      </div>
      <div class="wechat-compose">
        <input data-field="chat-message" placeholder="${teacher ? "输入鼓励、提醒或训练建议" : "输入练习情况或问题"}">
        <button type="button" data-action="send-chat-message">发送</button>
      </div>
    </section>
  ` : `
    <section class="wechat-list-panel">
      <p class="teacher-empty-copy">还没有会话。</p>
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
        <span>音节详情</span>
      </div>
      <div class="detail-title-row">
        <div>
          <button class="back-button" type="button" ${fromTask ? 'data-action="return-task-detail"' : 'data-view="practice"'}>${fromTask ? "返回任务" : "返回练习"}</button>
          <h1 class="detail-heading">详细练习</h1>
          <p class="detail-subtitle">${syllable.pinyinDisplay || syllable.pinyin} · ${syllable.tone} · 当前 ${syllable.score} 分</p>
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
          <p class="section-label" id="mouth-title">嘴型与舌位对照</p>
          <div class="panel mouth-grid">
            <div class="mouth-panel">
              <p class="panel-title">${hasReference ? "参考嘴型图" : "自动嘴型示意"}</p>
              <div class="mouth-reference">
                ${renderGeneratedMouth(syllable)}
              </div>
              <p class="mouth-cue-line">${escapeHtml(syllable.mouthCue)}</p>
            </div>
            <div class="mouth-panel">
              <p class="panel-title">我的镜像</p>
              <div class="mirror-area" id="mirror-area">
                <span><strong>正在等待摄像头</strong>允许摄像头后，对照左侧嘴型观察唇齿位置</span>
              </div>
            </div>
          </div>
          <div class="panel tongue-reference">
            <div>
              <p class="panel-title">${hasReference ? "参考舌位图" : "自动舌位示意"}</p>
              <p class="mouth-cue-line">${escapeHtml(syllable.tongueCue)}</p>
            </div>
            ${renderGeneratedTongue(syllable)}
          </div>
          ${
            missingImageUnits.length
              ? `<p class="model-summary">当前 ${missingImageUnits.map((item) => `${item.kind} ${item.unit}`).join("、")} 暂无精确嘴型/舌位图，已避免显示不匹配图片；请以上方教学视频和文字提示为准。</p>`
              : ""
          }
        </section>

        <section class="panel chart-card" aria-labelledby="tone-title">
          <div class="chart-title">
            <h2 id="tone-title">声调对比 · 第${syllable.tone.replace("T", "")}声</h2>
            <div class="chart-legend" aria-hidden="true">
              <span class="legend-key">目标</span>
              <span class="legend-key current">你的</span>
            </div>
          </div>
          <canvas id="tone-chart" width="640" height="248" aria-label="目标声调与当前声调趋势对比图"></canvas>
        </section>

        <section class="panel analysis-card" aria-label="本音节分析结论">
          <strong>本音节结论</strong>
          <span>${escapeHtml(syllable.feedback)}</span>
          ${
            syllable.issue
              ? `<span class="analysis-extra">${escapeHtml(syllable.issue.detail)}</span>`
              : ""
          }
        </section>

        <button class="replay-button ${state.playing ? "is-active" : ""}" type="button" data-action="play-detail">
          ${state.playing ? "正在重听示范…" : "重听标准发音"}
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
          <p class="section-label" id="trend-title">综合评分趋势</p>
          <div class="panel chart-card trend-wrap">
            <canvas id="progress-chart" width="640" height="248" aria-label="${progress.label}综合评分折线图"></canvas>
          </div>
        </section>

        <section aria-labelledby="calendar-title">
          <p class="section-label" id="calendar-title">打卡日历</p>
          <div class="panel calendar-grid">
            ${calendarDays
              .map(
                (day) => `
                  <button class="calendar-day ${day.practiced ? "is-done" : ""} ${day.today ? "is-today" : ""} ${day.selected ? "is-selected" : ""}" type="button" data-progress-date="${escapeHtml(day.date)}">
                    <strong>${day.label}</strong>
                    <span>${day.practiced ? "已练" : "未练"}</span>
                  </button>
                `,
              )
              .join("")}
          </div>
        </section>

        <section aria-labelledby="words-title">
          <p class="section-label" id="words-title">当日练习词汇</p>
          <div class="word-list">
            ${progress.words.length
              ? progress.words
              .map(
                (item) => `
                  <button class="word-row level-${item.level}" type="button" data-word="${item.word}" data-score="${item.score}" data-status="${item.status}">
                    <span class="word-top">
                      <strong class="word-name">${item.word}</strong>
                      <span class="word-status">${item.score}分 · ${item.status}</span>
                    </span>
                    <span class="progress-track" aria-hidden="true">
                      <span class="progress-fill" style="width:${item.score}%"></span>
                    </span>
                  </button>
                `,
              )
              .join("")
              : `<p class="panel today-task-note">这一天还没有自定义练习记录。</p>`}
          </div>
        </section>

        <section aria-labelledby="tones-title">
          <p class="section-label" id="tones-title">声调专项</p>
          <div class="panel tone-list">
            ${progress.tones
              .map(
                (item) => `
                  <button class="tone-card ${item.level}" type="button" data-tone-drill="${item.tone}">
                    <div class="tone-top">
                      <span class="tone-label">${item.label}</span>
                      <span class="tone-score">${item.score} 分</span>
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

        <button class="replay-button" type="button" data-view="practice">返回今日练习</button>
      </div>
    </section>
  `;
}

function teacherPageHeader(title, subtitle) {
  return `
    <header class="app-header teacher-header">
      <div class="status-row">
        <span>${statusTime()}</span>
        <span>&#24247;&#22797;&#35757;&#32451;&#31649;&#29702;&#21518;&#21488;</span>
      </div>
      <div class="brand-row">
        <div>
          <h1 class="brand"><span class="brand-accent">&#32472;&#22768;</span> &#25945;&#24072;&#31471;</h1>
          <p class="teacher-subtitle">${escapeHtml(title)} \u00b7 ${escapeHtml(subtitle)}</p>
        </div>
      </div>
    </header>
  `;
}

function renderTeacherHomePage(summary, classProgress) {
  return `
    <section aria-labelledby="teacher-home-title">
      <p class="section-label" id="teacher-home-title">今日待处理</p>
      <div class="teacher-metric-grid">
        <button class="teacher-metric-card is-warm" type="button" data-teacher-view="reviews">
          <strong>${summary.pendingSubmissions}</strong>
          <span>未批改录音</span>
        </button>
        <button class="teacher-metric-card ${summary.needsAttention ? "is-alert" : ""}" type="button" data-teacher-view="students" data-teacher-filter="attention">
          <strong>${summary.needsAttention}</strong>
          <span>需要关注</span>
        </button>
        <button class="teacher-metric-card" type="button" data-teacher-view="tasks">
          <strong>${summary.totalPublishedTasks || 0}</strong>
          <span>发布练习任务</span>
        </button>
      </div>
    </section>

    <section class="panel teacher-class-progress-card" aria-labelledby="teacher-class-progress-title">
      <div class="teacher-review-heading">
        <div>
          <span class="model-kicker">班级概览</span>
          <strong id="teacher-class-progress-title">训练完成与关注概览</strong>
        </div>
        <span class="status-pill">${classProgress.studentCount} 人</span>
      </div>
      <div class="teacher-class-progress-grid">
        <span><strong>${classProgress.completionRate}%</strong>提交覆盖</span>
        <span><strong>${classProgress.taskCoverageRate}%</strong>任务覆盖</span>
        <span><strong>${classProgress.averageLatestScore}</strong>平均测评</span>
      </div>
      <div class="teacher-progress-bar" aria-label="班级提交覆盖率">
        <span style="width:${classProgress.completionRate}%"></span>
      </div>
      <div class="teacher-class-columns">
        <div>
          <span class="teacher-report-label">常见关注点</span>
          <div class="teacher-tag-list">
            ${
              classProgress.commonFocusTags.length
                ? classProgress.commonFocusTags.map((item) => `<span>${escapeHtml(item.tag)} · ${item.count}</span>`).join("")
                : "<span>暂无集中问题</span>"
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
      <p class="section-label" id="teacher-students-title">学生管理</p>
      <div class="teacher-action-list teacher-filter-list" aria-label="学生筛选">
        <button type="button" data-teacher-view="students" data-teacher-filter="all" ${activeFilter === "all" ? "aria-current=\"page\"" : ""}>全部学生</button>
        <button type="button" data-teacher-view="students" data-teacher-filter="attention" ${activeFilter === "attention" ? "aria-current=\"page\"" : ""}>需要关注</button>
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
                  <span>${escapeHtml(student.stage)} · 本周 ${student.weeklyPracticeCount} 次${attentionCopy ? ` · ${escapeHtml(attentionCopy)}` : ""}</span>
                </span>
                <span class="status-pill">${student.latestScore} 分</span>
              </button>
                `;
              })
              .join("")
            : `<p class="teacher-empty-copy">目前没有需要关注的学生。</p>`
        }
      </div>
    </section>

    ${
      selectedStudent && assessmentReport
        ? `
          <section class="panel teacher-report-card" aria-labelledby="teacher-report-title">
            <span class="model-kicker">阶段画像</span>
            <h2 id="teacher-report-title">${escapeHtml(assessmentReport.studentName)}</h2>
            <div class="teacher-report-score-grid">
              <span><strong>${assessmentReport.latestScore}</strong>最近测评</span>
              <span><strong>${assessmentReport.averageAiScore}</strong>AI 均分</span>
              <span><strong>${assessmentReport.teacherAverage || "--"}</strong>教师均分</span>
            </div>
            ${
              isEditingSummary
                ? `<form class="teacher-summary-form" data-student-summary-form="${escapeHtml(selectedStudent.id)}">
                    <label class="template-field">
                      <span>老师阶段备注</span>
                      <textarea data-field="teacher-student-summary" rows="3">${escapeHtml(assessmentReport.conclusion)}</textarea>
                    </label>
                    <button class="teacher-secondary-button" type="button" data-action="save-teacher-student-summary" data-student-id="${escapeHtml(selectedStudent.id)}">保存阶段备注</button>
                  </form>`
                : `<div class="teacher-summary-display">
                    <span>老师阶段备注</span>
                    <p>${escapeHtml(assessmentReport.conclusion)}</p>
                    <button class="teacher-secondary-button" type="button" data-action="edit-teacher-student-summary" data-student-id="${escapeHtml(selectedStudent.id)}">修改备注</button>
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
    return `<p class="teacher-empty-copy">请先在学生管理中选择学生，再生成练习任务。</p>`;
  }
  const taskDraft = publishedTask || recommendedTask;
  const students = getTeacherStudents(state);
  return `
    <section class="panel teacher-next-card" aria-label="新建训练任务">
      <span class="model-kicker">新建任务</span>
      <strong>给学生单独布置训练包</strong>
      <p>老师可以选择学生，再进入可编辑模板，使用题库或自定义步骤布置任务。</p>
      <label class="template-field">
        <span>选择学生</span>
        <select data-field="new-task-student">
          ${students.map((student) => `<option value="${escapeHtml(student.id)}" ${student.id === selectedStudent.id ? "selected" : ""}>${escapeHtml(student.name)}</option>`).join("")}
        </select>
      </label>
      <button class="teacher-primary-button" type="button" data-action="start-new-teacher-task">新建训练任务</button>
    </section>

    <section class="panel teacher-next-card" aria-label="AI 辅助任务">
      <span class="model-kicker">任务中心</span>
      <strong>${escapeHtml(taskDraft.title)}</strong>
      <div class="teacher-task-meta">
        <span>${escapeHtml(publishedTask?.status || recommendedTask.status)}</span>
        <span>${taskDraft.exerciseSet?.length || taskDraft.items?.length || 0} 个任务步骤</span>
      </div>
      <button class="teacher-primary-button" type="button" data-teacher-view="taskPackageEditor">
        ${publishedTask ? "重新审核并修改" : "审核并修改训练包"}
      </button>
    </section>

    ${
      assessmentProfile
        ? `<section class="panel teacher-assessment-card" aria-labelledby="teacher-assessment-title">
            <div class="teacher-review-heading">
              <div>
                <span class="model-kicker">入门测评画像</span>
                <strong id="teacher-assessment-title">${escapeHtml(assessmentProfile.studentName)} · ${escapeHtml(assessmentProfile.status)}</strong>
              </div>
              <span class="teacher-review-score">${assessmentProfile.overallScore} 分</span>
            </div>
            <div class="teacher-task-meta">
              <span>${escapeHtml(assessmentProfile.status)}</span>
              <span>${assessmentProfile.issueTags.length} 个关注点</span>
            </div>
            <button class="teacher-primary-button" type="button" data-teacher-view="assessmentEditor" ${assessmentProfile.status === "教师已确认" ? "disabled" : ""}>
              ${assessmentProfile.status === "教师已确认" ? "已发布初始任务" : "编辑训练包模板"}
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
        <span class="model-kicker">训练包审核</span>
        <strong>还没有可编辑的训练包</strong>
        <p>请先选择学生，系统会根据学生画像生成训练包初稿。</p>
        <button class="teacher-secondary-button" type="button" data-teacher-view="tasks">返回任务中心</button>
      </section>
    `;
  }
  const exerciseSet = taskDraft.exerciseSet?.length ? taskDraft.exerciseSet : (taskDraft.items || []).map((item, index) => ({
    id: `editor-${index}`,
    type: index === 0 ? "听辨" : index === 1 ? "跟读" : "录音",
    title: item,
    instruction: index === 0 ? "听标准发音，观察嘴型和节奏。" : index === 1 ? "把重点音放慢跟读。" : "读完整句并录音提交。",
    targetText: taskDraft.practiceText,
    requiredCount: index === 1 ? taskDraft.repeatCount : 1,
    requiresSubmission: index === (taskDraft.items || []).length - 1,
  }));
  return `
    <section class="assessment-editor-page" aria-labelledby="task-package-editor-title">
      <button class="teacher-secondary-button assessment-editor-back" type="button" data-teacher-view="tasks">返回任务中心</button>

      <section class="panel assessment-editor-hero">
        <div>
          <span class="model-kicker">训练包审核模板</span>
          <h2 id="task-package-editor-title">${isNewTask ? "新建训练任务" : `${escapeHtml(selectedStudent.name)} 的训练任务`}</h2>
          <p>${isNewTask ? `正在给 ${escapeHtml(selectedStudent.name)} 新建训练包。可以使用题库，也可以完全自定义。` : "系统只生成初稿。请老师确认目标、练习量和给学生看的说明，再发布到学生端。"}</p>
        </div>
        <span class="teacher-review-score">${escapeHtml(String(selectedStudent.latestScore || "--"))} 分</span>
      </section>

      <section class="panel assessment-template-section">
        <div class="assessment-template-step">
          <span>1</span>
          <div>
            <strong>确认训练目标</strong>
            <p>把训练方向改成老师真正想让学生这一轮重点练习的内容。</p>
          </div>
        </div>
        <div class="teacher-tag-list">
          ${(recommendedTask.reviewTags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
        <label class="template-field">
          <span>任务标题</span>
          <input data-field="recommended-task-title" value="${escapeHtml(taskDraft.title)}">
        </label>
        <label class="template-field">
          <span>训练目标，学生任务页会看到</span>
          <textarea data-field="recommended-task-goal" rows="3">${escapeHtml(taskDraft.goal)}</textarea>
        </label>
      </section>

      <section class="panel assessment-template-section">
        <div class="assessment-template-step">
          <span>2</span>
          <div>
            <strong>修改练习内容</strong>
            <p>老师可以换练习句子、调整次数，也可以把步骤写得更具体。</p>
          </div>
        </div>
        <label class="template-field">
          <span>本次练习句子</span>
          <input data-field="recommended-practice-text" value="${escapeHtml(taskDraft.practiceText)}">
        </label>
        <div class="assessment-edit-grid">
          <label class="template-field">
            <span>完成期限</span>
            <input data-field="recommended-suggested-due" value="${escapeHtml(taskDraft.suggestedDue)}">
          </label>
          <label class="template-field">
            <span>跟读次数</span>
            <input data-field="recommended-repeat-count" type="number" min="1" value="${escapeHtml(taskDraft.repeatCount)}">
          </label>
          <label class="template-field">
            <span>提交录音次数</span>
            <input data-field="recommended-required-submissions" type="number" min="1" value="${escapeHtml(taskDraft.requiredSubmissions)}">
          </label>
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
            <strong>写给学生的说明</strong>
            <p>用学生能理解的话告诉他为什么练、怎么练、先注意哪里。</p>
          </div>
        </div>
        <label class="template-field">
          <span>学生端说明</span>
          <textarea data-field="recommended-teacher-note" rows="4">${escapeHtml(taskDraft.teacherNote)}</textarea>
        </label>
        <button class="teacher-primary-button" type="button" data-action="publish-recommended-task">
          ${publishedTask && !isNewTask ? "保存修改并重新发布" : "提交给学生"}
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
          <strong class="teacher-step-title">任务步骤 ${index + 1}</strong>
        </div>
        <div class="step-source-toggle" role="group" aria-label="任务内容来源">
          <button class="${mode === "bank" ? "is-selected" : ""}" type="button" data-action="set-step-source" data-source-mode="bank">使用题库</button>
          <button class="${mode === "custom" ? "is-selected" : ""}" type="button" data-action="set-step-source" data-source-mode="custom">自定义</button>
        </div>
        <button class="step-delete-button" type="button" data-action="delete-task-step" aria-label="删除任务步骤 ${index + 1}">删除</button>
      </div>
      <section class="step-bank-panel" data-bank-panel ${mode === "bank" ? "" : "hidden"}>
        <label class="template-field">
          <span>选择题目包</span>
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
          <span>步骤类型</span>
          <input data-step-field="type" value="${escapeHtml(exercise.type || "练习")}">
        </label>
        <label class="template-field">
          <span>练习次数</span>
          <input data-step-field="requiredCount" type="number" min="1" value="${escapeHtml(exercise.requiredCount || 1)}">
        </label>
      </div>
      <label class="template-field">
        <span>学生看到的步骤名称</span>
        <input data-step-field="title" value="${escapeHtml(exercise.title || "")}">
      </label>
      <label class="template-field">
        <span>具体练习题/句子</span>
        <input data-step-field="targetText" value="${escapeHtml(exercise.targetText || "")}">
      </label>
      <label class="template-field">
        <span>学生端显示的具体题目，每行一个</span>
        <textarea data-step-field="practiceItems" rows="3">${escapeHtml((practiceItemsForExercise(exercise).length ? practiceItemsForExercise(exercise) : selectedBank.items).join("\n"))}</textarea>
      </label>
      <label class="template-field">
        <span>步骤说明</span>
        <textarea data-step-field="instruction" rows="2">${escapeHtml(exercise.instruction || "")}</textarea>
      </label>
      <label class="template-check-field">
        <input data-step-field="requiresSubmission" type="checkbox" ${exercise.requiresSubmission ? "checked" : ""}>
        <span>这一步需要录音，作为提交给老师的作业</span>
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
    if (title) title.textContent = `任务步骤 ${index + 1}`;
    if (deleteButton) deleteButton.setAttribute("aria-label", `删除任务步骤 ${index + 1}`);
  });
}


function renderAssessmentTemplateEditor(assessmentProfile) {
  if (!assessmentProfile) {
    return `
      <section class="panel teacher-assessment-card">
        <span class="model-kicker">训练包模板</span>
        <strong>还没有可编辑的入门测评画像</strong>
        <p>学生完成入门测评后，系统会先生成画像，再由老师编辑训练包。</p>
        <button class="teacher-secondary-button" type="button" data-teacher-view="tasks">返回任务中心</button>
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
      type: "示范",
      title: "听标准发音并观察动作",
      instruction: "先听标准发音，观察口型、舌位和节奏。",
      targetText: bankPackage.targetText || "我要喝水",
      requiredCount: 2,
      sourceMode: "bank",
      bankPackageId: bankPackage.id,
      practiceItems: bankPackage.items,
    },
    {
      id: "assessment-focus",
      type: "跟读",
      title: "重点音放慢跟读",
      instruction: "把测评中不稳定的重点音放慢练，先保证动作完整。",
      targetText: bankPackage.targetText || "我要喝水",
      requiredCount: repeatCount,
      sourceMode: "bank",
      bankPackageId: bankPackage.id,
      practiceItems: bankPackage.items,
    },
    {
      id: "assessment-submit",
      type: "提交",
      title: "完整短句录音提交",
      instruction: "读完整句并录音提交，老师会在批改中心复听。",
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
      <button class="teacher-secondary-button assessment-editor-back" type="button" data-teacher-view="tasks">返回任务中心</button>

      <section class="panel assessment-editor-hero">
        <div>
          <span class="model-kicker">入门测评训练包模板</span>
          <h2 id="assessment-editor-title">${escapeHtml(assessmentProfile.studentName)} 的初始训练包</h2>
          <p>AI 已经生成初稿。请老师根据学生情况修改后，再提交给学生端。</p>
        </div>
        <span class="teacher-review-score">${assessmentProfile.overallScore} 分</span>
      </section>

      <section class="panel assessment-template-section">
        <div class="assessment-template-step">
          <span>1</span>
          <div>
            <strong>确认训练目标</strong>
            <p>先把 AI 建议改成老师真正想让学生练习的方向。</p>
          </div>
        </div>
        <div class="teacher-tag-list">
          ${assessmentProfile.issueTags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
        <label class="template-field">
          <span>给老师看的测评摘要</span>
          <textarea data-field="assessment-profile-summary" rows="3">${escapeHtml(assessmentProfile.profileSummary)}</textarea>
        </label>
        <label class="template-field">
          <span>训练目标，学生任务页会看到</span>
          <textarea data-field="assessment-recommendation" rows="4">${escapeHtml(assessmentProfile.recommendation)}</textarea>
        </label>
      </section>

      <section class="panel assessment-template-section">
        <div class="assessment-template-step">
          <span>2</span>
          <div>
            <strong>编辑发布给学生的任务</strong>
            <p>让任务像康复老师布置作业一样清楚：练什么、练几次、提交几次。</p>
          </div>
        </div>
        <label class="template-field">
          <span>任务标题</span>
          <input data-field="assessment-task-title" value="${escapeHtml(`${assessmentProfile.studentName} · 入门测评训练包`)}">
        </label>
        <label class="template-field">
          <span>本次练习句子</span>
          <input data-field="assessment-practice-text" value="${escapeHtml(bankPackage.targetText || "我要喝水")}">
        </label>
        <div class="assessment-edit-grid">
          <label class="template-field">
            <span>跟读次数</span>
            <input data-field="assessment-repeat-count" type="number" min="1" max="20" value="${repeatCount}">
          </label>
          <label class="template-field">
            <span>提交录音次数</span>
            <input data-field="assessment-required-submissions" type="number" min="1" max="10" value="1">
          </label>
        </div>
        <div class="teacher-step-editor-list" data-step-editor-list>
          ${assessmentExerciseSet.map((exercise, index) => renderTeacherStepEditor(exercise, index)).join("")}
        </div>
        <button class="teacher-add-step-button" type="button" data-action="add-task-step">＋</button>
      </section>

      <section class="panel assessment-template-section">
        <div class="assessment-template-step">
          <span>3</span>
          <div>
            <strong>写给学生的说明</strong>
            <p>这段话会出现在学生任务页，建议写得短、具体、鼓励。</p>
          </div>
        </div>
        <label class="template-field">
          <span>学生可见说明</span>
          <textarea data-field="assessment-teacher-note" rows="4">老师已经根据你的入门测评调整了训练包。今天先不用追求很快，重点把目标音放慢、说完整，录完后老师会再听一遍。</textarea>
        </label>
        <button class="teacher-primary-button" type="button" data-action="publish-assessment-task">提交给学生</button>
      </section>
    </section>
  `;
}

function renderTeacherReviewsPage(pendingSubmissions) {
  return `
    <section class="panel teacher-review-card" aria-labelledby="teacher-review-title">
      <div class="teacher-review-heading">
        <div>
          <span class="model-kicker">批改中心</span>
          <strong id="teacher-review-title">学生录音待复评</strong>
        </div>
        <span class="status-pill">${pendingSubmissions.length} 条</span>
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
                        <span class="teacher-review-score">${submission.aiScores.overall} 分</span>
                      </div>
                      <button class="teacher-primary-button" type="button" data-action="open-review-editor" data-review-editor="${escapeHtml(submission.id)}">
                        修改反馈
                      </button>
                    </article>
                  `,
                )
                .join("")}
            </div>`
          : `<p class="teacher-empty-copy">学生完成老师布置的录音任务后，会出现在这里，老师再结合 AI 初评补充反馈。</p>`
      }
    </section>
  `;
}

function renderTeacherReviewEditorPage(submission) {
  if (!submission) {
    return `
      <section class="panel teacher-review-card">
        <span class="model-kicker">批改中心</span>
        <strong>没有找到这条录音</strong>
        <p>这条录音可能已经批改完成，或已不在待复评列表中。</p>
        <button class="teacher-secondary-button" type="button" data-teacher-view="reviews">返回批改中心</button>
      </section>
    `;
  }
  return `
    <section class="panel teacher-review-card teacher-review-editor" aria-labelledby="teacher-review-editor-title">
      <button class="teacher-secondary-button assessment-editor-back" type="button" data-teacher-view="reviews">返回批改中心</button>
      <div class="teacher-review-heading">
        <div>
          <span class="model-kicker">修改反馈</span>
          <strong id="teacher-review-editor-title">${escapeHtml(submission.studentName)}</strong>
          <p>${escapeHtml(submission.taskTitle)}</p>
        </div>
        <span class="teacher-review-score">${submission.aiScores.overall} 分</span>
      </div>
      <div class="teacher-submission-audio">
        ${
          submission.recordingUrl
            ? `<audio controls src="${escapeHtml(submission.recordingUrl)}"></audio>`
            : `<p>暂无可播放录音，请让学生重新提交。</p>`
        }
      </div>
      <p>${escapeHtml(submission.aiSummary || submission.diagnosisSummary || "AI 初评已完成，等待老师复评。")}</p>
      <div class="teacher-task-meta">
        <span>题目：${escapeHtml(submission.exerciseTitle || "短句录音提交")}</span>
        <span>目标：${escapeHtml(submission.targetText)}</span>
        <span>听到：${escapeHtml(submission.heardText || "待确认")}</span>
        <span>${escapeHtml(submission.status)}</span>
      </div>
      <div class="teacher-score-strip" aria-label="AI 初评分">
        <span>声调 ${submission.aiScores.tone}</span>
        <span>清晰度 ${submission.aiScores.clarity}</span>
        <span>节奏 ${submission.aiScores.rhythm}</span>
      </div>
      <div class="teacher-review-form">
        <label>
          <span>教师评分</span>
          <input data-review-score="${escapeHtml(submission.id)}" type="number" min="0" max="100" value="${submission.aiScores.overall}">
        </label>
        <label>
          <span>反馈给学生</span>
          <textarea data-review-feedback="${escapeHtml(submission.id)}" rows="4">这次比上次更接近目标，继续把重点音放慢一点练，老师已经看到你的进步。</textarea>
        </label>
        <button class="teacher-primary-button" type="button" data-review-submission="${escapeHtml(submission.id)}">
          保存批改并反馈
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
          <span class="model-kicker">聊天沟通</span>
          <strong id="teacher-message-title">${selectedStudent ? `${escapeHtml(selectedStudent.name)} · 任务相关留言` : "任务相关留言"}</strong>
        </div>
        <span class="status-pill">${selectedMessages.length} 条</span>
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
                      <small>关联练习：${escapeHtml(message.relatedText || "本次任务")}</small>
                    </article>
                  `,
                )
                .join("")}
            </div>`
          : `<p class="teacher-empty-copy">教师复评后会自动沉淀为任务留言，学生可以在今日任务中看到。</p>`
      }
      <div class="teacher-quick-replies" aria-label="常用鼓励语">
        <span class="teacher-report-label">常用反馈</span>
        <button type="button">这次比上次更清楚</button>
        <button type="button">下一次把重点音放慢</button>
        <button type="button">老师已经看到你的进步</button>
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
    home: "\u9996\u9875",
    students: "\u5b66\u751f\u7ba1\u7406",
    tasks: "\u4efb\u52a1\u4e2d\u5fc3",
    assessmentEditor: "\u5ba1\u6838\u8bad\u7ec3\u5305",
    taskPackageEditor: "\u5ba1\u6838\u8bad\u7ec3\u5305",
    reviews: "\u6279\u6539\u4e2d\u5fc3",
    reviewEditor: "\u4fee\u6539\u53cd\u9988",
    chat: "\u804a\u5929\u6c9f\u901a",
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
          <span>声调专项</span>
        </div>
        <div class="tone-drill-title-row">
          <div>
            <button class="tone-back-icon" type="button" data-view="progress" aria-label="返回进度页">
              <span aria-hidden="true">‹</span>
              <span>进度</span>
            </button>
            <h1 class="tone-drill-heading">${escapeHtml(drill.label)}</h1>
            <p class="tone-drill-subtitle">${escapeHtml(drill.description)}</p>
          </div>
          <div class="tone-number" aria-hidden="true">${escapeHtml(state.selectedToneDrill)}</div>
        </div>
      </header>
      <div class="content">
        <section class="panel tone-drill-intro">
          <span class="model-kicker">自动题库</span>
          <strong>选择一个字开始专项练习</strong>
          <p>这些字都属于同一个声调。点击后会自动切换到练习页，你可以听标准音、录音、看声调趋势。</p>
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
                  <p class="panel-title">${escapeHtml(clip.title || clip.videoTitle || "发音示范")}</p>
                  ${
                    clip.videoUrl
                      ? `
                        <div class="clip-video-shell">
                          <video class="clip-video" controls playsinline ${clip.posterUrl ? `poster="${escapeHtml(clip.posterUrl)}"` : ""}>
                            <source src="${escapeHtml(clip.videoUrl)}" type="video/mp4">
                          </video>
                        </div>
                      `
                      : `<p class="clip-asset-note">这个发音暂时没有切好的视频素材。</p>`
                  }
                  <p class="clip-asset-note">${escapeHtml(clip.guidanceText || clip.videoTitle || "")}</p>
                </div>
              `).join("")
            : `<p class="clip-asset-note">这个音节暂时没有匹配到可用视频素材。</p>`
        }
      </div>
      ${
        segment.standardAudioUrl || plan.standardAudioUrl
          ? `<button class="replay-button" type="button" data-action="clip-replay-standard">播放整句标准发音</button>`
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
      <p class="clip-asset-note">${escapeHtml(segment.videoTitle || `${segment.unit} 发音片段`)}</p>
    `;
  }
  if (segment.type === "articulation") {
    return `
      <p class="clip-asset-note">这个音暂时没有匹配到可播放的视频片段。请先听标准发音，后续补充视频素材后会直接显示视频。</p>
    `;
  }
  if (segment.type === "tone") {
    return `
      <div class="panel chart-card clip-tone-card">
        <div class="chart-title">
          <h2>声调趋势</h2>
          <div class="chart-legend" aria-hidden="true">
            <span class="legend-key">目标</span>
            <span class="legend-key current">你的</span>
          </div>
        </div>
        <canvas id="clip-tone-chart" width="640" height="248" aria-label="教学短片声调趋势图"></canvas>
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
      <button class="replay-button" type="button" data-action="clip-replay-standard">播放标准发音</button>
    `;
  }
  return `
    <div class="clip-focus-character" aria-hidden="true">
      ${escapeHtml(plan.targetSyllable?.character || plan.focusIssue?.focus || "练")}
    </div>
  `;
}

function renderTeachingVideoPanel() {
  const plan = state.teachingPlan;
  if (!plan) {
    return `
      <section class="panel clip-summary" aria-label="教学视频">
        <span class="model-kicker">教学视频</span>
        <strong>录音后自动生成</strong>
        <p>完成一次录音分析后，这里会显示本次的个性化教学视频。</p>
      </section>
    `;
  }

  const segments = plan.segments || [];
  const index = Math.min(state.selectedClipSegmentIndex, Math.max(segments.length - 1, 0));
  const segment = segments[index] || segments[0];
  const progress = segments.length ? `${index + 1} / ${segments.length}` : "0 / 0";
  const showSegmentNavigation = segments.length > 1;
  const segmentTabs = segments.map((item, itemIndex) => {
    const label = item.character || item.title || `第 ${itemIndex + 1} 段`;
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
      <span class="model-kicker">教学视频</span>
      <h2 id="detail-teaching-video-title">教学视频</h2>
      <p class="detail-subtitle">${escapeHtml(plan.title || "本次个性化教学视频")}</p>
      ${
        showSegmentNavigation
          ? `
            <div class="clip-character-tabs" aria-label="选择句子里的字">
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
            <div class="clip-controls" aria-label="教学视频控制">
              <button type="button" data-action="clip-prev" ${index <= 0 ? "disabled" : ""}>上一段</button>
              <button type="button" data-action="clip-next" ${index >= segments.length - 1 ? "disabled" : ""}>下一段</button>
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
            <span>教学短片</span>
          </div>
          <div class="detail-title-row">
            <div>
              <button class="back-button" type="button" data-view="practice">返回练习</button>
              <h1 class="detail-heading">还没有教学短片</h1>
              <p class="detail-subtitle">完成一次分析后再生成。</p>
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
          <span>个性化教学短片</span>
        </div>
        <div class="detail-title-row">
          <div>
            <button class="back-button" type="button" data-view="practice">返回练习</button>
            <h1 class="detail-heading">${escapeHtml(plan.title)}</h1>
            <p class="detail-subtitle">目标句：${escapeHtml(plan.targetText || state.targetText)}</p>
          </div>
          <div class="detail-character" aria-hidden="true">${escapeHtml(plan.targetSyllable?.character || "练")}</div>
        </div>
      </header>
      <div class="content">
        <section class="panel clip-summary">
          <span class="model-kicker">本次重点</span>
          <strong>${escapeHtml(plan.focusIssue?.title || plan.focusIssue?.focus || "发音练习")}</strong>
          <p>${escapeHtml(plan.focusIssue?.summary || "系统会根据你的分析结果安排练习。")}</p>
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

        <div class="clip-controls" aria-label="教学短片控制">
          <button type="button" data-action="clip-prev" ${index <= 0 ? "disabled" : ""}>上一段</button>
          <button type="button" data-action="clip-next" ${index >= segments.length - 1 ? "disabled" : ""}>下一段</button>
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
        text: latestScore ? `${latestScore} 分` : "未练",
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
    mirror.innerHTML = `<video autoplay muted playsinline aria-label="我的实时镜像"></video>`;
    video = mirror.querySelector("video");
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    mirror.innerHTML = `<span><strong>无法打开摄像头</strong>当前浏览器不支持摄像头预览。</span>`;
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
    mirror.innerHTML = `<span><strong>摄像头未开启</strong>请允许浏览器使用摄像头后再进入嘴型对照。</span>`;
  }
}

function stopCameraPreview() {
  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = null;
}

async function refreshTextInfo(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const response = await fetch(`/api/text-info?text=${encodeURIComponent(trimmed)}`);
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
    throw new Error("当前浏览器不支持麦克风录音，请使用 Chrome、Edge 或 Safari 新版本。 ");
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
  await analyzeRecording(blob);
}

async function analyzeRecording(blob) {
  const form = new FormData();
  form.append("text", standardPronunciationText() || state.targetText.trim());
  form.append("audio", blob, "practice.webm");
  state = reduceState(state, { type: "ANALYZE_START" });
  render();

  const response = await fetch("/api/analyze", { method: "POST", body: form });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "分析失败，请确认后端已经启动。 ");
  }
  state = reduceState(state, {
    type: "APPLY_ANALYSIS",
    result: payload,
    recordingUrl: lastRecordingObjectUrl,
    clipManifest: pronunciationClipManifest,
  });
  render();
  showToast("分析完成，结果已更新。 ");
}

function demoTeachingClipResult() {
  return {
    target_text: "光",
    pinyin_display: ["guang1"],
    communication_result: {
      readiness_score: 62,
      main_feedback: "系统发现这次最值得先练的是韵母 uang 的口型过渡。",
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
          title: "韵母 uang 需要更完整",
          summary: "目标韵母是 uang，圆唇到开口再收到后鼻音的过程还不够稳定。",
          focus: "韵母 uang",
          detail: "先圆唇发 u，再自然打开到 ang，最后把后鼻音收住。",
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
          feedback: "第一声保持平稳，重点先放在韵母口型变化。",
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
    showToast("请先输入想练习的中文句子。");
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
    standardAudio = new Audio(state.standardAudioUrl);
    state = reduceState(state, { type: "SET_PLAYING", playing: true });
    render();
    showToast(`${copy}（真人标准音）`);
    standardAudio.addEventListener("ended", () => {
      state = reduceState(state, { type: "SET_PLAYING", playing: false });
      render();
    });
    standardAudio.addEventListener("error", () => {
      state = reduceState(state, { type: "SET_PLAYING", playing: false });
      render();
      showToast("本地真人标准音无法播放，已改用系统中文朗读。");
      state = reduceState(state, { type: "SET_PLAYING", playing: false });
      speakStandardWithTts(copy, text);
    }, { once: true });
    standardAudio.play().catch(() => speakStandardWithTts(copy, text));
    return;
  }

  speakStandardWithAi(copy, text);
}

async function fetchAiStandardAudio(text) {
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "AI standard audio failed.");
  }
  return payload.audioUrl;
}

function speakStandardWithAi(copy, text) {
  state = reduceState(state, { type: "SET_PLAYING", playing: true });
  render();
  showToast("正在生成 AI 标准音。");

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
      showToast(`${copy}（AI 标准音）`);
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
    setPlaying("当前浏览器不支持标准发音播放。");
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
  showToast(`${copy}（当前为系统中文朗读）`);

  standardUtterance.onend = () => {
    state = reduceState(state, { type: "SET_PLAYING", playing: false });
    render();
  };
  standardUtterance.onerror = () => {
    state = reduceState(state, { type: "SET_PLAYING", playing: false });
    render();
    showToast("标准发音播放失败，请检查浏览器声音设置。");
  };

  window.speechSynthesis.speak(standardUtterance);
}

function playSelfRecording() {
  if (!state.lastRecordingUrl) {
    showToast("还没有可以回听的录音。");
    return;
  }
  const audio = new Audio(state.lastRecordingUrl);
  audio.play().then(() => {
    showToast("正在播放你的录音。");
  }).catch(() => {
    showToast("无法播放你的录音，请重新录一次。");
  });
}

function playSubmissionRecording(submissionId) {
  const submission = (state.taskSubmissions || []).find((item) => item.id === submissionId);
  if (!submission?.recordingUrl) {
    showToast("这条提交没有可播放录音。");
    return;
  }
  const audio = new Audio(submission.recordingUrl);
  audio.play().then(() => {
    showToast("正在播放这次作业录音。");
  }).catch(() => {
    showToast("无法播放这条录音，可能需要重新提交。");
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
      showToast("练习已重置，可以重新录音。");
      return true;
    }
    if (!state.targetText.trim()) {
      showToast("请先输入想练习的中文句子。 ");
      return true;
    }
    if (state.recordingState === "idle") {
      startRecording()
        .then(() => {
          state = reduceState(state, { type: "RECORD_START" });
          render();
          showToast("正在录音，请说出屏幕上的句子。 ");
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
    showToast("已恢复本次练习的初始数据。");
    return true;
  }

  if (action === "play" || action === "play-detail") {
    speakStandard(action === "play" ? "正在播放参考发音。" : "正在重听标准发音。");
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
      ? "已生成本次个性化教学短片。"
      : "这次分析没有发现需要生成短片的问题。");
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
    speakStandard("正在播放短片练习标准音。");
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
    showToast("进入这条录音的反馈编辑页。");
    return true;
  }

  if (action === "toggle-period") {
    showToast("进度页现在显示你的真实练习记录。");
    return true;
  }

  if (action === "teacher-task-placeholder") {
    showToast("任务包已生成；发布保存会在下一阶段接入。");
    return true;
  }

  if (action === "start-entry-assessment") {
    state = reduceState(state, { type: "START_ENTRY_ASSESSMENT" });
    render();
    app.scrollTop = 0;
    showToast("入门测评已开始，请逐题完成录音。");
    return true;
  }

  if (action === "complete-assessment-item") {
    state = reduceState(state, { type: "COMPLETE_ASSESSMENT_ITEM" });
    render();
    showToast("本题已记录，继续下一题。");
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
        showToast("正在录音，请读出本题内容。");
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
      showToast("训练包里还没有可录音的目标句。");
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
        showToast("正在录音，请读出训练包目标句。");
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
    showToast("这一小步已保存，可以继续完成下一步。");
    return true;
  }

  if (action === "submit-task-to-teacher") {
    const taskId = actionTarget.dataset.taskPractice || state.selectedTaskId;
    const beforeCount = state.taskSubmissions.length;
    state = reduceState(state, { type: "SUBMIT_TASK_TO_TEACHER", taskId });
    render();
    showToast(state.taskSubmissions.length > beforeCount ? "任务已提交给老师。" : "请先完成所有任务步骤。");
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
    showToast("阶段画像备注已保存。");
    return true;
  }

  if (action === "edit-teacher-student-summary") {
    state = reduceState(state, {
      type: "EDIT_TEACHER_STUDENT_SUMMARY",
      studentId: target.dataset.studentId || state.selectedTeacherStudentId,
    });
    render();
    showToast("可以修改阶段备注了。");
    return true;
  }

  if (action === "add-task-step") {
    const list = app.querySelector("[data-step-editor-list]");
    if (!list) return true;
    const index = list.querySelectorAll("[data-step-editor-card]").length;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = renderTeacherStepEditor({
      id: `custom-${index + 1}`,
      type: "练习",
      title: "新的练习步骤",
      instruction: "按老师要求完成这一小步。",
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
    showToast("已打开新建任务模板。");
    return true;
  }

  if (action === "delete-task-step") {
    const card = target.closest("[data-step-editor-card]");
    const list = target.closest("[data-step-editor-list]");
    if (!card || !list) return true;
    const cards = list.querySelectorAll("[data-step-editor-card]");
    if (cards.length <= 1) {
      showToast("至少保留一个任务步骤。");
      return true;
    }
    card.remove();
    renumberTeacherStepCards(list);
    showToast("已删除这个任务步骤。");
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
    showToast("入门测评画像已生成，等待老师确认训练方案。");
    return true;
  }

  if (action === "publish-assessment-task") {
    const exerciseSet = Array.from(app.querySelectorAll("[data-step-editor-card]")).map((card, index) => ({
      id: `assessment-step-${index + 1}`,
      type: card.querySelector('[data-step-field="type"]')?.value || "练习",
      title: card.querySelector('[data-step-field="title"]')?.value || `任务步骤 ${index + 1}`,
      instruction: card.querySelector('[data-step-field="instruction"]')?.value || "按老师要求完成这一小步。",
      targetText: card.querySelector('[data-step-field="targetText"]')?.value || app.querySelector('[data-field="assessment-practice-text"]')?.value || "",
      requiredCount: card.querySelector('[data-step-field="requiredCount"]')?.value || "1",
      requiresSubmission: Boolean(card.querySelector('[data-step-field="requiresSubmission"]')?.checked),
      sourceMode: card.dataset.stepMode === "bank" ? "bank" : "custom",
      bankPackageId: card.querySelector('[data-step-field="bankPackageId"]')?.value || "",
      practiceItems: (card.querySelector('[data-step-field="practiceItems"]')?.value || "")
        .split(/\n+/)
        .map((item) => item.trim())
        .filter(Boolean),
    }));
    const edits = {
      recommendation: app.querySelector('[data-field="assessment-recommendation"]')?.value || "",
      title: app.querySelector('[data-field="assessment-task-title"]')?.value || "",
      practiceText: app.querySelector('[data-field="assessment-practice-text"]')?.value || "",
      repeatCount: app.querySelector('[data-field="assessment-repeat-count"]')?.value || "",
      requiredSubmissions: app.querySelector('[data-field="assessment-required-submissions"]')?.value || "",
      items: exerciseSet.map((exercise, index) => `${index + 1}. ${exercise.title}`),
      exerciseSet,
      teacherNote: app.querySelector('[data-field="assessment-teacher-note"]')?.value || "",
    };
    state = reduceState(state, { type: "PUBLISH_ASSESSMENT_TASK", edits });
    render();
    showToast("老师修改后的初始训练任务已发布到学生端。");
    return true;
  }

  if (action === "publish-recommended-task") {
    const exerciseSet = Array.from(app.querySelectorAll("[data-step-editor-card]")).map((card, index) => ({
      id: `step-${index + 1}`,
      type: card.querySelector('[data-step-field="type"]')?.value || "练习",
      title: card.querySelector('[data-step-field="title"]')?.value || `任务步骤 ${index + 1}`,
      instruction: card.querySelector('[data-step-field="instruction"]')?.value || "按老师要求完成这一小步。",
      targetText: card.querySelector('[data-step-field="targetText"]')?.value || app.querySelector('[data-field="recommended-practice-text"]')?.value || "",
      requiredCount: card.querySelector('[data-step-field="requiredCount"]')?.value || "1",
      requiresSubmission: Boolean(card.querySelector('[data-step-field="requiresSubmission"]')?.checked),
      sourceMode: card.dataset.stepMode === "bank" ? "bank" : "custom",
      bankPackageId: card.querySelector('[data-step-field="bankPackageId"]')?.value || "",
      practiceItems: (card.querySelector('[data-step-field="practiceItems"]')?.value || "")
        .split(/\n+/)
        .map((item) => item.trim())
        .filter(Boolean),
    }));
    const edits = {
      title: app.querySelector('[data-field="recommended-task-title"]')?.value || "",
      goal: app.querySelector('[data-field="recommended-task-goal"]')?.value || "",
      practiceText: app.querySelector('[data-field="recommended-practice-text"]')?.value || "",
      suggestedDue: app.querySelector('[data-field="recommended-suggested-due"]')?.value || "",
      repeatCount: app.querySelector('[data-field="recommended-repeat-count"]')?.value || "",
      requiredSubmissions: app.querySelector('[data-field="recommended-required-submissions"]')?.value || "",
      items: exerciseSet.map((exercise, index) => `${index + 1}. ${exercise.title}`),
      exerciseSet,
      teacherNote: app.querySelector('[data-field="recommended-teacher-note"]')?.value || "",
    };
    state = reduceState(state, { type: "PUBLISH_RECOMMENDED_TASK", edits });
    state = reduceState(state, { type: "NAVIGATE_TEACHER", view: "tasks" });
    render();
    showToast("老师审核后的训练任务已发布到学生端。");
    return true;
  }

  if (action === "login-account") {
    const username = app.querySelector('[data-field="login-username"]')?.value || "";
    const password = app.querySelector('[data-field="login-password"]')?.value || "";
    const role = app.querySelector('input[name="login-role"]:checked')?.value || "";
    if (!["student", "teacher"].includes(role)) {
      showToast("请先选择学生或教师身份。");
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
    showToast(role === "teacher" ? "已登录教师端。" : "已登录学生端。");
    return true;
  }

  if (action === "logout-account") {
    state = reduceState(state, { type: "LOGOUT_ACCOUNT" });
    render();
    showToast("已退出登录。");
    return true;
  }

  if (action === "send-chat-message") {
    const input = app.querySelector('[data-field="chat-message"]');
    state = reduceState(state, { type: "SEND_CHAT_MESSAGE", body: input?.value || "" });
    render();
    showToast("消息已发送。");
    return true;
  }

  if (action === "create-class-chat") {
    const title = app.querySelector('[data-field="class-chat-title"]')?.value?.trim() || "新的班级群聊";
    const memberIds = Array.from(app.querySelectorAll('[data-field="class-chat-student"]:checked'))
      .map((input) => input.value)
      .filter(Boolean);
    if (!memberIds.length) {
      showToast("请至少选择一位学生加入群聊。");
      return true;
    }
    state = reduceState(state, { type: "CREATE_CLASS_CHAT", title, memberIds });
    render();
    showToast("班级群聊已创建。");
    return true;
  }

  if (action === "create-direct-chat") {
    const studentId = app.querySelector('[data-field="direct-chat-student"]')?.value || state.selectedTeacherStudentId;
    state = reduceState(state, { type: "CREATE_DIRECT_CHAT", studentId });
    render();
    showToast("学生私聊已创建。");
    return true;
  }

  if (action === "create-student-direct-chat") {
    state = reduceState(state, { type: "CREATE_STUDENT_DIRECT_CHAT" });
    render();
    showToast("已打开老师私聊。");
    return true;
  }

  if (action === "delete-chat-thread") {
    const threadId = target.dataset.chatThreadAction;
    const thread = (state.chatThreads || []).find((item) => item.id === threadId);
    if (!threadId || !thread) return true;
    const label = thread.type === "class" ? "群聊" : "会话";
    const confirmed = window.confirm(`确定删除“${thread.title}”${label}吗？聊天记录也会从本机演示数据中移除。`);
    if (!confirmed) return true;
    state = reduceState(state, { type: "DELETE_CHAT_THREAD", threadId });
    render();
    app.scrollTop = 0;
    showToast(thread.type === "class" ? "群聊已删除。" : "会话已删除。");
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
    showToast("已打开任务详情。");
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
    showToast("已进入该任务的录音练习。");
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
    showToast(`正在查看“${activeSyllables[state.selectedSyllable].character}”的发音详情。`);
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
    showToast("已切换学生发音档案。");
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
      feedback: feedbackInput?.value || "这次比上次更接近目标，继续把重点音放慢一点练，老师已经看到你的进步。",
    });
    render();
    app.scrollTop = 0;
    showToast("教师复评已保存，学生端可以看到老师反馈。");
    return;
  }

  const copyReportButton = target.closest("[data-copy-report]");
  if (copyReportButton) {
    navigator.clipboard?.writeText(copyReportButton.dataset.copyReport || "")
      .then(() => showToast("康复周报草稿已复制。"))
      .catch(() => showToast("当前浏览器不支持自动复制，可以直接选中周报文本。"));
    return;
  }

  const tipButton = target.closest("[data-tip]");
  if (tipButton) {
    state = reduceState(state, {
      type: "SELECT_TIP",
      tipId: tipButton.dataset.tip,
    });
    render();
    showToast(`已选中“${tipButton.querySelector(".tip-title").textContent}”建议。`);
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
    showToast(`已切换到“${text}”专项练习。`);
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
      `${wordButton.dataset.word}：${wordButton.dataset.score} 分，${wordButton.dataset.status}。`,
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
    showToast("头像已更新。");
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
  const label = thread.type === "class" ? "群聊" : "私聊";
  const confirmed = window.confirm(`删除“${thread.title}”${label}吗？删除后这个聊天会从学生端列表中移除。`);
  if (!confirmed) return;
  state = reduceState(state, { type: "DELETE_CHAT_THREAD", threadId });
  render();
  app.scrollTop = 0;
  showToast(`${label}已删除。`);
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
