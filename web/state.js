export const defaultSyllables = {
  wo: {
    id: "wo",
    character: "我",
    pinyin: "wo3",
    tone: "T3",
    score: 88,
    status: "Clear",
    level: "good",
    feedback: "The third-tone turn is natural; make the ending steadier.",
    mouthCue: "Round the lips first, then relax naturally.",
    tongueCue: "Keep the tongue relaxed and feel the oral space for final o.",
    toneCue: "Dip first, then rise; do not hold the lowest point too long.",
    targetTone: [36, 45, 62, 78, 58, 35],
    currentTone: [34, 42, 60, 72, 55, 40],
  },
  yao: {
    id: "yao",
    character: "要",
    pinyin: "yao4",
    tone: "T4",
    score: 82,
    status: "Clear",
    level: "good",
    feedback: "The falling tone direction is correct; make the onset more decisive.",
    mouthCue: "Open the mouth and let the lips spread naturally.",
    tongueCue: "Keep the tongue surface flat and let the sound fall quickly from a high point.",
    toneCue: "Fall quickly from a high point and finish cleanly.",
    targetTone: [20, 30, 42, 56, 72, 84],
    currentTone: [25, 34, 45, 58, 70, 80],
  },
  chi: {
    id: "chi",
    character: "吃",
    pinyin: "chi1",
    tone: "T1",
    score: 70,
    status: "Needs Work",
    level: "warn",
    feedback: "Move the ch onset farther back and keep the pitch steady.",
    mouthCue: "Curl the tongue tip slightly back and let the lips spread naturally.",
    tongueCue: "Place the tongue tip near the front hard palate and let airflow pass behind it.",
    toneCue: "Keep it high and level from start to finish; do not slide down.",
    targetTone: [25, 25, 25, 25, 25, 25],
    currentTone: [32, 29, 30, 34, 39, 44],
  },
  fan: {
    id: "fan",
    character: "饭",
    pinyin: "fan4",
    tone: "T4",
    score: 62,
    status: "Focus Practice",
    level: "focus",
    feedback: "The Tone 4 fall is not clear enough; drop quickly from a high pitch.",
    mouthCue: "Touch the upper teeth lightly to the lower lip and send airflow through the gap.",
    tongueCue: "Finish by touching the tongue tip lightly to the upper gum ridge to close the n nasal.",
    toneCue: "Start higher and fall quickly with a clear pitch range.",
    targetTone: [22, 31, 43, 56, 70, 82],
    currentTone: [35, 38, 43, 49, 57, 64],
  },
};

export const syllables = defaultSyllables;

export const tips = [
  { id: "mouth", title: "Lip Shape", descriptionKey: "mouthCue" },
  { id: "tongue", title: "Tongue Position", descriptionKey: "tongueCue" },
  { id: "tone", title: "Tone Focus", descriptionKey: "toneCue" },
];

export const progressByPeriod = {
  current: {
    label: "This Week",
    scores: [60, 64, 67, 70, 72, 74, 76],
    words: [
      { word: "你好", score: 88, status: "Mastered", level: "good" },
      { word: "谢谢", score: 74, status: "Keep Practicing", level: "warn" },
      { word: "我要吃饭", score: 62, status: "Focus Practice", level: "focus" },
    ],
    tones: [
      { label: "Tone 1 ā", score: 85, level: "tone-one" },
      { label: "Tone 2 á", score: 79, level: "tone-two" },
      { label: "Tone 3 ǎ", score: 71, level: "tone-three" },
      { label: "Tone 4 à", score: 58, level: "tone-four" },
    ],
  },
  previous: {
    label: "Last Week",
    scores: [59, 61, 63, 66, 68, 69, 71],
    words: [
      { word: "早上好", score: 82, status: "Mastered", level: "good" },
      { word: "没关系", score: 69, status: "Keep Practicing", level: "warn" },
      { word: "再见", score: 64, status: "Keep Practicing", level: "focus" },
    ],
    tones: [
      { label: "Tone 1 ā", score: 80, level: "tone-one" },
      { label: "Tone 2 á", score: 74, level: "tone-two" },
      { label: "Tone 3 ǎ", score: 67, level: "tone-three" },
      { label: "Tone 4 à", score: 54, level: "tone-four" },
    ],
  },
};

export const toneDrills = {
  "1": {
    label: "Tone 1 ā",
    description: "Practice a high, level tone. The key is not sliding down.",
    words: ["妈", "吃", "高", "开", "天", "书"],
  },
  "2": {
    label: "Tone 2 á",
    description: "Practice a naturally rising tone. The key is lifting at the end.",
    words: ["麻", "来", "人", "明", "学", "忙"],
  },
  "3": {
    label: "Tone 3 ǎ",
    description: "Practice dipping then rising. The key is reaching a low point in the middle.",
    words: ["马", "你", "好", "想", "水", "买"],
  },
  "4": {
    label: "Tone 4 à",
    description: "Practice falling quickly from a high point. The key is a short, firm finish.",
    words: ["骂", "饭", "去", "看", "要", "再"],
  },
};

const emptyScores = {
  score: 0,
  pitchScore: 0,
  clarityScore: 0,
  rhythmScore: 0,
};

export const TASK_STATUS_PUBLISHED = "Published";
export const TASK_STATUS_DRAFT = "Needs Teacher Review";
export const SUBMISSION_STATUS_PENDING = "Needs Teacher Feedback";
export const SUBMISSION_STATUS_REVIEWED = "Teacher Reviewed";
export const ASSESSMENT_STATUS_PENDING = "Needs Teacher Confirmation";
export const ASSESSMENT_STATUS_CONFIRMED = "Teacher Confirmed";

export const entryAssessmentItems = [
  {
    id: "initial-fan",
    type: "Initial",
    title: "Initial f + final an",
    prompt: "饭",
    pinyin: "fan4",
    focus: "f onset and an ending",
  },
  {
    id: "initial-zhi",
    type: "Retroflex",
    title: "zh/ch/sh Observation",
    prompt: "知识",
    pinyin: "zhi1 shi2",
    focus: "Stable retroflex tongue position and aspiration",
  },
  {
    id: "tone-er",
    type: "Tone",
    title: "Tone 2 Rise",
    prompt: "明天",
    pinyin: "ming2 tian1",
    focus: "Tone 2 rises naturally from low to high",
  },
  {
    id: "sentence-life",
    type: "Short Sentence",
    title: "Daily Sentence",
    prompt: "我要喝水",
    pinyin: "wo3 yao4 he1 shui3",
    focus: "Sentence clarity, pauses, and speaking rate",
  },
];

function defaultAccount() {
  return {
    isLoggedIn: false,
    isRegistered: false,
    username: "",
    displayName: "Chen Xiaohe",
    password: "",
    avatarDataUrl: "",
    lastLoginAt: "",
    registeredAt: "",
    entryAssessmentCompleted: false,
  };
}

function defaultChatThreads() {
  return [
    {
      id: "chat-direct-chen",
      type: "direct",
      title: "Chen Xiaohe",
      memberIds: ["teacher-main", "student-chen"],
      createdAt: todayKey(),
      messages: [
        {
          id: "msg-direct-chen-1",
          senderId: "teacher-main",
          senderRole: "teacher",
          senderName: "Ms. Wang",
          body: "Finish the f + an short-sentence recording first today. Reading a little slower is fine.",
          createdAt: "08:30",
          readBy: ["teacher-main"],
        },
      ],
    },
    {
      id: "chat-class-main",
      type: "class",
      title: "Qiyin Class 1 Group Chat",
      memberIds: ["teacher-main", "student-lin", "student-chen", "student-qiao"],
      createdAt: todayKey(),
      messages: [
        {
          id: "msg-class-1",
          senderId: "teacher-main",
          senderRole: "teacher",
          senderName: "Ms. Wang",
          body: "Everyone, after you finish today's assigned recordings, I will listen to them one by one.",
          createdAt: "09:05",
          readBy: ["teacher-main"],
        },
      ],
    },
  ];
}

function defaultAssessmentSession() {
  return {
    active: false,
    currentIndex: 0,
    results: [],
    completed: false,
  };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dateLabel(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function recentDateKeys(count = 7) {
  const today = new Date();
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (count - 1 - offset));
    return date.toISOString().slice(0, 10);
  });
}

function defaultPracticeHistory() {
  return [];
}

export const teacherDashboard = {
  className: "Qiyin Class 1",
  teacherName: "Ms. Wang",
  students: [
    {
      id: "student-lin",
      name: "Lin Yiyi",
      age: 8,
      stage: "Initial Stabilization Stage",
      learnerProfile: "English-speaking beginner; classroom repetition is steady",
      learningGoal: "Make everyday Mandarin sentences easier for native speakers to understand",
      focusTags: ["Unstable f onset", "Incomplete an ending", "Tone 2 rise is not clear"],
      latestScore: 72,
      weeklyPracticeCount: 5,
      pendingSubmissions: 2,
      overdueTasks: 0,
      lastPracticeAt: "Today",
      assessmentSummary: "Clarity improved from last week; final endings still need slow repetition.",
      trend: "Improving",
    },
    {
      id: "student-chen",
      name: "Chen Xiaohe",
      age: 10,
      stage: "Tone Strengthening Stage",
      learnerProfile: "Intermediate foreign learner; rhythm speeds up in longer Mandarin sentences",
      learningGoal: "Stabilize the four Mandarin tone directions and make longer sentences clearer",
      focusTags: ["Tone 3 often sounds flat", "Speaking rate is too fast", "Pauses are unnatural"],
      latestScore: 66,
      weeklyPracticeCount: 3,
      pendingSubmissions: 1,
      overdueTasks: 1,
      lastPracticeAt: "Yesterday",
      assessmentSummary: "Single-character tones are distinguishable; Tone 3 and pauses in short sentences need continued observation.",
      trend: "Needs Attention",
    },
    {
      id: "student-qiao",
      name: "Qiao An",
      age: 7,
      stage: "Final Completeness Training",
      learnerProfile: "Beginner foreign learner; practices actively with a study partner",
      learningGoal: "Complete nasal finals and build Mandarin speaking confidence",
      focusTags: ["n/l confusion", "Unstable ang ending", "Repeat-after-me volume is too low"],
      latestScore: 81,
      weeklyPracticeCount: 6,
      pendingSubmissions: 0,
      overdueTasks: 0,
      lastPracticeAt: "Today",
      assessmentSummary: "Practice frequency was strong this week, and the ang ending is clearer than last time.",
      trend: "Stable",
    },
  ],
};

const taskPackageTemplates = [
  {
    match: /Initial|onset|n\/l|zh|ch|sh|f /,
    category: "Initial Practice",
    goal: "",
    items: ["Watch mouth and tongue position once", "Repeat single sounds slowly 5 times", "Repeat 3 word sets", "Submit 1 short-sentence recording"],
  },
  {
    match: /Final|ending|an|ang|nasal/,
    category: "Final Completeness",
    goal: "Complete the final movement, especially the ending closure.",
    items: ["Observe final mouth shape once", "Read single characters slowly 5 times", "Practice 3 word sets with extended endings", "Submit 1 everyday short-sentence recording"],
  },
  {
    match: /Tone|Tone 2|Tone 3|Tone 4|rise|flat/,
    category: "Tone Practice",
    goal: "Exaggerate the tone direction first, then return to a natural speed.",
    items: ["Listen to the standard audio twice", "Repeat single-character tones 5 times", "Practice 3 same-tone word sets", "Submit 1 recording"],
  },
  {
    match: /speaking rate|pause|Rhythm/,
    category: "Rhythm and Pauses",
    goal: "Slow down at key points so the sentence is easier to understand.",
    items: ["Repeat short sentences in chunks 3 times", "Practice 2 pause-marking sets", "Submit 1 natural-speed recording"],
  },
];

export const questionBankPackages = [
  {
    id: "initial-f",
    title: "f Onset Practice Pack",
    category: "Initial",
    focusTags: ["Unstable f onset", "Labiodental sound is unclear"],
    description: "Touch the upper teeth lightly to the lower lip and send airflow between the lip and teeth.",
    items: ["饭", "飞", "风", "发音", "我要吃饭。", "风很大。"],
    targetText: "我要吃饭",
  },
  {
    id: "final-an",
    title: "an Ending Practice Pack",
    category: "Final",
    focusTags: ["Incomplete final an ending", "Nasal ending is weak"],
    description: "Close the an ending by bringing the tongue tip near the upper gum ridge; do not slide away too quickly.",
    items: ["饭", "看", "慢", "安静", "我想吃饭。", "请你慢一点。"],
    targetText: "我想吃饭",
  },
  {
    id: "final-ang",
    title: "ang Ending Practice Pack",
    category: "Final",
    focusTags: ["ang/an confusion", "Back nasal ending is unstable"],
    description: "For back nasal ang, open the mouth and close the sound toward the back; do not make it an.",
    items: ["忙", "放", "长", "上课", "我很忙。", "请放这里。"],
    targetText: "我很忙",
  },
  {
    id: "tone-three",
    title: "Tone 3 Practice Pack",
    category: "Tone",
    focusTags: ["Tone 3 often sounds flat", "Low point is not clear"],
    description: "Dip then rise, with a clear low point in the middle; do not read it flat.",
    items: ["我", "你", "好", "可以", "你好吗？", "我可以。"],
    targetText: "你好吗",
  },
  {
    id: "tone-four",
    title: "Tone 4 Practice Pack",
    category: "Tone",
    focusTags: ["Tone 4 fall is not clear", "Ending is dragged"],
    description: "Fall quickly from a high point; keep it short and firm without dragging the ending.",
    items: ["饭", "去", "看", "要", "我要去。", "我想吃饭。"],
    targetText: "我要去",
  },
  {
    id: "initial-nl",
    title: "n/l Contrast Practice Pack",
    category: "Initial",
    focusTags: ["n/l confusion", "Distinguish nasal and lateral sounds"],
    description: "n is nasal and l is lateral; focus on tongue-tip position and airflow direction.",
    items: ["你", "来", "年", "蓝色", "你来这里。", "明年再来。"],
    targetText: "你来这里",
  },
  {
    id: "retroflex",
    title: "zh/ch/sh Retroflex Practice Pack",
    category: "Initial",
    focusTags: ["Retroflex sounds are unclear", "zh/ch/sh are unstable"],
    description: "Curl the tongue tip gently backward; the position is farther back than z/c/s.",
    items: ["知", "吃", "书", "老师", "我想吃饭。", "这是我的书。"],
    targetText: "这是我的书",
  },
  {
    id: "sentence-rhythm",
    title: "Short-Sentence Rhythm Practice Pack",
    category: "Rhythm",
    focusTags: ["Pauses are unnatural", "Speaking rate is too fast", "Sentence clarity"],
    description: "Do not rush through the whole sentence; focus on pauses, clarity, and complete expression.",
    items: ["你好。", "我要喝水。", "我想吃饭。", "请你慢一点。", "我明天上课。", "老师，我听懂了。"],
    targetText: "我要喝水",
  },
];

function findQuestionBankPackage(tags = []) {
  const joined = tags.join(" ");
  return questionBankPackages.find((pack) => pack.focusTags.some((tag) => joined.includes(tag) || tag.includes(joined)))
    || (/(^|[^a-z])f([^a-z]|$)|labiodental/.test(joined) ? questionBankPackages.find((pack) => pack.id === "initial-f") : null)
    || (/ang|back nasal/.test(joined) ? questionBankPackages.find((pack) => pack.id === "final-ang") : null)
    || (/an|nasal|ending/.test(joined) ? questionBankPackages.find((pack) => pack.id === "final-an") : null)
    || (/Tone 3|flat|low point/.test(joined) ? questionBankPackages.find((pack) => pack.id === "tone-three") : null)
    || (/Tone 4|fall|drag/.test(joined) ? questionBankPackages.find((pack) => pack.id === "tone-four") : null)
    || (/n\/l|n and l|n l/.test(joined) ? questionBankPackages.find((pack) => pack.id === "initial-nl") : null)
    || (/zh|ch|sh|retroflex/.test(joined) ? questionBankPackages.find((pack) => pack.id === "retroflex") : null)
    || (/speaking rate|pause|Rhythm|Short Sentence/.test(joined) ? questionBankPackages.find((pack) => pack.id === "sentence-rhythm") : null)
    || questionBankPackages[0];
}

export function createInitialState() {
  return {
    currentRole: "guest",
    currentView: "home",
    teacherView: "home",
    recordingState: "idle",
    modelStatus: "idle",
    selectedSyllable: "fan",
    selectedTip: "tone",
    period: "current",
    playing: false,
    targetText: "我要吃饭",
    pinyinText: "wǒ yào chī fàn",
    asrHeard: "Waiting for recording analysis",
    modelSummary: "Enter a Chinese sentence to practice. After recording, the system will give tone, clarity, and rhythm feedback based on your pronunciation.",
    recordingError: "",
    analysisResult: null,
    pinyinDiagnosis: null,
    analysisSyllables: null,
    teachingPlan: null,
    selectedClipSegmentIndex: 0,
    clipPlaying: false,
    lastRecordingUrl: "",
    standardAudioUrl: "",
    selectedToneDrill: "3",
    selectedProgressDate: todayKey(),
    practiceBackView: "",
    selectedTaskId: "",
    activeTaskPracticeId: "",
    activeTaskExerciseId: "",
    activeTaskItemIndex: 0,
    taskPracticeSnapshot: null,
    taskDetailMode: false,
    selectedChatThreadId: "chat-direct-chen",
    chatMode: "list",
    assessmentSession: defaultAssessmentSession(),
    account: defaultAccount(),
    chatDraft: "",
    practiceHistory: defaultPracticeHistory(),
    teacherDashboard,
    selectedTeacherStudentId: teacherDashboard.students[0]?.id || "",
    teacherTaskMode: "recommended",
    teacherStudentFilter: "all",
    editingTeacherStudentSummaryId: "",
    selectedReviewSubmissionId: "",
    publishedTasks: [],
    taskSubmissions: [],
    taskStepProgress: {},
    taskMessages: [],
    assessmentProfiles: [],
    chatThreads: defaultChatThreads(),
    ...emptyScores,
  };
}

function normalizeUnit(value) {
  return String(value || "").toLowerCase().replaceAll("ü", "v").replaceAll("u:", "v");
}

function pinyinBodyFor(syllable) {
  return normalizeUnit(syllable?.pinyin || syllable?.pinyinDisplay || "").replace(/\d/g, "");
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

function normalizedPinyinParts(syllable) {
  const pinyinBody = pinyinBodyFor(syllable);
  const zeroInitial = splitZeroInitialSpelling(pinyinBody);
  return {
    initial: zeroInitial ? "" : normalizeUnit(syllable?.initial),
    final: zeroInitial?.final || normalizeUnit(syllable?.final),
  };
}

function manifestClipFor(manifest, type, unit) {
  const normalizedType = type === "initial" ? "initial" : "final";
  const normalizedUnit = normalizeUnit(unit);
  if (!normalizedUnit) return null;
  const clips = manifest?.clips;
  if (Array.isArray(clips)) {
    return clips.find(
      (clip) => clip.type === normalizedType && normalizeUnit(clip.unit) === normalizedUnit,
    ) || null;
  }
  return clips?.[normalizedType]?.[normalizedUnit] || null;
}

function issuePriority(issue) {
  if (["initial", "final", "syllable", "missing"].includes(issue?.type)) return 0;
  if (issue?.type === "tone") return 1;
  return 2;
}

export function selectPrimaryTeachingIssue(issues = []) {
  return [...issues]
    .filter((issue) => issue && issue.type !== "extra")
    .sort((left, right) => issuePriority(left) - issuePriority(right))
    .at(0) || null;
}

function selectTeachingIssues(issues = []) {
  return [...issues]
    .filter((issue) => issue && issue.type !== "extra")
    .sort((left, right) => {
      const leftIndex = Number(left.index ?? 0);
      const rightIndex = Number(right.index ?? 0);
      if (leftIndex !== rightIndex) return leftIndex - rightIndex;
      return issuePriority(left) - issuePriority(right);
    });
}

function findTeachingSyllable(state, issue) {
  const syllables = getSyllables(state);
  const rows = Object.values(syllables);
  if (!issue) return rows[0] || null;
  return rows.find((row) => row.issue === issue || row.issue?.index === issue.index)
    || rows.find((row) => row.id?.startsWith(`${issue.index}-`))
    || rows[issue.index]
    || rows[0]
    || null;
}

function articulationTargetsFor(issue, syllable) {
  if (!syllable) return [];
  const parts = normalizedPinyinParts(syllable);
  const initial = parts.initial;
  let final = parts.final;
  if (final === "i" && ["z", "c", "s"].includes(initial)) final = "i_z";
  if (final === "i" && ["zh", "ch", "sh", "r"].includes(initial)) final = "i_zh";
  if (issue?.type === "initial" && initial) {
    return [{ type: "initial", unit: initial, label: `Initial ${initial}` }];
  }
  if (issue?.type === "final" && final) {
    return [{ type: "final", unit: final, label: `Final ${final}` }];
  }
  return [
    initial ? { type: "initial", unit: initial, label: `Initial ${initial}` } : null,
    final ? { type: "final", unit: final, label: `Final ${final}` } : null,
  ].filter(Boolean);
}

function practiceWordsFor(issue, syllable, targetText) {
  const words = Array.isArray(issue?.practice) ? issue.practice.filter(Boolean) : [];
  if (words.length) return words;
  if (syllable?.character) return [syllable.character];
  return targetText ? [targetText] : [];
}

function selectedOrLowestScoredSyllable(state) {
  const syllables = getSyllables(state);
  const rows = Object.values(syllables);
  const selected = syllables[state.selectedSyllable] || rows.find((row) => row.id === state.selectedSyllable);
  const scored = rows
    .filter((row) => Number.isFinite(Number(row.score)) && Number(row.score) > 0)
    .sort((left, right) => Number(left.score) - Number(right.score));
  return scored[0] || selected || rows[0] || null;
}

function reviewIssueFor(syllable, targetText) {
  return {
    index: Number(syllable?.index || 0),
    type: "review",
    title: "Pronunciation Review",
    summary: "Overall pronunciation is solid. Use the teaching video to reinforce mouth shape, tongue position, and stability.",
    focus: syllable?.pinyinDisplay || syllable?.pinyin || targetText || "Pronunciation Review",
    detail: "Keep it clear and stable first, then gradually return to a natural speed.",
    practice: syllable?.character ? [syllable.character] : [],
  };
}

function teachingRowsFor(state, options = {}) {
  const syllables = getSyllables(state);
  const preferredSyllable = options.preferredSyllableId ? syllables[options.preferredSyllableId] : null;
  if (preferredSyllable) {
    const preferredIssue = preferredSyllable.issue
      || selectTeachingIssues(state?.pinyinDiagnosis?.issues || [])
        .find((issue) => Number(issue.index) === Number(preferredSyllable.index));
    return [{ issue: preferredIssue || reviewIssueFor(preferredSyllable, state.targetText), syllable: preferredSyllable }];
  }

  const shouldShowEverySyllable = options.includeAllSyllables
    || (state.currentView === "taskDetail" && state.activeTaskPracticeId && state.activeTaskExerciseId);
  if (shouldShowEverySyllable) {
    return Object.values(syllables)
      .sort((left, right) => Number(left.index) - Number(right.index))
      .map((syllable) => ({
        issue: syllable.issue || reviewIssueFor(
          syllable,
          state.analysisResult?.target_text || state.targetText,
        ),
        syllable,
      }));
  }

  const rowsBySyllable = new Map();
  selectTeachingIssues(state?.pinyinDiagnosis?.issues || []).forEach((issue) => {
    const syllable = findTeachingSyllable(state, issue);
    const key = syllable?.id || `issue-${issue.index ?? rowsBySyllable.size}`;
    if (!rowsBySyllable.has(key)) {
      rowsBySyllable.set(key, { issue, syllable });
    }
  });
  if (rowsBySyllable.size > 0) return [...rowsBySyllable.values()];

  const reviewSyllable = selectedOrLowestScoredSyllable(state);
  return reviewSyllable ? [{ issue: reviewIssueFor(reviewSyllable, state.targetText), syllable: reviewSyllable }] : [];
}

function clipItemsFor(issue, syllable, clipManifest) {
  return articulationTargetsFor(issue, syllable).map((target) => {
    const clip = manifestClipFor(clipManifest, target.type, target.unit);
    return {
      type: clip?.url ? "video-articulation" : "missing-articulation",
      title: `${target.label} Pronunciation Demo`,
      guidanceText: clip?.notes
        || (target.type === "initial"
          ? `First watch ${target.label}'s onset movement, then connect the following final.`
          : `Watch ${target.label}'s mouth-shape transition and ending, and complete the sound.`),
      unitType: target.type,
      unit: target.unit,
      videoUrl: clip?.url || "",
      videoTitle: clip?.title || `${target.label} Pronunciation Clip`,
      posterUrl: clip?.posterUrl || "",
    };
  });
}

function buildSyllableVideoTeachingPlan(state, clipManifest = {}, options = {}) {
  const targetText = state.analysisResult?.target_text || state.targetText || "";
  const rows = teachingRowsFor(state, options);
  if (!rows.length && !targetText) return null;

  const standardAudioUrl = state.standardAudioUrl || state.analysisResult?.standard_audio_url || "";
  const segments = rows.map(({ issue, syllable }, index) => {
    const title = syllable
      ? `${syllable.character} / ${syllable.pinyinDisplay || syllable.pinyin}`
      : issue?.focus || targetText || "Target Pronunciation";
    return {
      type: "syllable-video",
      title,
      guidanceText: issue?.summary || issue?.detail || "Use the demo video to reinforce this syllable.",
      issueType: issue?.type || "review",
      issue,
      syllableId: syllable?.id || "",
      syllable: syllable || null,
      character: syllable?.character || "",
      pinyin: syllable?.pinyinDisplay || syllable?.pinyin || "",
      videoClips: clipItemsFor(issue, syllable, clipManifest),
      practiceWords: practiceWordsFor(issue, syllable, targetText),
      standardAudioUrl,
      order: index,
    };
  });

  const primarySegment = segments[0] || null;
  return {
    title: segments.length > 1
      ? `${targetText || primarySegment?.title || "This Recording"} Personalized Teaching Video`
      : `${primarySegment?.title || targetText || "This Recording"} Personalized Teaching Video`,
    targetText,
    focusIssue: primarySegment?.issue || null,
    targetSyllableId: primarySegment?.syllableId || "",
    targetSyllable: primarySegment?.syllable || null,
    standardAudioUrl,
    segments,
  };
}

export function buildTeachingPlan(state, clipManifest = {}, options = {}) {
  const syllableVideoPlan = buildSyllableVideoTeachingPlan(state, clipManifest, options);
  if (syllableVideoPlan) return syllableVideoPlan;

  const issues = state?.pinyinDiagnosis?.issues || [];
  const targetText = state.analysisResult?.target_text || state.targetText || "";
  const primaryIssueFromDiagnosis = selectPrimaryTeachingIssue(issues);
  const preferredSyllable = options.preferredSyllableId
    ? getSyllables(state)[options.preferredSyllableId]
    : null;
  const syllable = preferredSyllable || findTeachingSyllable(state, primaryIssueFromDiagnosis);
  const issueMatchesSyllable = !preferredSyllable
    || primaryIssueFromDiagnosis?.index === undefined
    || Number(primaryIssueFromDiagnosis.index) === Number(preferredSyllable.index);
  const fallbackPracticeWords = practiceWordsFor(primaryIssueFromDiagnosis, syllable, targetText);
  const primaryIssue = issueMatchesSyllable && primaryIssueFromDiagnosis ? primaryIssueFromDiagnosis : {
    index: Number(syllable?.index || 0),
    type: "review",
    title: "Pronunciation Review",
    summary: "Overall pronunciation is solid. Use the teaching video to reinforce mouth shape, tongue position, and tone stability.",
    focus: syllable?.pinyinDisplay || syllable?.pinyin || "Pronunciation Review",
    detail: "Keep it clear and stable first, then gradually return to a natural speed.",
    practice: fallbackPracticeWords,
  };
  if (!syllable && !targetText) return null;

  const practiceWords = practiceWordsFor(primaryIssue, syllable, targetText);
  const targetLabel = syllable
    ? `${syllable.character} / ${syllable.pinyinDisplay || syllable.pinyin}`
    : primaryIssue.focus || "Target Pronunciation";
  const segments = [
    {
      type: "intro",
      title: "Video Focus",
      guidanceText: `This teaching video focuses only on the issue that most affects intelligibility this time: ${primaryIssue.title || primaryIssue.focus || "Target Pronunciation"}. Watch the demo first, then repeat it.`,
    },
    {
      type: "issue",
      title: "Recognition Result",
      guidanceText: primaryIssue.summary || "The system found that this syllable needs focused practice.",
    },
  ];

  articulationTargetsFor(primaryIssue, syllable).forEach((target) => {
    const clip = manifestClipFor(clipManifest, target.type, target.unit);
    segments.push({
      type: clip?.url ? "video-articulation" : "articulation",
      title: `${target.label} Pronunciation Demo`,
      guidanceText: clip?.notes
        || (target.type === "initial"
          ? `First watch ${target.label}'s onset movement, then connect the following final.`
          : `Watch ${target.label}'s mouth-shape transition and ending, and complete the sound.`),
      unitType: target.type,
      unit: target.unit,
      videoUrl: clip?.url || "",
      videoTitle: clip?.title || "",
      posterUrl: clip?.posterUrl || "",
    });
  });

  if (syllable?.tone && Array.isArray(syllable.targetTone)) {
    segments.push({
      type: "tone",
      title: `${targetLabel} Tone Contour`,
      guidanceText: syllable.toneCue || "Use the target tone line, exaggerate the direction first, then return to a natural speed.",
      targetTone: syllable.targetTone,
      currentTone: syllable.currentTone,
      hasUserPitch: syllable.hasUserPitch,
    });
  }

  segments.push({
    type: "practice",
    title: "Repeat Practice",
    guidanceText: primaryIssue.detail || "Read it slowly and accurately first, then gradually return to a natural speed.",
    practiceWords,
    standardAudioUrl: state.standardAudioUrl || state.analysisResult?.standard_audio_url || "",
  });

  return {
    title: `${targetLabel} Personalized Teaching Clip`,
    targetText,
    focusIssue: primaryIssue,
    targetSyllableId: syllable?.id || "",
    targetSyllable: syllable || null,
    segments,
  };
}

function levelFromScore(score) {
  if (score >= 82) return "good";
  if (score >= 68) return "warn";
  return "focus";
}

function statusFromScore(score) {
  if (score >= 82) return "Clear";
  if (score >= 68) return "Keep Practicing";
  return "Focus Practice";
}

function pinyinDisplay(items) {
  return Array.isArray(items) && items.length > 0 ? items.join(" ") : "";
}

function curveForTone(tone) {
  const toneNumber = String(tone || "").replace("T", "");
  if (toneNumber === "1") return [24, 24, 24, 24, 24, 24];
  if (toneNumber === "2") return [76, 65, 54, 43, 32, 22];
  if (toneNumber === "3") return [38, 54, 74, 82, 65, 45];
  if (toneNumber === "4") return [18, 30, 44, 59, 74, 86];
  return [50, 50, 50, 50, 50, 50];
}

function toneName(tone) {
  const toneNumber = String(tone || "").replace("T", "");
  if (toneNumber === "1") return "Tone 1";
  if (toneNumber === "2") return "Tone 2";
  if (toneNumber === "3") return "Tone 3";
  if (toneNumber === "4") return "Tone 4";
  if (toneNumber === "5") return "Neutral tone";
  return "Target tone";
}

function chineseToneFeedback(tone, score) {
  if (!Number.isFinite(score) || score <= 0) {
    return "After recording, the app will give advice based on your tone contour.";
  }
  if (score >= 82) return "Your tone contour is close to the target. Keep it consistent.";
  const prefix = score >= 68 ? "The overall tone direction is close, but it is not stable enough yet. " : "This syllable needs focused practice. ";
  const toneNumber = String(tone || "").replace("T", "");
  if (toneNumber === "1") return `${prefix}Tone 1 should stay high and level; avoid sliding down or wobbling.`;
  if (toneNumber === "2") return `${prefix}Tone 2 should rise naturally from a lower point, with a clearer lift at the end.`;
  if (toneNumber === "3") return `${prefix}Tone 3 should dip to a low point and then rise lightly; do not keep it flat.`;
  if (toneNumber === "4") return `${prefix}Tone 4 should fall quickly from a high point and end cleanly.`;
  return `${prefix}The neutral tone should be short and light, not dragged out.`;
}

function toneExplanation(row, tone, score) {
  if (row.tone_explanation) return row.tone_explanation;
  return `${row.char || "This syllable"} target: ${toneName(tone)}. The system simplifies your pitch movement into a red line and compares it with the green target line. Current score: ${score}. This mainly checks whether the tone trend is close; it does not mean the initial and final are fully accurate.`;
}

function toSyllableMap(result) {
  const rows = result?.tone_timing?.syllables ?? [];
  const issueByIndex = (result?.pinyin_diagnosis?.issues ?? []).reduce((items, issue) => {
    items[issue.index] = issue;
    return items;
  }, {});
  return rows.reduce((items, row) => {
    const score = Number(row.tone_score ?? 0);
    const tone = `T${row.tone || "?"}`;
    const toneCurve = row.tone_curve || {};
    const issue = issueByIndex[row.index];
    const adjustedLevel = issue ? "focus" : levelFromScore(score);
    const id = `${row.index}-${row.pinyin || row.char || "syllable"}`;
    items[id] = {
      id,
      character: row.char || "?",
      pinyin: row.pinyin || "",
      pinyinDisplay: row.pinyin_display || row.pinyin || "",
      initial: row.initial || "",
      final: row.final || "",
      tone,
      score,
      status: issue ? "May Be Inaccurate" : statusFromScore(score),
      level: adjustedLevel,
      issue,
      feedback: issue?.summary || row.feedback || chineseToneFeedback(tone, score),
      mouthCue: row.initial
        ? `Start with ${row.initial} as the onset, then complete ${row.final || "Final"}.`
        : `This syllable has no clear initial; focus on making ${row.final || "Final"} clear.`,
      tongueCue: `Use the reference diagram to practice ${row.pinyin || row.char}'s tongue position; the camera only helps with lips, so use the reference image for the tongue.`,
      toneCue: toneExplanation(row, tone, score),
      targetTone: toneCurve.target || curveForTone(tone),
      currentTone: toneCurve.user || [50, 50, 50, 50, 50, 50],
      hasUserPitch: Boolean(toneCurve.has_user_pitch),
    };
    return items;
  }, {});
}

function syllableMapFromTextInfo(info) {
  const rows = info?.syllables ?? [];
  return rows.reduce((items, row) => {
    const tone = `T${row.tone || "?"}`;
    const id = `${row.index}-${row.pinyin || row.char || "syllable"}`;
    items[id] = {
      id,
      character: row.char || "?",
      pinyin: row.pinyin || "",
      pinyinDisplay: row.pinyin_display || row.pinyin || "",
      initial: row.initial || "",
      final: row.final || "",
      tone,
      score: 0,
      status: "Awaiting Recording",
      level: "warn",
      feedback: "After recording, pronunciation clarity plus tone and rhythm feedback will appear.",
      mouthCue: row.initial
        ? `Start with ${row.initial} as the onset, then complete ${row.final || "Final"}.`
        : `This syllable has no clear initial; focus on making ${row.final || "Final"} clear.`,
      tongueCue: `Use the reference diagram to practice ${row.pinyin || row.char}'s tongue position; the camera only helps observe the lips.`,
      toneCue: `The target tone is ${tone}; after recording, compare it with your tone curve.`,
      targetTone: curveForTone(tone),
      currentTone: [50, 50, 50, 50, 50, 50],
    };
    return items;
  }, {});
}

export function getSyllables(state) {
  return state.analysisSyllables && Object.keys(state.analysisSyllables).length > 0
    ? state.analysisSyllables
    : defaultSyllables;
}

export function getTeacherStudents(state) {
  return state.teacherDashboard?.students || [];
}

export function getSelectedTeacherStudent(state) {
  const students = getTeacherStudents(state);
  return students.find((student) => student.id === state.selectedTeacherStudentId) || students[0] || null;
}

export function getTeacherStudentAttentionReasons(student) {
  const reasons = [];
  if (Number(student?.overdueTasks || 0) > 0) reasons.push("Task incomplete");
  if (Number(student?.latestScore || 0) < 70) reasons.push("Recent score is low");
  if (student?.trend === "Needs Attention") reasons.push("Trend needs attention");
  if (Number(student?.pendingSubmissions || 0) > 0) reasons.push("Recording awaiting review");
  return reasons;
}

export function getFilteredTeacherStudents(state) {
  const students = getTeacherStudents(state);
  if (state.teacherStudentFilter !== "attention") return students;
  return students.filter((student) => getTeacherStudentAttentionReasons(student).length > 0);
}

export function getTeacherDashboardSummary(state) {
  const students = getTeacherStudents(state);
  const pendingReviewCount = getPendingTeacherSubmissions(state).length;
  const pendingAssessmentCount = getPendingAssessmentProfiles(state).length;
  return {
    studentCount: students.length,
    pendingSubmissions: pendingReviewCount,
    pendingAssessments: pendingAssessmentCount,
    overdueTasks: students.reduce((total, student) => total + Number(student.overdueTasks || 0), 0),
    needsAttention: students.filter((student) => student.trend === "Needs Attention" || Number(student.overdueTasks || 0) > 0).length,
  };
}

export function buildRecommendedTaskPackage(student) {
  if (!student) return null;
  const focusTags = student.focusTags || [];
  const matchedTemplates = focusTags
    .map((tag) => {
      const template = taskPackageTemplates.find((item) => item.match.test(tag));
      return template ? { tag, ...template } : null;
    })
    .filter(Boolean);
  const primary = matchedTemplates[0] || {
    tag: focusTags[0] || "This week's pronunciation stability",
    category: "General Reinforcement",
    goal: "Keep practicing consistently and prioritize the issue that most affects intelligibility this week.",
    items: ["Listen to the standard audio twice", "Repeat single characters 5 times", "Submit 1 short-sentence recording"],
  };
  const reviewTags = [...new Set([primary.tag, ...focusTags.slice(1, 3)])];
  const bankPackage = findQuestionBankPackage(reviewTags);
  const exerciseSet = [
    {
      id: "watch",
      type: "Demo",
      title: "Watch Mouth Shape and Tongue Position",
      instruction: `First observe pronunciation movements related to "${primary.tag}", and check tongue position, mouth shape, and airflow.`,
      targetText: bankPackage.targetText || primary.practiceText || "我要吃饭",
      requiredCount: 1,
      sourceMode: "bank",
      bankPackageId: bankPackage.id,
      practiceItems: bankPackage.items,
    },
    {
      id: "sound",
      type: "Single Sound",
      title: "Slow Repetition of Focus Sounds",
      instruction: `Practice "${primary.tag}" with slow repetition, completing the movement first.`,
      targetText: bankPackage.targetText || primary.practiceText || "我要吃饭",
      requiredCount: student.latestScore < 70 ? 5 : 3,
      sourceMode: "bank",
      bankPackageId: bankPackage.id,
      practiceItems: bankPackage.items,
    },
    {
      id: "word",
      type: "Word",
      title: "Word Connection Practice",
      instruction: "Practice the focus sound inside words, and do not sacrifice clarity for speed.",
      targetText: bankPackage.targetText || primary.practiceText || "我要吃饭",
      requiredCount: 3,
      sourceMode: "bank",
      bankPackageId: bankPackage.id,
      practiceItems: bankPackage.items,
    },
    {
      id: "sentence",
      type: "Submit",
      title: "Short-Sentence Recording Submission",
      instruction: "Read the full short sentence; the system will generate an AI first pass and submit it for teacher review.",
      targetText: bankPackage.targetText || primary.practiceText || "我要吃饭",
      requiredCount: 1,
      requiresSubmission: true,
      sourceMode: "bank",
      bankPackageId: bankPackage.id,
      practiceItems: bankPackage.items,
    },
  ];
  return {
    id: `task-${student.id}-${primary.category}`,
    status: "Needs Teacher Review",
    title: `${student.name} · ${primary.category} Practice Pack`,
    targetStudentId: student.id,
    focusTag: primary.tag,
    goal: primary.goal,
    suggestedDue: "3 days",
    requiredSubmissions: 1,
    repeatCount: student.latestScore < 70 ? 5 : 3,
    practiceText: bankPackage.targetText || primary.practiceText || "我要吃饭",
    items: primary.items,
    exerciseSet,
    reviewTags,
    teacherNote: "AI created a first draft; the teacher should confirm practice volume and encouragement before publishing.",
  };
}

function applyRecommendedTaskEdits(taskPackage, edits = {}) {
  if (!taskPackage) return null;
  const cleanText = (value, fallback) => {
    const text = String(value ?? "").trim();
    return text || fallback;
  };
  const cleanNumber = (value, fallback) => {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  };
  const practiceText = cleanText(edits.practiceText, taskPackage.practiceText || "我要吃饭");
  const repeatCount = cleanNumber(edits.repeatCount, taskPackage.repeatCount || 3);
  const requiredSubmissions = cleanNumber(edits.requiredSubmissions, taskPackage.requiredSubmissions || 1);
  const hasEditedItems = Array.isArray(edits.items) && edits.items.length > 0;
  const items = hasEditedItems
    ? edits.items.map((item) => String(item).trim()).filter(Boolean)
    : taskPackage.items;
  const editedExerciseSet = Array.isArray(edits.exerciseSet)
    ? edits.exerciseSet.map((exercise, index) => ({
        id: exercise.id || `custom-${Date.now()}-${index}`,
        type: cleanText(exercise.type, index === 0 ? "Listening" : index === 1 ? "Repeat" : "Recording"),
        title: cleanText(exercise.title, `Task Step ${index + 1}`),
        instruction: cleanText(exercise.instruction, "Complete this step as assigned by the teacher."),
        targetText: cleanText(exercise.targetText, practiceText),
        requiredCount: cleanNumber(exercise.requiredCount, index === 1 ? repeatCount : 1),
        requiresSubmission: Boolean(exercise.requiresSubmission),
        sourceMode: exercise.sourceMode === "bank" ? "bank" : "custom",
        bankPackageId: exercise.bankPackageId || "",
        practiceItems: Array.isArray(exercise.practiceItems)
          ? exercise.practiceItems.map((item) => String(item).trim()).filter(Boolean)
          : [],
      })).filter((exercise) => exercise.title)
    : null;
  const exerciseSet = editedExerciseSet?.length ? editedExerciseSet : (taskPackage.exerciseSet || []).map((exercise, index) => {
    const editedTitle = hasEditedItems ? items[index] || exercise.title : exercise.title;
    const requiredCount = exercise.requiresSubmission
      ? requiredSubmissions
      : exercise.id === "sound"
        ? repeatCount
        : exercise.requiredCount;
    return {
      ...exercise,
      title: editedTitle,
      targetText: practiceText,
      requiredCount,
    };
  });
  if (exerciseSet.length && !exerciseSet.some((exercise) => exercise.requiresSubmission)) {
    exerciseSet[exerciseSet.length - 1] = {
      ...exerciseSet[exerciseSet.length - 1],
      requiresSubmission: true,
    };
  }
  return {
    ...taskPackage,
    title: cleanText(edits.title, taskPackage.title),
    goal: cleanText(edits.goal, taskPackage.goal),
    suggestedDue: cleanText(edits.suggestedDue, taskPackage.suggestedDue),
    practiceText,
    repeatCount,
    requiredSubmissions,
    items,
    exerciseSet,
    teacherNote: cleanText(edits.teacherNote, taskPackage.teacherNote),
  };
}

export function buildAssessmentProfile(student, existingCount = 0) {
  if (!student) return null;
  const focusTags = student.focusTags || [];
  const categories = focusTags.map((tag) => {
    if (/Tone|rise|flat/.test(tag)) return "Tone";
    if (/Final|ending|an|ang|nasal/.test(tag)) return "Final";
    if (/speaking rate|pause|Rhythm/.test(tag)) return "Rhythm";
    return "Initial";
  });
  const uniqueCategories = [...new Set(categories)];
  return {
    id: `assessment-${student.id}-${existingCount + 1}`,
    studentId: student.id,
    studentName: student.name,
    completedAt: todayKey(),
    status: "Needs Teacher Confirmation",
    overallScore: student.latestScore,
    profileSummary: `${student.name}'s entry assessment shows: ${student.assessmentSummary}`,
    issueTags: focusTags,
    issueCategories: uniqueCategories,
    recommendation: uniqueCategories.length
      ? `Start with ${uniqueCategories.slice(0, 2).join("、")} using short, frequent practice.`
      : "Keep short daily repetition first and observe changes in stability.",
  };
}

export function buildInitialTaskFromAssessment(profile, edits = {}) {
  if (!profile) return null;
  const practiceText = String(edits.practiceText || "我要喝水").trim() || "我要喝水";
  const teacherItems = Array.isArray(edits.items)
    ? edits.items.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const items = teacherItems.length
    ? teacherItems
    : [
        "Listen to the standard audio twice",
        "Repeat focus sounds slowly 5 times",
        "Submit 1 everyday short-sentence recording",
      ];
  const repeatCount = Number(edits.repeatCount || 0) > 0
    ? Number(edits.repeatCount)
    : profile.overallScore < 70 ? 5 : 3;
  const requiredSubmissions = Number(edits.requiredSubmissions || 0) > 0
    ? Number(edits.requiredSubmissions)
    : 1;
  const editedExerciseSet = Array.isArray(edits.exerciseSet)
    ? edits.exerciseSet.map((exercise, index) => ({
        id: exercise.id || `assessment-step-${index + 1}`,
        type: String(exercise.type || (index === 0 ? "Listening" : index === 1 ? "Repeat" : "Submit")).trim(),
        title: String(exercise.title || items[index] || `Task Step ${index + 1}`).trim(),
        instruction: String(exercise.instruction || "Complete this step as assigned by the teacher.").trim(),
        targetText: String(exercise.targetText || practiceText).trim(),
        requiredCount: Number(exercise.requiredCount || 0) > 0 ? Number(exercise.requiredCount) : (index === 1 ? repeatCount : 1),
        requiresSubmission: Boolean(exercise.requiresSubmission),
        sourceMode: exercise.sourceMode === "bank" ? "bank" : "custom",
        bankPackageId: exercise.bankPackageId || "",
        practiceItems: Array.isArray(exercise.practiceItems)
          ? exercise.practiceItems.map((item) => String(item).trim()).filter(Boolean)
          : [],
      })).filter((exercise) => exercise.title)
    : [];
  const exerciseSet = editedExerciseSet.length
    ? editedExerciseSet
    : [
        {
          id: "listen",
          type: "Listening",
          title: items[0] || "Listen to Standard Audio",
          instruction: "Listen to the standard audio first and confirm the target pronunciation and rhythm.",
          targetText: practiceText,
          requiredCount: 2,
        },
        {
          id: "focus",
          type: "Repeat",
          title: items[1] || "Slow Repetition of Focus Sounds",
          instruction: `Practice "${profile.issueTags[0] || "focus sound"}" slowly, prioritizing complete movements.`,
          targetText: practiceText,
          requiredCount: repeatCount,
        },
        {
          id: "sentence",
          type: "Submit",
          title: items[2] || "Everyday Short-Sentence Recording Submission",
          instruction: "Read the full short sentence. After submission, the teacher will review it in the grading center.",
          targetText: practiceText,
          requiredCount: requiredSubmissions,
          requiresSubmission: true,
        },
      ];
  if (exerciseSet.length && !exerciseSet.some((exercise) => exercise.requiresSubmission)) {
    exerciseSet[exerciseSet.length - 1] = {
      ...exerciseSet[exerciseSet.length - 1],
      requiresSubmission: true,
    };
  }
  return {
    id: `initial-task-${profile.id}`,
    status: "Published",
    title: String(edits.title || `${profile.studentName} · Entry Assessment Practice Pack`).trim() || `${profile.studentName} · Entry Assessment Practice Pack`,
    targetStudentId: profile.studentId,
    focusTag: profile.issueTags[0] || "Entry Assessment Reinforcement",
    goal: String(edits.recommendation || profile.recommendation || "").trim() || profile.recommendation,
    suggestedDue: String(edits.suggestedDue || "Due this week").trim() || "Due this week",
    requiredSubmissions,
    repeatCount,
    practiceText,
    items,
    exerciseSet,
    reviewTags: profile.issueTags.slice(0, 3),
    teacherNote: String(edits.teacherNote || "This task was generated from the entry assessment profile and published after teacher confirmation.").trim(),
    sourceAssessmentId: profile.id,
  };
}

export function getPublishedTasks(state) {
  return state.publishedTasks || [];
}

function isPublishedTask(task) {
  return task?.status === TASK_STATUS_PUBLISHED || task?.status === "Published";
}

export function getTodayStudentTask(state) {
  return getPublishedTasks(state).find((task) => isPublishedTask(task)) || null;
}

export function getSelectedStudentTask(state) {
  const tasks = getPublishedTasks(state).filter((task) => isPublishedTask(task));
  return tasks.find((task) => task.id === state.selectedTaskId) || getTodayStudentTask(state);
}

export function getAssessmentProfiles(state) {
  return state.assessmentProfiles || [];
}

export function getPendingAssessmentProfiles(state) {
  return getAssessmentProfiles(state).filter((profile) => profile.status === ASSESSMENT_STATUS_PENDING);
}

export function getSelectedAssessmentProfile(state) {
  const student = getSelectedTeacherStudent(state);
  if (!student) return null;
  return getAssessmentProfiles(state)
    .filter((profile) => profile.studentId === student.id)
    .at(-1) || null;
}

export function buildTeacherClassProgress(state) {
  const students = getTeacherStudents(state);
  const publishedTasks = getPublishedTasks(state);
  const submissions = getTaskSubmissions(state);
  const assessmentProfiles = getAssessmentProfiles(state);
  const studentCount = students.length || 1;
  const completedStudentIds = new Set(submissions.map((submission) => submission.studentId));
  const completionRate = Math.round((completedStudentIds.size / studentCount) * 100);
  const averageLatestScore = Math.round(
    students.reduce((total, student) => total + Number(student.latestScore || 0), 0) / studentCount,
  );
  const taskCoverageRate = Math.round(
    (new Set(publishedTasks.map((task) => task.targetStudentId)).size / studentCount) * 100,
  );
  const focusCounts = students
    .flatMap((student) => student.focusTags || [])
    .reduce((items, tag) => {
      items[tag] = (items[tag] || 0) + 1;
      return items;
    }, {});
  const commonFocusTags = Object.entries(focusCounts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([tag, count]) => ({ tag, count }));
  const attentionStudents = students
    .filter((student) => student.trend === "Needs Attention" || Number(student.overdueTasks || 0) > 0 || Number(student.latestScore || 0) < 70)
    .map((student) => ({
      id: student.id,
      name: student.name,
      reason: student.overdueTasks ? "Has overdue tasks" : student.latestScore < 70 ? "Recent assessment score is low" : "Trend needs attention",
      score: student.latestScore,
    }));
  return {
    studentCount: students.length,
    completionRate,
    taskCoverageRate,
    averageLatestScore,
    totalPublishedTasks: publishedTasks.length,
    totalSubmissions: submissions.length,
    confirmedAssessments: assessmentProfiles.filter((profile) => profile.status === "Teacher Confirmed").length,
    pendingAssessments: getPendingAssessmentProfiles(state).length,
    commonFocusTags,
    attentionStudents,
  };
}

export function getTaskSubmissions(state) {
  return state.taskSubmissions || [];
}

export function getPendingTeacherSubmissions(state) {
  return getTaskSubmissions(state).filter((submission) => submission.status === "Needs Teacher Feedback");
}

export function getReviewedTaskSubmissions(state) {
  return getTaskSubmissions(state).filter((submission) => submission.status === "Teacher Reviewed");
}

export function getLatestStudentFeedback(state) {
  return getReviewedTaskSubmissions(state).at(-1) || null;
}

export function getTaskMessages(state, filters = {}) {
  return (state.taskMessages || []).filter((message) => {
    if (filters.studentId && message.studentId !== filters.studentId) return false;
    if (filters.taskId && message.taskId !== filters.taskId) return false;
    if (filters.submissionId && message.submissionId !== filters.submissionId) return false;
    return true;
  });
}

export function getStudentTaskMessages(state) {
  const task = getTodayStudentTask(state);
  if (!task) return [];
  return getTaskMessages(state, { taskId: task.id, studentId: task.targetStudentId });
}

export function getSelectedTeacherMessages(state) {
  const student = getSelectedTeacherStudent(state);
  if (!student) return [];
  return getTaskMessages(state, { studentId: student.id }).slice(-6);
}

function currentParticipantId(state) {
  return state.currentRole === "teacher" ? "teacher-main" : "student-chen";
}

function normalizeThreadMessages(thread) {
  return Array.isArray(thread?.messages) ? thread.messages : [];
}

export function getChatThreads(state, role = state.currentRole) {
  const participantId = role === "teacher" ? "teacher-main" : "student-chen";
  return (state.chatThreads || []).filter((thread) => (
    (thread.memberIds || []).includes(participantId)
  ));
}

export function getSelectedChatThread(state, role = state.currentRole) {
  const threads = getChatThreads(state, role);
  return threads.find((thread) => thread.id === state.selectedChatThreadId) || threads[0] || null;
}

export function getUnreadChatCount(state, thread, role = state.currentRole) {
  const participantId = role === "teacher" ? "teacher-main" : "student-chen";
  return normalizeThreadMessages(thread).filter((message) => (
    message.senderId !== participantId && !(message.readBy || []).includes(participantId)
  )).length;
}

export function getTotalUnreadChatCount(state, role = state.currentRole) {
  return getChatThreads(state, role).reduce((total, thread) => total + getUnreadChatCount(state, thread, role), 0);
}

export function getEntryAssessmentItems() {
  return entryAssessmentItems;
}

export function buildStudentAssessmentReport(state, student = getSelectedTeacherStudent(state)) {
  if (!student) return null;
  const submissions = getTaskSubmissions(state).filter((submission) => submission.studentId === student.id);
  const reviewed = submissions.filter((submission) => submission.status === "Teacher Reviewed");
  const latestSubmission = submissions.at(-1) || null;
  const averageAiScore = submissions.length
    ? Math.round(submissions.reduce((total, item) => total + Number(item.aiScores?.overall || 0), 0) / submissions.length)
    : student.latestScore;
  const teacherAverage = reviewed.length
    ? Math.round(reviewed.reduce((total, item) => total + Number(item.teacherScore || 0), 0) / reviewed.length)
    : null;
  const focusAreas = [...new Set([
    ...(student.focusTags || []).slice(0, 3),
    latestSubmission?.diagnosisSummary,
  ].filter(Boolean))];
  const strengths = [
    student.weeklyPracticeCount >= 5 ? "Practice frequency is stable this week" : "Has started building a steady practice routine",
    student.trend === "Improving" ? "Clarity improved from the previous stage" : "Can complete the core teacher-assigned practice",
    reviewed.length ? "Has received teacher feedback and can continue practicing from suggestions" : "AI first-pass results have entered the teacher review flow",
  ];
  const nextSteps = focusAreas.length
    ? focusAreas.slice(0, 3).map((tag) => `Practice "${tag}" in short, frequent sessions`)
    : ["Keep 5 minutes of slow repetition and recording review each day"];
  return {
    studentId: student.id,
    studentName: student.name,
    stage: student.stage,
    latestScore: student.latestScore,
    averageAiScore,
    teacherAverage,
    weeklyPracticeCount: student.weeklyPracticeCount,
    completedSubmissions: submissions.length,
    reviewedSubmissions: reviewed.length,
    pendingSubmissions: submissions.filter((submission) => submission.status === "Needs Teacher Feedback").length,
    focusAreas,
    strengths,
    nextSteps,
    conclusion: student.assessmentSummary,
  };
}

export function buildMandarinWeeklyReport(state, student = getSelectedTeacherStudent(state)) {
  const report = buildStudentAssessmentReport(state, student);
  if (!report) return "";
  const scoreText = report.teacherAverage
    ? `Teacher feedback average ${report.teacherAverage}, AI first-pass average ${report.averageAiScore}`
    : `Current reference score ${report.averageAiScore}; waiting for more teacher reviews to form a stable average`;
  return [
    `【See My Voice Mandarin Progress Report】${report.studentName}`,
    `Learning stage: ${report.stage}`,
    `This week's practice: ${report.weeklyPracticeCount} sessions, recordings submitted ${report.completedSubmissions}, teacher feedback completed ${report.reviewedSubmissions} times`,
    `Score overview: ${scoreText}`,
    `Main progress: ${report.strengths.join("; ")}`,
    `Still needs attention: ${report.focusAreas.join("; ") || "Maintain current pronunciation stability"}`,
    `Next-week suggestions: ${report.nextSteps.join("; ")}`,
    `Teacher note: ${report.conclusion}`,
  ].join("\n");
}

export function buildParentCompanionSummary(state, student = getSelectedTeacherStudent(state)) {
  if (!student) return null;
  const todayTask = getTodayStudentTask(state);
  const latestFeedback = getLatestStudentFeedback(state);
  const messages = getStudentTaskMessages(state).slice(-3);
  const report = buildStudentAssessmentReport(state, student);
  const focusText = todayTask?.focusTag || report.focusAreas[0] || "today's focus sound";
  return {
    studentName: student.name,
    todayTitle: todayTask?.title || "Today's Short Companion Practice",
    todayGoal: todayTask?.goal || `Practice "${focusText}" slowly with the child: clear first, then natural.`,
    practiceItems: todayTask?.items?.slice(0, 3) || [
      "Listen to the standard audio once",
      "Repeat slowly with the child 3 times",
      "Record one short sentence for the teacher",
    ],
    teacherAdvice: latestFeedback?.teacherFeedback
      || messages.at(-1)?.body
      || student.assessmentSummary,
    encouragement: latestFeedback
      ? "The teacher has seen this practice. Continue reinforcing it with the suggestion."
      : "First notice whether the child is willing to speak and whether it is clearer than last time.",
    companionTips: [
      "Keep each companion practice around 5 minutes; small, frequent sessions are more stable.",
      "When it is unclear, first ask the child to slow down instead of saying it is wrong.",
      'After finishing, give specific encouragement, such as "this sound is clearer than before."',
    ],
    weeklyPlainReport: `${student.name} practiced ${report.weeklyPracticeCount} times this week. Focus: ${report.focusAreas.slice(0, 2).join(", ") || focusText}. ${report.conclusion}`,
  };
}

export function getCalendarDays(state, count = 14) {
  const practiced = new Set((state.practiceHistory || []).map((item) => item.date));
  const selectedDate = state.selectedProgressDate || todayKey();
  const today = new Date();
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (count - 1 - offset));
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      label: dateLabel(key),
      practiced: practiced.has(key),
      today: key === todayKey(),
      selected: key === selectedDate,
    };
  });
}

export function getStreak(state) {
  const practiced = new Set((state.practiceHistory || []).map((item) => item.date));
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!practiced.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function rhythmScoreFromResult(result) {
  if (result?.tone_timing?.boundary_confidence === "low") return 62;
  if (result?.tone_timing?.boundary_confidence === "medium") return 78;
  return 88;
}

function analysisScoreSnapshot(result) {
  return {
    overall: Number(result?.communication_result?.readiness_score ?? 0),
    tone: Number(result?.tone_timing?.overall_score ?? 0),
    clarity: Number(result?.asr?.text_similarity ?? 0),
    rhythm: rhythmScoreFromResult(result),
  };
}

function appendPracticeHistory(state, result) {
  const scores = analysisScoreSnapshot(result);
  const entry = {
    date: todayKey(),
    text: result?.target_text || state.targetText,
    score: scores.overall,
    toneScore: scores.tone,
    clarityScore: scores.clarity,
    rhythmScore: scores.rhythm,
  };
  return [...(state.practiceHistory || []), entry].slice(-40);
}

function buildTaskSubmission(state, result, recordingUrl) {
  const task = state.activeTaskPracticeId
    ? getPublishedTasks(state).find((item) => item.id === state.activeTaskPracticeId)
    : null;
  if (!task) return null;
  const student = getTeacherStudents(state).find((item) => item.id === task.targetStudentId) || null;
  const exercise = (task.exerciseSet || []).find((item) => item.id === state.activeTaskExerciseId)
    || (task.exerciseSet || []).find((item) => item.requiresSubmission)
    || null;
  return {
    id: `submission-${task.id}-${todayKey()}-${(state.taskSubmissions || []).length + 1}`,
    taskId: task.id,
    taskTitle: task.title,
    taskGoal: task.goal,
    taskFocusTag: task.focusTag,
    taskReviewTags: task.reviewTags || [],
    taskTeacherNote: task.teacherNote || "",
    exerciseId: exercise?.id || "",
    exerciseTitle: exercise?.title || "Short-Sentence Recording Submission",
    exerciseInstruction: exercise?.instruction || "",
    studentId: task.targetStudentId,
    studentName: student?.name || "Student",
    submittedAt: todayKey(),
    targetText: result?.target_text || state.targetText,
    heardText: result?.asr?.heard_text || "",
    recordingUrl: recordingUrl || "",
    aiScores: analysisScoreSnapshot(result),
    aiSummary: result?.communication_result?.main_feedback || "",
    diagnosisSummary: result?.pinyin_diagnosis?.summary || "",
    analysisResult: result,
    pinyinDiagnosis: result?.pinyin_diagnosis ?? null,
    syllables: toSyllableMap(result),
    pinyinText: pinyinDisplay(result?.pinyin_display || result?.pinyin) || "",
    rhythmScore: rhythmScoreFromResult(result),
    status: SUBMISSION_STATUS_PENDING,
    teacherFeedback: "",
  };
}

function taskPracticeItemsForExercise(exercise, task, fallbackText = "") {
  if (Array.isArray(exercise?.practiceItems) && exercise.practiceItems.length) {
    return exercise.practiceItems.map((item) => String(item).trim()).filter(Boolean);
  }
  if (exercise?.targetText) return [String(exercise.targetText).trim()].filter(Boolean);
  if (task?.practiceText) return [String(task.practiceText).trim()].filter(Boolean);
  return [String(fallbackText || "").trim()].filter(Boolean);
}

function buildTaskStepProgress(state, existingProgress = {}, exercise, task, action = {}) {
  const practiceItems = taskPracticeItemsForExercise(exercise, task, state.targetText);
  const activeItemIndex = Math.min(
    Math.max(Number(action.itemIndex ?? state.activeTaskItemIndex ?? 0), 0),
    Math.max(practiceItems.length - 1, 0),
  );
  const result = action.result || state.analysisResult || {};
  const itemRecord = {
    completed: true,
    completedAt: todayKey(),
    itemIndex: activeItemIndex,
    targetText: practiceItems[activeItemIndex] || exercise.targetText || task.practiceText,
    analysisResult: result,
    recordingUrl: action.recordingUrl || state.lastRecordingUrl || "",
    aiScores: analysisScoreSnapshot(result),
    aiSummary: result?.communication_result?.main_feedback || "",
    pinyinDiagnosis: result?.pinyin_diagnosis || null,
    syllables: toSyllableMap(result),
  };
  const itemRecords = [...(existingProgress.items || [])];
  itemRecords[activeItemIndex] = itemRecord;
  const completedItems = itemRecords.filter((item) => item?.completed).length;
  const lastCompletedItem = itemRecords.filter((item) => item?.completed).at(-1) || itemRecord;
  return {
    ...existingProgress,
    completed: practiceItems.length > 0 && completedItems >= practiceItems.length,
    completedAt: completedItems >= practiceItems.length ? todayKey() : existingProgress.completedAt || "",
    exerciseId: exercise.id,
    exerciseTitle: exercise.title,
    targetText: lastCompletedItem.targetText,
    items: itemRecords,
    totalItems: practiceItems.length,
    completedItems,
    analysisResult: lastCompletedItem.analysisResult,
    recordingUrl: lastCompletedItem.recordingUrl,
    aiScores: lastCompletedItem.aiScores,
    aiSummary: lastCompletedItem.aiSummary,
    pinyinDiagnosis: lastCompletedItem.pinyinDiagnosis,
    syllables: lastCompletedItem.syllables,
  };
}

function buildTeacherReviewMessage(state, submission, action) {
  const feedback = action.feedback || "This is improving. Keep practicing with the teacher's suggestion.";
  return {
    id: `message-${submission.id}-${todayKey()}-${(state.taskMessages || []).length + 1}`,
    taskId: submission.taskId,
    submissionId: submission.id,
    studentId: submission.studentId,
    studentName: submission.studentName,
    senderRole: "teacher",
    senderName: state.teacherDashboard?.teacherName || "teacher",
    createdAt: todayKey(),
    body: feedback,
    kind: "review-feedback",
    relatedText: submission.targetText,
  };
}

function assessmentResultFromAnalysis(state, result, action) {
  const item = entryAssessmentItems[state.assessmentSession?.currentIndex || 0];
  if (!item) return null;
  const scores = analysisScoreSnapshot(result);
  return {
    itemId: item.id,
    title: item.title,
    prompt: item.prompt,
    pinyin: item.pinyin,
    focus: item.focus,
    score: scores.overall || Number(action.score || 0) || 70,
    note: result?.communication_result?.main_feedback || result?.pinyin_diagnosis?.summary || `${item.focus} needs continued observation.`,
    aiScores: scores,
    heardText: result?.asr?.heard_text || "",
  };
}

export function reduceState(state, action) {
  switch (action.type) {
    case "SELECT_ROLE":
      if (action.role === "student") {
        return {
          ...state,
          currentRole: "student",
          currentView: ["practice", "tasks", "detail", "progress", "toneDrill", "teachingClip", "account", "chat", "taskDetail", "entryAssessment"].includes(state.currentView)
            ? state.currentView
            : "practice",
          playing: false,
          clipPlaying: false,
        };
      }
      if (action.role === "teacher") {
        return {
          ...state,
          currentRole: "teacher",
          currentView: "teacher",
          teacherView: state.teacherView || "home",
          playing: false,
          clipPlaying: false,
        };
      }
      return state;
    case "NAVIGATE":
      if (action.view === "home") {
        return { ...state, currentRole: "guest", currentView: "home", playing: false, clipPlaying: false };
      }
      if (!["practice", "tasks", "detail", "progress", "toneDrill", "teachingClip", "account", "chat", "taskDetail", "entryAssessment"].includes(action.view)) return state;
      return {
        ...state,
        currentRole: "student",
        currentView: action.view,
        chatMode: action.view === "chat" ? "list" : state.chatMode,
        playing: false,
        clipPlaying: false,
      };
    case "NAVIGATE_TEACHER":
      if (action.view === "account") {
        return { ...state, currentRole: "teacher", currentView: "account", playing: false, clipPlaying: false };
      }
      if (!["home", "students", "tasks", "assessmentEditor", "taskPackageEditor", "reviews", "reviewEditor", "chat"].includes(action.view)) return state;
      return {
        ...state,
        currentRole: "teacher",
        currentView: "teacher",
        teacherView: action.view,
        selectedReviewSubmissionId: action.submissionId || (action.view === "reviews" ? "" : state.selectedReviewSubmissionId),
        teacherStudentFilter: action.view === "students"
          ? (["all", "attention"].includes(action.studentFilter) ? action.studentFilter : "all")
          : state.teacherStudentFilter,
        teacherTaskMode: action.view === "tasks" ? (action.taskMode || state.teacherTaskMode || "recommended") : state.teacherTaskMode,
        chatMode: action.view === "chat" ? "list" : state.chatMode,
        playing: false,
        clipPlaying: false,
      };
    case "SELECT_STUDENT_TASK":
      if (!getPublishedTasks(state).some((task) => task.id === action.taskId)) return state;
      return {
        ...state,
        currentRole: "student",
        currentView: "taskDetail",
        selectedTaskId: action.taskId,
        activeTaskPracticeId: "",
        activeTaskExerciseId: "",
        activeTaskItemIndex: 0,
        playing: false,
        clipPlaying: false,
      };
    case "RESTORE_CUSTOM_PRACTICE": {
      const snapshot = state.taskPracticeSnapshot;
      if (!snapshot) return {
        ...state,
        taskDetailMode: false,
        activeTaskPracticeId: "",
        activeTaskExerciseId: "",
        activeTaskItemIndex: 0,
      };
      return {
        ...state,
        ...snapshot,
        currentRole: "student",
        currentView: "practice",
        taskDetailMode: false,
        activeTaskPracticeId: "",
        activeTaskExerciseId: "",
        activeTaskItemIndex: 0,
        taskPracticeSnapshot: null,
      };
    }
    case "START_TASK_PRACTICE": {
      const task = getPublishedTasks(state).find((item) => item.id === action.taskId && isPublishedTask(item));
      if (!task) return state;
      const activeExercise = (task.exerciseSet || []).find((exercise) => exercise.id === action.exerciseId)
        || (task.exerciseSet || []).find((exercise) => exercise.requiresSubmission)
        || (task.exerciseSet || [])[0];
      const practiceItems = Array.isArray(activeExercise?.practiceItems) && activeExercise.practiceItems.length
        ? activeExercise.practiceItems
        : activeExercise?.targetText
          ? [activeExercise.targetText]
          : [task.practiceText || state.targetText].filter(Boolean);
      const activeItemIndex = Math.min(Math.max(Number(action.itemIndex || 0), 0), Math.max(practiceItems.length - 1, 0));
      const taskTargetText = practiceItems[activeItemIndex] || activeExercise?.targetText || task.practiceText || state.targetText;
      const taskPracticeSnapshot = state.activeTaskPracticeId
        ? state.taskPracticeSnapshot
        : {
            targetText: state.targetText,
            pinyinText: state.pinyinText,
            asrHeard: state.asrHeard,
            modelSummary: state.modelSummary,
            recordingError: state.recordingError,
            analysisResult: state.analysisResult,
            pinyinDiagnosis: state.pinyinDiagnosis,
            analysisSyllables: state.analysisSyllables,
            teachingPlan: state.teachingPlan,
            selectedSyllable: state.selectedSyllable,
            lastRecordingUrl: state.lastRecordingUrl,
            standardAudioUrl: state.standardAudioUrl,
            recordingState: state.recordingState,
            modelStatus: state.modelStatus,
            score: state.score,
            pitchScore: state.pitchScore,
            clarityScore: state.clarityScore,
            rhythmScore: state.rhythmScore,
            practiceHistory: state.practiceHistory,
          };
      return {
        ...state,
        currentRole: "student",
        currentView: "taskDetail",
        selectedTaskId: task.id,
        activeTaskPracticeId: task.id,
        activeTaskExerciseId: activeExercise?.id || "",
        activeTaskItemIndex: activeItemIndex,
        targetText: taskTargetText,
        taskPracticeSnapshot,
        recordingState: "idle",
        modelStatus: "idle",
        recordingError: "",
        analysisResult: null,
        pinyinDiagnosis: null,
        analysisSyllables: null,
        teachingPlan: null,
        selectedClipSegmentIndex: 0,
        clipPlaying: false,
        lastRecordingUrl: "",
        standardAudioUrl: "",
        practiceBackView: "",
        asrHeard: "Waiting for recording analysis",
        modelSummary: `Working on practice pack: ${task.title}. After recording analysis, it will be submitted to the teacher automatically.`,
        ...emptyScores,
      };
    }
    case "SAVE_TASK_STEP": {
      const task = getPublishedTasks(state).find((item) => item.id === action.taskId && isPublishedTask(item));
      if (!task) return state;
      const exercise = (task.exerciseSet || []).find((item) => item.id === action.exerciseId)
        || (task.exerciseSet || [])[0];
      if (!exercise) return state;
      const taskProgress = state.taskStepProgress?.[task.id] || {};
      const updatedStepProgress = buildTaskStepProgress(state, taskProgress[exercise.id], exercise, task, action);
      const nextItemIndex = Math.min(
        Number(action.nextItemIndex ?? 0),
        Math.max((updatedStepProgress.totalItems || 1) - 1, 0),
      );
      return {
        ...state,
        currentRole: "student",
        currentView: "taskDetail",
        selectedTaskId: task.id,
        activeTaskPracticeId: updatedStepProgress.completed ? "" : (action.keepExerciseActive ? task.id : ""),
        activeTaskExerciseId: updatedStepProgress.completed ? "" : (action.keepExerciseActive ? exercise.id : ""),
        activeTaskItemIndex: updatedStepProgress.completed ? 0 : nextItemIndex,
        taskStepProgress: {
          ...(state.taskStepProgress || {}),
          [task.id]: {
            ...taskProgress,
            [exercise.id]: updatedStepProgress,
          },
        },
        modelStatus: "complete",
        recordingState: "idle",
        modelSummary: `Saved "${exercise.title}". Continue to the next step.`,
      };
    }
    case "SELECT_TEACHER_STUDENT":
      if (!getTeacherStudents(state).some((student) => student.id === action.studentId)) return state;
      return { ...state, selectedTeacherStudentId: action.studentId, currentRole: "teacher", currentView: "teacher" };
    case "EDIT_TEACHER_STUDENT_SUMMARY": {
      const studentId = action.studentId || state.selectedTeacherStudentId;
      if (!getTeacherStudents(state).some((student) => student.id === studentId)) return state;
      return { ...state, editingTeacherStudentSummaryId: studentId };
    }
    case "UPDATE_TEACHER_STUDENT_SUMMARY": {
      const studentId = action.studentId || state.selectedTeacherStudentId;
      const summary = String(action.summary || "").trim();
      if (!studentId || !summary) return state;
      return {
        ...state,
        teacherDashboard: {
          ...state.teacherDashboard,
          students: getTeacherStudents(state).map((student) => (
            student.id === studentId
              ? { ...student, assessmentSummary: summary }
              : student
          )),
        },
        editingTeacherStudentSummaryId: "",
      };
    }
    case "START_NEW_TEACHER_TASK":
      return {
        ...state,
        currentRole: "teacher",
        currentView: "teacher",
        teacherView: "taskPackageEditor",
        teacherTaskMode: "new",
      };
    case "PUBLISH_RECOMMENDED_TASK": {
      const student = getSelectedTeacherStudent(state);
      const taskPackage = applyRecommendedTaskEdits(buildRecommendedTaskPackage(student), action.edits || {});
      if (!taskPackage) return state;
      const publishedTask = {
        ...taskPackage,
        status: TASK_STATUS_PUBLISHED,
        publishedAt: todayKey(),
      };
      return {
        ...state,
        publishedTasks: [
          ...(state.publishedTasks || []).filter((task) => task.targetStudentId !== publishedTask.targetStudentId),
          publishedTask,
        ],
        teacherTaskMode: "recommended",
      };
    }
    case "SUBMIT_TASK_TO_TEACHER": {
      const task = getPublishedTasks(state).find((item) => item.id === action.taskId && isPublishedTask(item));
      if (!task) return state;
      const exerciseSet = task.exerciseSet || [];
      const taskProgress = state.taskStepProgress?.[task.id] || {};
      const completedSteps = exerciseSet.filter((exercise) => taskProgress[exercise.id]?.completed);
      const requiredSubmitExercise = exerciseSet.find((exercise) => exercise.requiresSubmission) || exerciseSet.at(-1);
      const savedSubmitStep = requiredSubmitExercise ? taskProgress[requiredSubmitExercise.id] : Object.values(taskProgress).at(-1);
      if (!exerciseSet.length || completedSteps.length < exerciseSet.length || !savedSubmitStep) return state;
      const result = savedSubmitStep.analysisResult || {};
      const student = getTeacherStudents(state).find((item) => item.id === task.targetStudentId) || null;
      const taskSubmission = {
        id: `submission-${task.id}-${todayKey()}-${(state.taskSubmissions || []).length + 1}`,
        taskId: task.id,
        taskTitle: task.title,
        taskGoal: task.goal,
        taskFocusTag: task.focusTag,
        taskReviewTags: task.reviewTags || [],
        taskTeacherNote: task.teacherNote || "",
        exerciseId: savedSubmitStep.exerciseId || requiredSubmitExercise?.id || "",
        exerciseTitle: savedSubmitStep.exerciseTitle || requiredSubmitExercise?.title || "Task Recording Submission",
        exerciseInstruction: requiredSubmitExercise?.instruction || "",
        studentId: task.targetStudentId,
        studentName: student?.name || "Student",
        submittedAt: todayKey(),
        targetText: savedSubmitStep.targetText || task.practiceText,
        heardText: result?.asr?.heard_text || "",
        recordingUrl: savedSubmitStep.recordingUrl || "",
        aiScores: savedSubmitStep.aiScores || analysisScoreSnapshot(result),
        aiSummary: savedSubmitStep.aiSummary || result?.communication_result?.main_feedback || "",
        diagnosisSummary: result?.pinyin_diagnosis?.summary || savedSubmitStep.pinyinDiagnosis?.summary || "",
        analysisResult: result,
        pinyinDiagnosis: savedSubmitStep.pinyinDiagnosis || result?.pinyin_diagnosis || null,
        syllables: savedSubmitStep.syllables || toSyllableMap(result),
        pinyinText: pinyinDisplay(result?.pinyin_display || result?.pinyin) || "",
        rhythmScore: rhythmScoreFromResult(result),
        completedSteps: completedSteps.map((exercise) => ({
          id: exercise.id,
          title: exercise.title,
          requiredCount: exercise.requiredCount,
          targetText: taskProgress[exercise.id]?.targetText || exercise.targetText || task.practiceText,
          items: (taskProgress[exercise.id]?.items || []).filter((item) => item?.completed).map((item) => ({
            targetText: item.targetText,
            recordingUrl: item.recordingUrl,
            aiScores: item.aiScores,
            aiSummary: item.aiSummary,
          })),
        })),
        status: SUBMISSION_STATUS_PENDING,
        teacherFeedback: "",
      };
      return {
        ...state,
        currentRole: "student",
        currentView: "taskDetail",
        selectedTaskId: task.id,
        taskSubmissions: [...(state.taskSubmissions || []), taskSubmission].slice(-80),
      };
    }
    case "START_ENTRY_ASSESSMENT":
      return {
        ...state,
        currentRole: "student",
        currentView: "entryAssessment",
        targetText: entryAssessmentItems[0]?.prompt || state.targetText,
        recordingState: "idle",
        modelStatus: "idle",
        assessmentSession: { ...defaultAssessmentSession(), active: true },
      };
    case "COMPLETE_ASSESSMENT_ITEM": {
      const item = entryAssessmentItems[state.assessmentSession?.currentIndex || 0];
      if (!item) return state;
      const existingResults = state.assessmentSession?.results || [];
      const result = action.result || {
        itemId: item.id,
        title: item.title,
        prompt: item.prompt,
        pinyin: item.pinyin,
        focus: item.focus,
        score: Number(action.score ?? Math.max(62, 86 - existingResults.length * 4)),
        note: action.note || `${item.focus} needs continued observation.`,
      };
      const nextIndex = Math.min((state.assessmentSession?.currentIndex || 0) + 1, entryAssessmentItems.length - 1);
      const isCompleted = existingResults.length + 1 >= entryAssessmentItems.length;
      const nextItem = entryAssessmentItems[nextIndex];
      return {
        ...state,
        targetText: isCompleted ? item.prompt : nextItem?.prompt || item.prompt,
        recordingState: "idle",
        modelStatus: "idle",
        assessmentSession: {
          active: true,
          currentIndex: nextIndex,
          results: [...existingResults.filter((row) => row.itemId !== item.id), result],
          completed: isCompleted,
        },
      };
    }
    case "COMPLETE_ENTRY_ASSESSMENT": {
      const student = getSelectedTeacherStudent(state) || getTeacherStudents(state)[0];
      const profile = buildAssessmentProfile(student, (state.assessmentProfiles || []).length);
      if (!profile) return state;
      const results = state.assessmentSession?.results || [];
      const averageScore = results.length
        ? Math.round(results.reduce((total, row) => total + Number(row.score || 0), 0) / results.length)
        : profile.overallScore;
      const issueTags = results.length
        ? results
          .filter((row) => Number(row.score || 0) < 80)
          .map((row) => row.focus)
          .slice(0, 4)
        : profile.issueTags;
      const assessmentProfile = {
        ...profile,
        status: ASSESSMENT_STATUS_PENDING,
        overallScore: averageScore,
        issueTags: issueTags.length ? issueTags : profile.issueTags,
        issueCategories: [...new Set(results.map((row) => row.title).filter(Boolean))],
        profileSummary: results.length
          ? `${student.name} completed ${results.length} entry assessment items, with overall reference score ${averageScore}. Key observations: ${(issueTags.length ? issueTags : profile.issueTags).slice(0, 2).join("、")}.`
          : profile.profileSummary,
        recommendation: results.length
          ? `Start by practicing around ${(issueTags.length ? issueTags : profile.issueTags).slice(0, 2).join("、")} with short, frequent sessions. Publish the initial practice pack after teacher confirmation.`
          : profile.recommendation,
        itemResults: results,
      };
      return {
        ...state,
        currentRole: "student",
        currentView: "practice",
        assessmentSession: { ...(state.assessmentSession || defaultAssessmentSession()), active: false, completed: true },
        account: {
          ...(state.account || defaultAccount()),
          entryAssessmentCompleted: true,
        },
        assessmentProfiles: [...(state.assessmentProfiles || []), assessmentProfile].slice(-40),
      };
    }
    case "PUBLISH_ASSESSMENT_TASK": {
      const profile = getSelectedAssessmentProfile(state);
      const edits = action.edits || {};
      const updatedProfile = profile
        ? {
            ...profile,
            recommendation: String(edits.recommendation || profile.recommendation || "").trim() || profile.recommendation,
            profileSummary: String(edits.profileSummary || profile.profileSummary || "").trim() || profile.profileSummary,
            teacherEditedAt: todayKey(),
          }
        : null;
      const task = buildInitialTaskFromAssessment(updatedProfile, edits);
      if (!profile || !task) return state;
      return {
        ...state,
        assessmentProfiles: (state.assessmentProfiles || []).map((item) => (
          item.id === profile.id
            ? { ...updatedProfile, status: ASSESSMENT_STATUS_CONFIRMED, confirmedAt: todayKey() }
            : item
        )),
        publishedTasks: [
          ...(state.publishedTasks || []).filter((item) => item.targetStudentId !== task.targetStudentId),
          task,
        ],
      };
    }
    case "REVIEW_TASK_SUBMISSION":
      {
        let reviewedSubmission = null;
        const taskSubmissions = (state.taskSubmissions || []).map((submission) => {
          if (submission.id !== action.submissionId) return submission;
          reviewedSubmission = {
            ...submission,
            status: "Teacher Reviewed",
            reviewedAt: todayKey(),
            teacherFeedback: action.feedback || "This is improving. Keep practicing with the teacher's suggestion.",
            teacherScore: Number(action.teacherScore ?? submission.aiScores?.overall ?? 0),
          };
          return reviewedSubmission;
        });
        const reviewMessage = reviewedSubmission ? buildTeacherReviewMessage(state, reviewedSubmission, action) : null;
        return {
          ...state,
          taskSubmissions,
          taskMessages: reviewMessage
            ? [...(state.taskMessages || []), reviewMessage].slice(-120)
            : state.taskMessages || [],
          teacherView: "reviews",
          selectedReviewSubmissionId: "",
        };
      }
    case "LOGIN_ACCOUNT":
      return {
        ...state,
        account: {
          ...(state.account || defaultAccount()),
          isLoggedIn: true,
          isRegistered: true,
          username: action.username || state.account?.username || "",
          displayName: action.displayName || state.account?.displayName || action.username || "User",
          password: action.password || state.account?.password || "",
          lastLoginAt: todayKey(),
          registeredAt: state.account?.registeredAt || todayKey(),
        },
      };
    case "LOGOUT_ACCOUNT":
      return {
        ...state,
        account: {
          ...(state.account || defaultAccount()),
          isLoggedIn: false,
        },
      };
    case "UPDATE_AVATAR":
      return {
        ...state,
        account: {
          ...(state.account || defaultAccount()),
          avatarDataUrl: action.avatarDataUrl || "",
        },
      };
    case "SELECT_CHAT_THREAD": {
      const participantId = currentParticipantId(state);
      return {
        ...state,
        selectedChatThreadId: action.threadId,
        chatMode: "thread",
        chatThreads: (state.chatThreads || []).map((thread) => (
          thread.id === action.threadId
            ? {
                ...thread,
                messages: normalizeThreadMessages(thread).map((message) => (
                  message.senderId === participantId || (message.readBy || []).includes(participantId)
                    ? message
                    : { ...message, readBy: [...(message.readBy || []), participantId] }
                )),
              }
            : thread
        )),
      };
    }
    case "DELETE_CHAT_THREAD": {
      const threadId = action.threadId;
      const remainingThreads = (state.chatThreads || []).filter((thread) => thread.id !== threadId);
      const deletedSelectedThread = state.selectedChatThreadId === threadId;
      const nextVisibleThread = getChatThreads({ ...state, chatThreads: remainingThreads }, state.currentRole)[0];
      return {
        ...state,
        chatThreads: remainingThreads,
        selectedChatThreadId: deletedSelectedThread ? nextVisibleThread?.id || "" : state.selectedChatThreadId,
        chatMode: deletedSelectedThread ? "list" : state.chatMode,
      };
    }
    case "SEND_CHAT_MESSAGE": {
      const body = String(action.body || "").trim();
      if (!body) return state;
      const participantId = currentParticipantId(state);
      const senderRole = state.currentRole === "teacher" ? "teacher" : "student";
      const senderName = senderRole === "teacher"
        ? state.teacherDashboard?.teacherName || "Ms. Wang"
        : state.account?.displayName || "Chen Xiaohe";
      const threadId = action.threadId || state.selectedChatThreadId || getChatThreads(state)[0]?.id;
      const message = {
        id: `chat-${threadId}-${Date.now()}`,
        senderId: participantId,
        senderRole,
        senderName,
        body,
        createdAt: action.createdAt || todayKey(),
        readBy: [participantId],
      };
      return {
        ...state,
        chatDraft: "",
        selectedChatThreadId: threadId,
        chatMode: "thread",
        chatThreads: (state.chatThreads || []).map((thread) => (
          thread.id === threadId
            ? { ...thread, messages: [...normalizeThreadMessages(thread), message].slice(-120) }
            : thread
        )),
      };
    }
    case "CREATE_CLASS_CHAT": {
      const title = String(action.title || "New Class Group Chat").trim() || "New Class Group Chat";
      const selectedIds = Array.isArray(action.memberIds) ? action.memberIds : [];
      const validStudentIds = getTeacherStudents(state).map((student) => student.id);
      const memberIds = selectedIds.length
        ? selectedIds.filter((id) => validStudentIds.includes(id))
        : validStudentIds;
      if (!memberIds.length) return state;
      const id = `chat-class-${Date.now()}`;
      return {
        ...state,
        currentRole: "teacher",
        currentView: "teacher",
        teacherView: "chat",
        selectedChatThreadId: id,
        chatMode: "thread",
        chatThreads: [
          ...(state.chatThreads || []),
          {
            id,
            type: "class",
            title,
            memberIds: ["teacher-main", ...memberIds],
            createdAt: todayKey(),
            messages: [],
          },
        ],
      };
    }
    case "CREATE_DIRECT_CHAT": {
      const student = getTeacherStudents(state).find((item) => item.id === action.studentId) || getSelectedTeacherStudent(state);
      if (!student) return state;
      const existing = (state.chatThreads || []).find((thread) => thread.type === "direct" && (thread.memberIds || []).includes(student.id));
      if (existing) return { ...state, selectedChatThreadId: existing.id, chatMode: "thread", currentRole: "teacher", currentView: "teacher", teacherView: "chat" };
      const id = `chat-direct-${student.id}-${Date.now()}`;
      return {
        ...state,
        currentRole: "teacher",
        currentView: "teacher",
        teacherView: "chat",
        selectedChatThreadId: id,
        chatMode: "thread",
        chatThreads: [
          ...(state.chatThreads || []),
          {
            id,
            type: "direct",
            title: student.name,
            memberIds: ["teacher-main", student.id],
            createdAt: todayKey(),
            messages: [],
          },
        ],
      };
    }
    case "CREATE_STUDENT_DIRECT_CHAT": {
      const studentId = "student-chen";
      const studentName = state.account?.displayName || "Chen Xiaohe";
      const existing = (state.chatThreads || []).find((thread) => thread.type === "direct" && (thread.memberIds || []).includes(studentId));
      if (existing) return { ...state, selectedChatThreadId: existing.id, chatMode: "thread", currentRole: "student", currentView: "chat" };
      const id = `chat-direct-${studentId}-${Date.now()}`;
      return {
        ...state,
        currentRole: "student",
        currentView: "chat",
        selectedChatThreadId: id,
        chatMode: "thread",
        chatThreads: [
          ...(state.chatThreads || []),
          {
            id,
            type: "direct",
            title: "Ms. Wang",
            memberIds: ["teacher-main", studentId],
            createdAt: todayKey(),
            messages: [
              {
                id: `msg-${id}-hello`,
                senderId: studentId,
                senderRole: "student",
                senderName: studentName,
                body: "Hello teacher, I would like you to review my practice.",
                createdAt: todayKey(),
                readBy: [studentId],
              },
            ],
          },
        ],
      };
    }
    case "SET_TARGET_TEXT":
      return {
        ...state,
        targetText: action.text,
        recordingState: "idle",
        modelStatus: "idle",
        recordingError: "",
        analysisResult: null,
        pinyinDiagnosis: null,
        analysisSyllables: null,
        teachingPlan: null,
        selectedClipSegmentIndex: 0,
        clipPlaying: false,
        lastRecordingUrl: "",
        standardAudioUrl: "",
        practiceBackView: action.returnToToneDrill ? "toneDrill" : "",
        asrHeard: "Waiting for recording analysis",
        modelSummary: "Text updated. After recording, the system will analyze what you actually said.",
        ...emptyScores,
      };
    case "APPLY_TEXT_INFO": {
      const syllableMap = syllableMapFromTextInfo(action.info);
      const firstSyllable = Object.keys(syllableMap)[0] || state.selectedSyllable;
      return {
        ...state,
        pinyinText: pinyinDisplay(action.info?.pinyin_display || action.info?.pinyin) || "Waiting for Chinese text",
        standardAudioUrl: action.info?.standard_audio_url || "",
        analysisSyllables: syllableMap,
        selectedSyllable: firstSyllable,
      };
    }
    case "RECORD_START":
      return {
        ...state,
        recordingState: "recording",
        modelStatus: "recording",
        recordingError: "",
        playing: false,
      };
    case "ANALYZE_START":
      return { ...state, recordingState: "complete", modelStatus: "analyzing" };
    case "APPLY_ANALYSIS": {
      const result = action.result;
      const syllableMap = toSyllableMap(result);
      const firstSyllable = Object.keys(syllableMap)[0] || state.selectedSyllable;
      const history = appendPracticeHistory(state, result);
      const nextState = {
        ...state,
        modelStatus: "complete",
        recordingState: "complete",
        analysisResult: result,
        pinyinDiagnosis: result?.pinyin_diagnosis ?? null,
        analysisSyllables: syllableMap,
        teachingPlan: null,
        selectedClipSegmentIndex: 0,
        clipPlaying: false,
        selectedSyllable: firstSyllable,
        lastRecordingUrl: action.recordingUrl || state.lastRecordingUrl,
        standardAudioUrl: result?.standard_audio_url || "",
        practiceHistory: history,
        pinyinText: pinyinDisplay(result?.pinyin_display || result?.pinyin) || state.pinyinText,
        asrHeard: result?.asr?.heard_text || "The system did not hear clearly",
        modelSummary: result?.communication_result?.main_feedback || state.modelSummary,
        score: Number(result?.communication_result?.readiness_score ?? state.score),
        pitchScore: Number(result?.tone_timing?.overall_score ?? state.pitchScore),
        clarityScore: Number(result?.asr?.text_similarity ?? state.clarityScore),
        rhythmScore: rhythmScoreFromResult(result),
      };
      if (state.currentView === "entryAssessment" || state.assessmentSession?.active) {
        const assessmentResult = assessmentResultFromAnalysis(nextState, result, action);
        if (!assessmentResult) return nextState;
        return reduceState(
          {
            ...nextState,
            currentRole: "student",
            currentView: "entryAssessment",
            teachingPlan: null,
          },
          {
            type: "COMPLETE_ASSESSMENT_ITEM",
            result: assessmentResult,
          },
        );
      }
      const taskSubmission = buildTaskSubmission(nextState, result, nextState.lastRecordingUrl);
      if (taskSubmission) {
        const snapshot = state.taskPracticeSnapshot || {};
        const restoredTaskState = {
          ...nextState,
          ...snapshot,
          currentRole: "student",
          currentView: "taskDetail",
          taskDetailMode: false,
          selectedTaskId: taskSubmission.taskId,
          activeTaskPracticeId: state.activeTaskPracticeId,
          activeTaskExerciseId: state.activeTaskExerciseId,
          taskPracticeSnapshot: null,
          recordingState: "idle",
          modelStatus: "complete",
          teachingPlan: snapshot.teachingPlan || nextState.teachingPlan,
          lastRecordingUrl: nextState.lastRecordingUrl,
          analysisResult: result,
          pinyinDiagnosis: result?.pinyin_diagnosis ?? null,
          analysisSyllables: toSyllableMap(result),
          teachingPlan: buildTeachingPlan(
            {
              ...nextState,
              currentView: "taskDetail",
              activeTaskPracticeId: state.activeTaskPracticeId,
              activeTaskExerciseId: state.activeTaskExerciseId,
            },
            action.clipManifest,
            { includeAllSyllables: true },
          ),
          score: nextState.score,
          pitchScore: nextState.pitchScore,
          clarityScore: nextState.clarityScore,
          rhythmScore: nextState.rhythmScore,
        };
        return reduceState(restoredTaskState, {
          type: "SAVE_TASK_STEP",
          taskId: state.activeTaskPracticeId,
          exerciseId: state.activeTaskExerciseId,
          itemIndex: state.activeTaskItemIndex,
          keepExerciseActive: true,
          nextItemIndex: state.activeTaskItemIndex,
          result,
          recordingUrl: nextState.lastRecordingUrl,
        });
      }
      return {
        ...nextState,
        taskSubmissions: state.taskSubmissions || [],
        activeTaskPracticeId: nextState.activeTaskPracticeId,
        activeTaskExerciseId: nextState.activeTaskExerciseId,
        teachingPlan: buildTeachingPlan(nextState, action.clipManifest),
      };
    }
    case "ANALYZE_ERROR":
      return {
        ...state,
        modelStatus: "error",
        recordingState: "idle",
        recordingError: action.message,
      };
    case "RESET_PRACTICE":
      return {
        ...state,
        recordingState: "idle",
        modelStatus: "idle",
        recordingError: "",
        analysisResult: null,
        pinyinDiagnosis: null,
        analysisSyllables: null,
        teachingPlan: null,
        selectedClipSegmentIndex: 0,
        clipPlaying: false,
        lastRecordingUrl: "",
        standardAudioUrl: "",
        practiceBackView: "",
        activeTaskPracticeId: "",
        activeTaskExerciseId: "",
        targetText: state.targetText,
        asrHeard: "Waiting for recording analysis",
        modelSummary: "This score has been cleared. You can record again.",
        ...emptyScores,
      };
    case "SELECT_SYLLABLE":
      if (!getSyllables(state)[action.syllableId]) return state;
      {
        const nextState = {
          ...state,
          selectedSyllable: action.syllableId,
          currentView: "detail",
          playing: false,
          clipPlaying: false,
          selectedClipSegmentIndex: 0,
        };
        if (!nextState.analysisResult) return nextState;
        return {
          ...nextState,
          teachingPlan: buildTeachingPlan(nextState, action.clipManifest, { preferredSyllableId: action.syllableId }),
        };
      }
    case "SELECT_TIP":
      if (!tips.some((tip) => tip.id === action.tipId)) return state;
      return { ...state, selectedTip: action.tipId };
    case "SET_PERIOD":
      if (!progressByPeriod[action.period]) return state;
      return { ...state, period: action.period };
    case "SET_TONE_DRILL":
      if (!toneDrills[action.tone]) return state;
      return { ...state, selectedToneDrill: action.tone, currentView: "toneDrill" };
    case "SET_PLAYING":
      return { ...state, playing: Boolean(action.playing) };
    case "GENERATE_TEACHING_CLIP": {
      const teachingPlan = buildTeachingPlan(state, action.clipManifest);
      if (!teachingPlan) return state;
      return {
        ...state,
        teachingPlan,
        selectedClipSegmentIndex: 0,
        clipPlaying: false,
        currentView: action.openView === false ? state.currentView : "teachingClip",
        playing: false,
      };
    }
    case "SET_CLIP_SEGMENT": {
      const count = state.teachingPlan?.segments?.length || 0;
      if (!count) return state;
      const index = Math.min(Math.max(Number(action.index) || 0, 0), count - 1);
      return { ...state, selectedClipSegmentIndex: index, clipPlaying: false, playing: false };
    }
    case "NEXT_CLIP_SEGMENT": {
      const count = state.teachingPlan?.segments?.length || 0;
      if (!count) return state;
      const index = Math.min(state.selectedClipSegmentIndex + 1, count - 1);
      const atEnd = index === count - 1 && state.selectedClipSegmentIndex === count - 1;
      return {
        ...state,
        selectedClipSegmentIndex: index,
        clipPlaying: atEnd ? false : state.clipPlaying,
      };
    }
    case "PREVIOUS_CLIP_SEGMENT":
      return {
        ...state,
        selectedClipSegmentIndex: Math.max(state.selectedClipSegmentIndex - 1, 0),
        clipPlaying: false,
        playing: false,
      };
    case "SET_CLIP_PLAYING":
      return { ...state, clipPlaying: Boolean(action.playing), playing: false };
    case "SELECT_PROGRESS_DATE":
      return {
        ...state,
        selectedProgressDate: action.date || todayKey(),
        currentRole: "student",
        currentView: "progress",
      };
    default:
      return state;
  }
}

export function getProgressData(state) {
  const history = state.practiceHistory || [];
  const selectedDate = state.selectedProgressDate || todayKey();
  const selectedHistory = history.filter((item) => item.date === selectedDate);
  const dateKeys = recentDateKeys(7);
  const labels = dateKeys.map(dateLabel);
  const scoreByDate = history.reduce((items, item) => {
    const previous = items[item.date] || 0;
    items[item.date] = Math.max(previous, Number(item.score || 0));
    return items;
  }, {});
  const scores = dateKeys.map((date) => scoreByDate[date] || 0);

  if (!history.length) {
    return {
      label: "Selected Day",
      selectedDate,
      labels,
      scores,
      words: [],
      tones: Object.entries(toneDrills).map(([tone, item]) => ({
        tone,
        label: item.label,
        score: 0,
        level: `tone-${tone}`,
      })),
    };
  }

  const words = selectedHistory
    .slice(-8)
    .reverse()
    .map((item) => ({
      word: item.text,
      score: item.score,
      status: item.score >= 82 ? "Mastered" : item.score >= 68 ? "Keep Practicing" : "Focus Practice",
      level: levelFromScore(item.score),
    }));
  const averageTone = Math.round(
    history.reduce((total, item) => total + item.toneScore, 0) / history.length,
  );
  return {
    label: "Selected Day",
    selectedDate,
    labels,
    scores,
    words,
    tones: Object.entries(toneDrills).map(([tone, item]) => ({
      tone,
      label: item.label,
      score: averageTone || 0,
      level: `tone-${tone}`,
    })),
  };
}
