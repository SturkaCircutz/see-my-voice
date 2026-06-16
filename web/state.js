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

export function createInitialState() {
  return {
    currentView: "practice",
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
    lastRecordingUrl: "",
    standardAudioUrl: "",
    selectedToneDrill: "3",
    practiceBackView: "",
    practiceHistory: defaultPracticeHistory(),
    ...emptyScores,
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

export function getCalendarDays(state, count = 14) {
  const practiced = new Set((state.practiceHistory || []).map((item) => item.date));
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

function appendPracticeHistory(state, result) {
  const entry = {
    date: todayKey(),
    text: result?.target_text || state.targetText,
    score: Number(result?.communication_result?.readiness_score ?? 0),
    toneScore: Number(result?.tone_timing?.overall_score ?? 0),
    clarityScore: Number(result?.asr?.text_similarity ?? 0),
    rhythmScore:
      result?.tone_timing?.boundary_confidence === "low"
        ? 62
        : result?.tone_timing?.boundary_confidence === "medium"
          ? 78
          : 88,
  };
  return [...(state.practiceHistory || []), entry].slice(-40);
}

export function reduceState(state, action) {
  switch (action.type) {
    case "NAVIGATE":
      if (!["practice", "detail", "progress", "toneDrill"].includes(action.view)) return state;
      return { ...state, currentView: action.view, playing: false };
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
      return {
        ...state,
        modelStatus: "complete",
        recordingState: "complete",
        analysisResult: result,
        pinyinDiagnosis: result?.pinyin_diagnosis ?? null,
        analysisSyllables: syllableMap,
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
        rhythmScore:
          result?.tone_timing?.boundary_confidence === "low"
            ? 62
            : result?.tone_timing?.boundary_confidence === "medium"
              ? 78
              : 88,
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
        lastRecordingUrl: "",
        standardAudioUrl: "",
        practiceBackView: "",
        targetText: state.targetText,
        asrHeard: "等待录音分析",
        modelSummary: "已清空本次成绩，可以重新录音。",
        ...emptyScores,
      };
    case "SELECT_SYLLABLE":
      if (!getSyllables(state)[action.syllableId]) return state;
      return {
        ...state,
        selectedSyllable: action.syllableId,
        currentView: "detail",
        playing: false,
      };
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
    default:
      return state;
  }
}

export function getProgressData(state) {
  const history = state.practiceHistory || [];
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
      label: "最近练习",
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

  const words = history
    .slice(-6)
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
    label: "最近练习",
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
