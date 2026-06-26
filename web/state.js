export const defaultSyllables = {
  wo: {
    id: "wo",
    character: "我",
    pinyin: "wo3",
    tone: "T3",
    score: 88,
    status: "清楚",
    level: "good",
    feedback: "三声转折自然，收尾可以更稳。",
    mouthCue: "双唇先收圆，再自然放松。",
    tongueCue: "舌位保持自然放松，重点感受韵母 o 的口腔空间。",
    toneCue: "先降后升，最低点不要停太久。",
    targetTone: [36, 45, 62, 78, 58, 35],
    currentTone: [34, 42, 60, 72, 55, 40],
  },
  yao: {
    id: "yao",
    character: "要",
    pinyin: "yao4",
    tone: "T4",
    score: 82,
    status: "清楚",
    level: "good",
    feedback: "降调方向正确，起音可以更果断。",
    mouthCue: "口腔打开，双唇自然展开。",
    tongueCue: "舌面放平，声音从高处快速落下。",
    toneCue: "从高处快速下降，结尾干净。",
    targetTone: [20, 30, 42, 56, 72, 84],
    currentTone: [25, 34, 45, 58, 70, 80],
  },
  chi: {
    id: "chi",
    character: "吃",
    pinyin: "chi1",
    tone: "T1",
    score: 70,
    status: "需改善",
    level: "warn",
    feedback: "声母 ch 可以更靠后，音高保持平稳。",
    mouthCue: "舌尖稍向后卷，双唇自然展开。",
    tongueCue: "舌尖靠近硬腭前部，气流从舌尖后方擦出。",
    toneCue: "从头到尾保持高而平，不要下滑。",
    targetTone: [25, 25, 25, 25, 25, 25],
    currentTone: [32, 29, 30, 34, 39, 44],
  },
  fan: {
    id: "fan",
    character: "饭",
    pinyin: "fan4",
    tone: "T4",
    score: 62,
    status: "重点练习",
    level: "focus",
    feedback: "第四声下降不够明显，需要从高音快速下落。",
    mouthCue: "上齿轻触下唇，气流从缝隙送出。",
    tongueCue: "舌尖最后轻触上齿龈，收住 n 的鼻音。",
    toneCue: "从较高音开始，快速向下落，幅度要明显。",
    targetTone: [22, 31, 43, 56, 70, 82],
    currentTone: [35, 38, 43, 49, 57, 64],
  },
};

export const syllables = defaultSyllables;

export const tips = [
  { id: "mouth", title: "唇形", descriptionKey: "mouthCue" },
  { id: "tongue", title: "舌位", descriptionKey: "tongueCue" },
  { id: "tone", title: "声调重点", descriptionKey: "toneCue" },
];

export const progressByPeriod = {
  current: {
    label: "本周",
    scores: [60, 64, 67, 70, 72, 74, 76],
    words: [
      { word: "你好", score: 88, status: "已掌握", level: "good" },
      { word: "谢谢", score: 74, status: "继续练习", level: "warn" },
      { word: "我要吃饭", score: 62, status: "重点练习", level: "focus" },
    ],
    tones: [
      { label: "第一声 ā", score: 85, level: "tone-one" },
      { label: "第二声 á", score: 79, level: "tone-two" },
      { label: "第三声 ǎ", score: 71, level: "tone-three" },
      { label: "第四声 à", score: 58, level: "tone-four" },
    ],
  },
  previous: {
    label: "上周",
    scores: [59, 61, 63, 66, 68, 69, 71],
    words: [
      { word: "早上好", score: 82, status: "已掌握", level: "good" },
      { word: "没关系", score: 69, status: "继续练习", level: "warn" },
      { word: "再见", score: 64, status: "继续练习", level: "focus" },
    ],
    tones: [
      { label: "第一声 ā", score: 80, level: "tone-one" },
      { label: "第二声 á", score: 74, level: "tone-two" },
      { label: "第三声 ǎ", score: 67, level: "tone-three" },
      { label: "第四声 à", score: 54, level: "tone-four" },
    ],
  },
};

export const toneDrills = {
  "1": {
    label: "第一声 ā",
    description: "练习高而平的声调，重点是不要下滑。",
    words: ["妈", "吃", "高", "开", "天", "书"],
  },
  "2": {
    label: "第二声 á",
    description: "练习自然上扬的声调，重点是结尾要升起来。",
    words: ["麻", "来", "人", "明", "学", "忙"],
  },
  "3": {
    label: "第三声 ǎ",
    description: "练习先降后升的声调，重点是中间要有低点。",
    words: ["马", "你", "好", "想", "水", "买"],
  },
  "4": {
    label: "第四声 à",
    description: "练习从高处快速下降，重点是短促有力。",
    words: ["骂", "饭", "去", "看", "要", "再"],
  },
};

const emptyScores = {
  score: 0,
  pitchScore: 0,
  clarityScore: 0,
  rhythmScore: 0,
};

export const TASK_STATUS_PUBLISHED = "已发布";
export const TASK_STATUS_DRAFT = "待教师审核";
export const SUBMISSION_STATUS_PENDING = "待教师复评";
export const SUBMISSION_STATUS_REVIEWED = "教师已复评";
export const ASSESSMENT_STATUS_PENDING = "待教师确认";
export const ASSESSMENT_STATUS_CONFIRMED = "教师已确认";

export const entryAssessmentItems = [
  {
    id: "initial-fan",
    type: "声母",
    title: "声母 f + 韵母 an",
    prompt: "饭",
    pinyin: "fan4",
    focus: "f 起音、an 收尾",
  },
  {
    id: "initial-zhi",
    type: "卷舌音",
    title: "zh/ch/sh 观察",
    prompt: "知识",
    pinyin: "zhi1 shi2",
    focus: "舌尖后卷与送气稳定",
  },
  {
    id: "tone-er",
    type: "声调",
    title: "第二声上扬",
    prompt: "明天",
    pinyin: "ming2 tian1",
    focus: "第二声从低到高自然上扬",
  },
  {
    id: "sentence-life",
    type: "短句",
    title: "生活短句",
    prompt: "我要喝水",
    pinyin: "wo3 yao4 he1 shui3",
    focus: "短句清晰度、停顿与语速",
  },
];

function defaultAccount() {
  return {
    isLoggedIn: false,
    isRegistered: false,
    username: "",
    displayName: "陈小禾",
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
      title: "陈小禾",
      memberIds: ["teacher-main", "student-chen"],
      createdAt: todayKey(),
      messages: [
        {
          id: "msg-direct-chen-1",
          senderId: "teacher-main",
          senderRole: "teacher",
          senderName: "王老师",
          body: "今天先完成 f + an 的短句录音，慢一点说就好。",
          createdAt: "08:30",
          readBy: ["teacher-main"],
        },
      ],
    },
    {
      id: "chat-class-main",
      type: "class",
      title: "启音一班群聊",
      memberIds: ["teacher-main", "student-lin", "student-chen", "student-qiao"],
      createdAt: todayKey(),
      messages: [
        {
          id: "msg-class-1",
          senderId: "teacher-main",
          senderRole: "teacher",
          senderName: "王老师",
          body: "同学们，今天完成老师布置的录音后，我会逐个听。",
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
  className: "启音一班",
  teacherName: "王老师",
  students: [
    {
      id: "student-lin",
      name: "林一一",
      age: 8,
      stage: "声母稳定期",
      hearingProfile: "双侧助听器，课堂口语跟读稳定",
      rehabGoal: "让生活常用句更容易被同伴听懂",
      focusTags: ["f 起音不稳定", "an 收尾不完整", "第二声上扬不明显"],
      latestScore: 72,
      weeklyPracticeCount: 5,
      pendingSubmissions: 2,
      overdueTasks: 0,
      lastPracticeAt: "今天",
      assessmentSummary: "清晰度比上周提升，韵母收尾仍需要慢速跟读。",
      trend: "进步",
    },
    {
      id: "student-chen",
      name: "陈小禾",
      age: 10,
      stage: "声调强化期",
      hearingProfile: "人工耳蜗术后康复，长句节奏易变快",
      rehabGoal: "稳定四声方向，减少长句含混",
      focusTags: ["第三声常读平", "语速偏快", "停顿不自然"],
      latestScore: 66,
      weeklyPracticeCount: 3,
      pendingSubmissions: 1,
      overdueTasks: 1,
      lastPracticeAt: "昨天",
      assessmentSummary: "单字声调可辨，短句中第三声和停顿需要继续观察。",
      trend: "需关注",
    },
    {
      id: "student-qiao",
      name: "乔安",
      age: 7,
      stage: "韵母完整度训练",
      hearingProfile: "轻中度听损，家庭陪练积极",
      rehabGoal: "把鼻音韵母说完整，建立练习信心",
      focusTags: ["n/l 混淆", "ang 收尾不稳", "跟读音量偏小"],
      latestScore: 81,
      weeklyPracticeCount: 6,
      pendingSubmissions: 0,
      overdueTasks: 0,
      lastPracticeAt: "今天",
      assessmentSummary: "本周练习频率很好，ang 的结尾比上次更清楚。",
      trend: "稳定",
    },
  ],
};

const taskPackageTemplates = [
  {
    match: /声母|起音|n\/l|zh|ch|sh|f /,
    category: "声母专项",
    goal: "",
    items: ["看口型舌位 1 次", "单音慢速跟读 5 次", "词语跟读 3 组", "短句录音提交 1 次"],
  },
  {
    match: /韵母|收尾|an|ang|鼻音/,
    category: "韵母完整度",
    goal: "把韵母过程说完整，尤其注意结尾收住。",
    items: ["韵母口型观察 1 次", "单字慢读 5 次", "词语延长收尾 3 组", "生活短句录音提交 1 次"],
  },
  {
    match: /声|第二声|第三声|第四声|上扬|读平/,
    category: "声调专项",
    goal: "先夸张练清楚声调方向，再回到自然语速。",
    items: ["标准音听辨 2 次", "单字声调跟读 5 次", "同声调词语练习 3 组", "录音提交 1 次"],
  },
  {
    match: /语速|停顿|节奏/,
    category: "节奏与停顿",
    goal: "放慢关键位置，让句子更容易被听懂。",
    items: ["短句分段跟读 3 次", "停顿标记练习 2 组", "自然语速录音提交 1 次"],
  },
];

export const questionBankPackages = [
  {
    id: "initial-f",
    title: "f 起音训练包",
    category: "声母",
    focusTags: ["f 起音不稳定", "唇齿音不清楚"],
    description: "上齿轻触下唇，气流从唇齿之间送出。",
    items: ["饭", "飞", "风", "发音", "我要吃饭。", "风很大。"],
    targetText: "我要吃饭",
  },
  {
    id: "final-an",
    title: "an 收尾训练包",
    category: "韵母",
    focusTags: ["an 韵母收尾不完整", "鼻音弱"],
    description: "an 结尾要收住，舌尖靠近上齿龈，不要太快滑走。",
    items: ["饭", "看", "慢", "安静", "我想吃饭。", "请你慢一点。"],
    targetText: "我想吃饭",
  },
  {
    id: "final-ang",
    title: "ang 收尾训练包",
    category: "韵母",
    focusTags: ["ang/an 混淆", "后鼻音不稳定"],
    description: "后鼻音 ang 要打开口腔，声音往后收，不要说成 an。",
    items: ["忙", "放", "长", "上课", "我很忙。", "请放这里。"],
    targetText: "我很忙",
  },
  {
    id: "tone-three",
    title: "第三声训练包",
    category: "声调",
    focusTags: ["第三声常读平", "低点不明显"],
    description: "先降后升，中间要有低点，不要读成平的。",
    items: ["我", "你", "好", "可以", "你好吗？", "我可以。"],
    targetText: "你好吗",
  },
  {
    id: "tone-four",
    title: "第四声训练包",
    category: "声调",
    focusTags: ["第四声下降不明显", "结尾拖长"],
    description: "从高处快速下降，声音短而有力，结尾不要拖长。",
    items: ["饭", "去", "看", "要", "我要去。", "我想吃饭。"],
    targetText: "我要去",
  },
  {
    id: "initial-nl",
    title: "n/l 区分训练包",
    category: "声母",
    focusTags: ["n/l 混淆", "鼻音和边音区分"],
    description: "n 是鼻音，l 是边音，重点感受舌尖位置和气流方向。",
    items: ["你", "来", "年", "蓝色", "你来这里。", "明年再来。"],
    targetText: "你来这里",
  },
  {
    id: "retroflex",
    title: "zh/ch/sh 卷舌训练包",
    category: "声母",
    focusTags: ["卷舌音不清楚", "zh/ch/sh 不稳定"],
    description: "舌尖轻轻向后卷，位置比 z/c/s 更靠后。",
    items: ["知", "吃", "书", "老师", "我想吃饭。", "这是我的书。"],
    targetText: "这是我的书",
  },
  {
    id: "sentence-rhythm",
    title: "短句节奏训练包",
    category: "节奏",
    focusTags: ["停顿不自然", "语速偏快", "句子清晰度"],
    description: "不要一口气说太快，注意停顿、清晰度和完整表达。",
    items: ["你好。", "我要喝水。", "我想吃饭。", "请你慢一点。", "我明天上课。", "老师，我听懂了。"],
    targetText: "我要喝水",
  },
];

function findQuestionBankPackage(tags = []) {
  const joined = tags.join(" ");
  return questionBankPackages.find((pack) => pack.focusTags.some((tag) => joined.includes(tag) || tag.includes(joined)))
    || (/(^|[^a-z])f([^a-z]|$)|唇齿/.test(joined) ? questionBankPackages.find((pack) => pack.id === "initial-f") : null)
    || (/ang|后鼻/.test(joined) ? questionBankPackages.find((pack) => pack.id === "final-ang") : null)
    || (/an|鼻音|收尾/.test(joined) ? questionBankPackages.find((pack) => pack.id === "final-an") : null)
    || (/第三声|读平|低点/.test(joined) ? questionBankPackages.find((pack) => pack.id === "tone-three") : null)
    || (/第四声|下降|拖长/.test(joined) ? questionBankPackages.find((pack) => pack.id === "tone-four") : null)
    || (/n\/l|n和l|n l/.test(joined) ? questionBankPackages.find((pack) => pack.id === "initial-nl") : null)
    || (/zh|ch|sh|卷舌/.test(joined) ? questionBankPackages.find((pack) => pack.id === "retroflex") : null)
    || (/语速|停顿|节奏|短句/.test(joined) ? questionBankPackages.find((pack) => pack.id === "sentence-rhythm") : null)
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
    asrHeard: "等待录音分析",
    modelSummary: "输入想练的中文句子，点击录音后系统会根据你的发音给出声调、清晰度和节奏反馈。",
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
    return [{ type: "initial", unit: initial, label: `声母 ${initial}` }];
  }
  if (issue?.type === "final" && final) {
    return [{ type: "final", unit: final, label: `韵母 ${final}` }];
  }
  return [
    initial ? { type: "initial", unit: initial, label: `声母 ${initial}` } : null,
    final ? { type: "final", unit: final, label: `韵母 ${final}` } : null,
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
    title: "本次发音巩固",
    summary: "本次发音整体不错，跟着教学视频巩固口型、舌位和发音稳定性。",
    focus: syllable?.pinyinDisplay || syllable?.pinyin || targetText || "发音巩固",
    detail: "先保持清晰稳定，再逐步回到自然语速。",
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
      title: `${target.label} 发音示范`,
      guidanceText: clip?.notes
        || (target.type === "initial"
          ? `先看 ${target.label} 的起音动作，再接上后面的韵母。`
          : `注意 ${target.label} 的口型变化和结尾收音，把声音说完整。`),
      unitType: target.type,
      unit: target.unit,
      videoUrl: clip?.url || "",
      videoTitle: clip?.title || `${target.label} 发音片段`,
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
      : issue?.focus || targetText || "目标发音";
    return {
      type: "syllable-video",
      title,
      guidanceText: issue?.summary || issue?.detail || "跟着示范视频巩固这个音节的发音动作。",
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
      ? `${targetText || primarySegment?.title || "本次"} 个性化教学视频`
      : `${primarySegment?.title || targetText || "本次"} 个性化教学视频`,
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
    title: "本次发音巩固",
    summary: "本次发音整体不错，跟着教学视频巩固口型、舌位和声调稳定性。",
    focus: syllable?.pinyinDisplay || syllable?.pinyin || "发音巩固",
    detail: "先保持清晰稳定，再逐步回到自然语速。",
    practice: fallbackPracticeWords,
  };
  if (!syllable && !targetText) return null;

  const practiceWords = practiceWordsFor(primaryIssue, syllable, targetText);
  const targetLabel = syllable
    ? `${syllable.character} / ${syllable.pinyinDisplay || syllable.pinyin}`
    : primaryIssue.focus || "目标发音";
  const segments = [
    {
      type: "intro",
      title: "本次短片重点",
      guidanceText: `这段教学短片只聚焦这次最影响听懂的问题：${primaryIssue.title || primaryIssue.focus || "目标发音"}。先看示范，再跟读练习。`,
    },
    {
      type: "issue",
      title: "系统听辨结果",
      guidanceText: primaryIssue.summary || "系统发现这个音节需要重点练习。",
    },
  ];

  articulationTargetsFor(primaryIssue, syllable).forEach((target) => {
    const clip = manifestClipFor(clipManifest, target.type, target.unit);
    segments.push({
      type: clip?.url ? "video-articulation" : "articulation",
      title: `${target.label} 发音示范`,
      guidanceText: clip?.notes
        || (target.type === "initial"
          ? `先单独看 ${target.label} 的起音动作，再接上后面的韵母。`
          : `注意 ${target.label} 的口型变化和结尾收音，把声音说完整。`),
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
      title: `${targetLabel} 的声调走向`,
      guidanceText: syllable.toneCue || "对照目标声调线，先夸张读准方向，再回到自然语速。",
      targetTone: syllable.targetTone,
      currentTone: syllable.currentTone,
      hasUserPitch: syllable.hasUserPitch,
    });
  }

  segments.push({
    type: "practice",
    title: "跟读练习",
    guidanceText: primaryIssue.detail || "先慢速读准，再逐渐恢复正常语速。",
    practiceWords,
    standardAudioUrl: state.standardAudioUrl || state.analysisResult?.standard_audio_url || "",
  });

  return {
    title: `${targetLabel} 个性化教学短片`,
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
  if (score >= 82) return "清楚";
  if (score >= 68) return "继续练习";
  return "重点练习";
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
  if (toneNumber === "1") return "第一声";
  if (toneNumber === "2") return "第二声";
  if (toneNumber === "3") return "第三声";
  if (toneNumber === "4") return "第四声";
  if (toneNumber === "5") return "轻声";
  return "目标声调";
}

function chineseToneFeedback(tone, score) {
  if (!Number.isFinite(score) || score <= 0) {
    return "录音后会根据你的声调走向给出建议。";
  }
  if (score >= 82) return "声调走向比较接近目标，可以继续保持。";
  const prefix = score >= 68 ? "声调大方向接近，但还不够稳定。" : "这个音节需要重点练习。";
  const toneNumber = String(tone || "").replace("T", "");
  if (toneNumber === "1") return `${prefix}第一声要保持高而平，避免中途下滑或抖动。`;
  if (toneNumber === "2") return `${prefix}第二声要从较低处自然上扬，结尾需要更明显地升起来。`;
  if (toneNumber === "3") return `${prefix}第三声中间要先降到低点，再轻轻回升，不要一直平着读。`;
  if (toneNumber === "4") return `${prefix}第四声要从高处快速下降，结尾要收得干净。`;
  return `${prefix}轻声要短而轻，不要拖得太长。`;
}

function toneExplanation(row, tone, score) {
  if (row.tone_explanation) return row.tone_explanation;
  return `${row.char || "这个音节"} 的目标是${toneName(tone)}。系统会把你的音高变化简化成红线，再和绿色目标线比较；当前分数是 ${score} 分，主要看声调趋势是否接近，不代表声母、韵母已经完全准确。`;
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
      status: issue ? "可能不准" : statusFromScore(score),
      level: adjustedLevel,
      issue,
      feedback: issue?.summary || row.feedback || chineseToneFeedback(tone, score),
      mouthCue: row.initial
        ? `先做 ${row.initial} 的起音，再把 ${row.final || "韵母"} 说完整。`
        : `这个音节没有明显声母，重点把 ${row.final || "韵母"} 说清楚。`,
      tongueCue: `参考示意图练习 ${row.pinyin || row.char} 的舌位；摄像头只能辅助看嘴唇，舌头位置以标准图为准。`,
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
      status: "待录音",
      level: "warn",
      feedback: "录音后会显示发音清晰度和声调/节奏反馈。",
      mouthCue: row.initial
        ? `先做 ${row.initial} 的起音，再把 ${row.final || "韵母"} 说完整。`
        : `这个音节没有明显声母，重点把 ${row.final || "韵母"} 说清楚。`,
      tongueCue: `参考示意图练习 ${row.pinyin || row.char} 的舌位；摄像头只能辅助观察嘴唇。`,
      toneCue: `目标声调是 ${tone}，录音后可对照你的声调曲线。`,
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
  if (Number(student?.overdueTasks || 0) > 0) reasons.push("任务未完成");
  if (Number(student?.latestScore || 0) < 70) reasons.push("最近分数偏低");
  if (student?.trend === "需关注") reasons.push("趋势需关注");
  if (Number(student?.pendingSubmissions || 0) > 0) reasons.push("有录音待批改");
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
    needsAttention: students.filter((student) => student.trend === "需关注" || Number(student.overdueTasks || 0) > 0).length,
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
    tag: focusTags[0] || "本周发音稳定性",
    category: "综合巩固",
    goal: "保持稳定练习，优先关注本周最影响听懂的问题。",
    items: ["标准音听辨 2 次", "单字跟读 5 次", "短句录音提交 1 次"],
  };
  const reviewTags = [...new Set([primary.tag, ...focusTags.slice(1, 3)])];
  const bankPackage = findQuestionBankPackage(reviewTags);
  const exerciseSet = [
    {
      id: "watch",
      type: "示范",
      title: "看口型与舌位",
      instruction: `先观察“${primary.tag}”相关的发音动作，确认舌位、口型和气流。`,
      targetText: bankPackage.targetText || primary.practiceText || "我要吃饭",
      requiredCount: 1,
      sourceMode: "bank",
      bankPackageId: bankPackage.id,
      practiceItems: bankPackage.items,
    },
    {
      id: "sound",
      type: "单音",
      title: "重点音慢速跟读",
      instruction: `围绕“${primary.tag}”做慢速跟读，先把动作做完整。`,
      targetText: bankPackage.targetText || primary.practiceText || "我要吃饭",
      requiredCount: student.latestScore < 70 ? 5 : 3,
      sourceMode: "bank",
      bankPackageId: bankPackage.id,
      practiceItems: bankPackage.items,
    },
    {
      id: "word",
      type: "词语",
      title: "词语衔接练习",
      instruction: "把重点音放进词语里练，注意不要为了速度牺牲清晰度。",
      targetText: bankPackage.targetText || primary.practiceText || "我要吃饭",
      requiredCount: 3,
      sourceMode: "bank",
      bankPackageId: bankPackage.id,
      practiceItems: bankPackage.items,
    },
    {
      id: "sentence",
      type: "提交",
      title: "短句录音提交",
      instruction: "读完整个短句，系统会生成 AI 初评并提交给老师复评。",
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
    status: "待教师审核",
    title: `${student.name} · ${primary.category}训练包`,
    targetStudentId: student.id,
    focusTag: primary.tag,
    goal: primary.goal,
    suggestedDue: "3 天内完成",
    requiredSubmissions: 1,
    repeatCount: student.latestScore < 70 ? 5 : 3,
    practiceText: bankPackage.targetText || primary.practiceText || "我要吃饭",
    items: primary.items,
    exerciseSet,
    reviewTags,
    teacherNote: "AI 已完成初步组包，发布前请老师确认练习量和鼓励语。",
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
        type: cleanText(exercise.type, index === 0 ? "听辨" : index === 1 ? "跟读" : "录音"),
        title: cleanText(exercise.title, `任务步骤 ${index + 1}`),
        instruction: cleanText(exercise.instruction, "按老师要求完成这一小步。"),
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
    if (/声|上扬|读平/.test(tag)) return "声调";
    if (/韵母|收尾|an|ang|鼻音/.test(tag)) return "韵母";
    if (/语速|停顿|节奏/.test(tag)) return "节奏";
    return "声母";
  });
  const uniqueCategories = [...new Set(categories)];
  return {
    id: `assessment-${student.id}-${existingCount + 1}`,
    studentId: student.id,
    studentName: student.name,
    completedAt: todayKey(),
    status: "待教师确认",
    overallScore: student.latestScore,
    profileSummary: `${student.name} 的入门测评显示：${student.assessmentSummary}`,
    issueTags: focusTags,
    issueCategories: uniqueCategories,
    recommendation: uniqueCategories.length
      ? `建议先从${uniqueCategories.slice(0, 2).join("、")}开始，采用短时高频练习。`
      : "建议先保持每日短时跟读，观察稳定性变化。",
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
        "听辨标准音 2 次",
        "重点音慢速跟读 5 次",
        "生活短句录音提交 1 次",
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
        type: String(exercise.type || (index === 0 ? "听辨" : index === 1 ? "跟读" : "提交")).trim(),
        title: String(exercise.title || items[index] || `任务步骤 ${index + 1}`).trim(),
        instruction: String(exercise.instruction || "按老师要求完成这一小步。").trim(),
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
          type: "听辨",
          title: items[0] || "听辨标准音",
          instruction: "先听标准音，确认目标发音和节奏。",
          targetText: practiceText,
          requiredCount: 2,
        },
        {
          id: "focus",
          type: "跟读",
          title: items[1] || "重点音慢速跟读",
          instruction: `围绕“${profile.issueTags[0] || "重点音"}”慢速跟读，优先做完整动作。`,
          targetText: practiceText,
          requiredCount: repeatCount,
        },
        {
          id: "sentence",
          type: "提交",
          title: items[2] || "生活短句录音提交",
          instruction: "读完整个短句，提交后老师会在批改中心听音复评。",
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
    status: "已发布",
    title: String(edits.title || `${profile.studentName} · 入门测评训练包`).trim() || `${profile.studentName} · 入门测评训练包`,
    targetStudentId: profile.studentId,
    focusTag: profile.issueTags[0] || "入门测评巩固",
    goal: String(edits.recommendation || profile.recommendation || "").trim() || profile.recommendation,
    suggestedDue: String(edits.suggestedDue || "本周内完成").trim() || "本周内完成",
    requiredSubmissions,
    repeatCount,
    practiceText,
    items,
    exerciseSet,
    reviewTags: profile.issueTags.slice(0, 3),
    teacherNote: String(edits.teacherNote || "该任务由入门测评画像生成，已由教师确认后发布。").trim(),
    sourceAssessmentId: profile.id,
  };
}

export function getPublishedTasks(state) {
  return state.publishedTasks || [];
}

function isPublishedTask(task) {
  return task?.status === TASK_STATUS_PUBLISHED || task?.status === "已发布";
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
    .filter((student) => student.trend === "需关注" || Number(student.overdueTasks || 0) > 0 || Number(student.latestScore || 0) < 70)
    .map((student) => ({
      id: student.id,
      name: student.name,
      reason: student.overdueTasks ? "有逾期任务" : student.latestScore < 70 ? "最近测评分偏低" : "趋势需关注",
      score: student.latestScore,
    }));
  return {
    studentCount: students.length,
    completionRate,
    taskCoverageRate,
    averageLatestScore,
    totalPublishedTasks: publishedTasks.length,
    totalSubmissions: submissions.length,
    confirmedAssessments: assessmentProfiles.filter((profile) => profile.status === "教师已确认").length,
    pendingAssessments: getPendingAssessmentProfiles(state).length,
    commonFocusTags,
    attentionStudents,
  };
}

export function getTaskSubmissions(state) {
  return state.taskSubmissions || [];
}

export function getPendingTeacherSubmissions(state) {
  return getTaskSubmissions(state).filter((submission) => submission.status === "待教师复评");
}

export function getReviewedTaskSubmissions(state) {
  return getTaskSubmissions(state).filter((submission) => submission.status === "教师已复评");
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
  const reviewed = submissions.filter((submission) => submission.status === "教师已复评");
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
    student.weeklyPracticeCount >= 5 ? "本周练习频率稳定" : "已开始建立固定练习节奏",
    student.trend === "进步" ? "清晰度较上阶段有进步" : "能完成老师布置的核心练习",
    reviewed.length ? "已收到教师复评并能继续按建议练习" : "AI 初评结果已进入教师复评流程",
  ];
  const nextSteps = focusAreas.length
    ? focusAreas.slice(0, 3).map((tag) => `围绕“${tag}”安排短时高频练习`)
    : ["保持每日 5 分钟慢速跟读与录音复盘"];
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
    pendingSubmissions: submissions.filter((submission) => submission.status === "待教师复评").length,
    focusAreas,
    strengths,
    nextSteps,
    conclusion: student.assessmentSummary,
  };
}

export function buildRehabWeeklyReport(state, student = getSelectedTeacherStudent(state)) {
  const report = buildStudentAssessmentReport(state, student);
  if (!report) return "";
  const scoreText = report.teacherAverage
    ? `教师复评分均值 ${report.teacherAverage} 分，AI 初评分均值 ${report.averageAiScore} 分`
    : `当前参考分 ${report.averageAiScore} 分，等待更多教师复评形成稳定均值`;
  return [
    `【绘声康复周报】${report.studentName}`,
    `训练阶段：${report.stage}`,
    `本周练习：${report.weeklyPracticeCount} 次，录音提交 ${report.completedSubmissions} 次，教师已复评 ${report.reviewedSubmissions} 次`,
    `评分概览：${scoreText}`,
    `主要进步：${report.strengths.join("；")}`,
    `仍需关注：${report.focusAreas.join("；") || "保持当前发音稳定性"}`,
    `下周建议：${report.nextSteps.join("；")}`,
    `教师结论：${report.conclusion}`,
  ].join("\n");
}

export function buildParentCompanionSummary(state, student = getSelectedTeacherStudent(state)) {
  if (!student) return null;
  const todayTask = getTodayStudentTask(state);
  const latestFeedback = getLatestStudentFeedback(state);
  const messages = getStudentTaskMessages(state).slice(-3);
  const report = buildStudentAssessmentReport(state, student);
  const focusText = todayTask?.focusTag || report.focusAreas[0] || "今天的重点音";
  return {
    studentName: student.name,
    todayTitle: todayTask?.title || "今日短时陪练",
    todayGoal: todayTask?.goal || `陪孩子慢慢练习“${focusText}”，先清楚，再自然。`,
    practiceItems: todayTask?.items?.slice(0, 3) || [
      "听一遍标准音",
      "陪孩子慢速跟读 3 次",
      "录一遍短句给老师看",
    ],
    teacherAdvice: latestFeedback?.teacherFeedback
      || messages.at(-1)?.body
      || student.assessmentSummary,
    encouragement: latestFeedback
      ? "老师已经看到这次练习，可以继续按建议巩固。"
      : "先关注孩子愿不愿意开口和有没有比上次更清楚。",
    companionTips: [
      "每次陪练控制在 5 分钟左右，少量多次更稳定。",
      "听不清时先请孩子放慢，不急着说“错了”。",
      "完成后给一句具体鼓励，例如“这个音比刚才更清楚”。",
    ],
    weeklyPlainReport: `${student.name} 本周练习 ${report.weeklyPracticeCount} 次，重点关注：${report.focusAreas.slice(0, 2).join("、") || focusText}。${report.conclusion}`,
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
    exerciseTitle: exercise?.title || "短句录音提交",
    exerciseInstruction: exercise?.instruction || "",
    studentId: task.targetStudentId,
    studentName: student?.name || "学生",
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
  const feedback = action.feedback || "这次有进步，继续按老师建议练习。";
  return {
    id: `message-${submission.id}-${todayKey()}-${(state.taskMessages || []).length + 1}`,
    taskId: submission.taskId,
    submissionId: submission.id,
    studentId: submission.studentId,
    studentName: submission.studentName,
    senderRole: "teacher",
    senderName: state.teacherDashboard?.teacherName || "老师",
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
    note: result?.communication_result?.main_feedback || result?.pinyin_diagnosis?.summary || `${item.focus} 需要继续观察。`,
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
        asrHeard: "等待录音分析",
        modelSummary: `正在完成训练包：${task.title}。录音分析完成后会自动提交给老师。`,
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
        modelSummary: `已保存“${exercise.title}”，可以继续完成下一步。`,
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
        exerciseTitle: savedSubmitStep.exerciseTitle || requiredSubmitExercise?.title || "任务录音提交",
        exerciseInstruction: requiredSubmitExercise?.instruction || "",
        studentId: task.targetStudentId,
        studentName: student?.name || "学生",
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
        note: action.note || `${item.focus} 需要继续观察。`,
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
          ? `${student.name} 完成 ${results.length} 项入门测评，综合参考分 ${averageScore}，重点观察：${(issueTags.length ? issueTags : profile.issueTags).slice(0, 2).join("、")}。`
          : profile.profileSummary,
        recommendation: results.length
          ? `建议先围绕 ${(issueTags.length ? issueTags : profile.issueTags).slice(0, 2).join("、")} 安排短时高频练习，教师确认后发布初始训练包。`
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
            status: "教师已复评",
            reviewedAt: todayKey(),
            teacherFeedback: action.feedback || "这次有进步，继续按老师建议练习。",
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
          displayName: action.displayName || state.account?.displayName || action.username || "用户",
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
        ? state.teacherDashboard?.teacherName || "王老师"
        : state.account?.displayName || "陈小禾";
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
      const title = String(action.title || "新的班级群聊").trim() || "新的班级群聊";
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
      const studentName = state.account?.displayName || "陈小禾";
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
            title: "王老师",
            memberIds: ["teacher-main", studentId],
            createdAt: todayKey(),
            messages: [
              {
                id: `msg-${id}-hello`,
                senderId: studentId,
                senderRole: "student",
                senderName: studentName,
                body: "老师您好，我想请您看看我的练习。",
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
        asrHeard: "等待录音分析",
        modelSummary: "文本已更新。录音后系统会分析你实际说出的声音。",
        ...emptyScores,
      };
    case "APPLY_TEXT_INFO": {
      const syllableMap = syllableMapFromTextInfo(action.info);
      const firstSyllable = Object.keys(syllableMap)[0] || state.selectedSyllable;
      return {
        ...state,
        pinyinText: pinyinDisplay(action.info?.pinyin_display || action.info?.pinyin) || "等待中文文本",
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
        asrHeard: result?.asr?.heard_text || "系统没有稳定听清",
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
        asrHeard: "等待录音分析",
        modelSummary: "已清空本次成绩，可以重新录音。",
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
      label: "当日",
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
      status: item.score >= 82 ? "已掌握" : item.score >= 68 ? "继续练习" : "重点练习",
      level: levelFromScore(item.score),
    }));
  const averageTone = Math.round(
    history.reduce((total, item) => total + item.toneScore, 0) / history.length,
  );
  return {
    label: "当日",
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
