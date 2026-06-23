import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  createInitialState,
  buildRecommendedTaskPackage,
  buildRehabWeeklyReport,
  buildStudentAssessmentReport,
  buildTeachingPlan,
  getLatestStudentFeedback,
  getPendingTeacherSubmissions,
  getSelectedTeacherStudent,
  getSelectedTeacherMessages,
  getStreak,
  getStudentTaskMessages,
  getTeacherDashboardSummary,
  getTodayStudentTask,
  getProgressData,
  reduceState,
  selectPrimaryTeachingIssue,
} from "../state.js";

const generatedClipManifest = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "../assets/pronunciation-clips/manifest.json"), "utf8"),
);

test("initial state opens practice with cleared scores", () => {
  const state = createInitialState();
  assert.equal(state.currentView, "practice");
  assert.equal(state.recordingState, "idle");
  assert.equal(state.score, 0);
  assert.equal(state.selectedSyllable, "fan");
});

test("recording advances from idle to recording to complete", () => {
  let state = createInitialState();
  state = reduceState(state, { type: "RECORD_START" });
  assert.equal(state.recordingState, "recording");
  state = reduceState(state, { type: "ANALYZE_START" });
  assert.equal(state.recordingState, "complete");
  assert.equal(state.modelStatus, "analyzing");
});

test("analysis result updates scores and model text", () => {
  const result = {
    pinyin: ["ni2", "hao3"],
    pinyin_display: ["nǐ", "hǎo"],
    communication_result: {
      readiness_score: 91,
      main_feedback: "系统已经听懂这句话。",
    },
    asr: { heard_text: "你好", text_similarity: 100 },
    tone_timing: {
      overall_score: 84,
      boundary_confidence: "medium",
      syllables: [
        {
          index: 0,
          char: "你",
          pinyin: "ni2",
          initial: "n",
          final: "i",
          tone: "2",
          tone_score: 84,
          feedback: "不错。",
        },
      ],
    },
  };
  const state = reduceState(createInitialState(), { type: "APPLY_ANALYSIS", result });
  assert.equal(state.score, 91);
  assert.equal(state.asrHeard, "你好");
  assert.equal(state.pinyinText, "nǐ hǎo");
  assert.equal(getStreak(state), 1);
  assert.equal(getProgressData(state).words[0].word, "我要吃饭");
});

test("text info updates pinyin with tone marks before recording", () => {
  const info = {
    pinyin: ["ni2", "hao3"],
    pinyin_display: ["nǐ", "hǎo"],
    syllables: [
      { index: 0, char: "你", pinyin: "ni2", pinyin_display: "nǐ", initial: "n", final: "i", tone: "2" },
      { index: 1, char: "好", pinyin: "hao3", pinyin_display: "hǎo", initial: "h", final: "ao", tone: "3" },
    ],
  };
  const state = reduceState(createInitialState(), { type: "APPLY_TEXT_INFO", info });
  assert.equal(state.pinyinText, "nǐ hǎo");
});

test("selecting a syllable opens its detail view", () => {
  const state = reduceState(createInitialState(), {
    type: "SELECT_SYLLABLE",
    syllableId: "chi",
  });
  assert.equal(state.currentView, "detail");
  assert.equal(state.selectedSyllable, "chi");
});

test("reset clears the current attempt scores but keeps the text", () => {
  let state = reduceState(createInitialState(), { type: "RECORD" });
  state = reduceState(state, { type: "RECORD" });
  state = reduceState(state, { type: "RESET_PRACTICE" });
  assert.equal(state.recordingState, "idle");
  assert.equal(state.score, 0);
  assert.equal(state.targetText, "我要吃饭");
  assert.equal(state.playing, false);
});

test("navigation and detail tip selection update independently", () => {
  let state = reduceState(createInitialState(), {
    type: "NAVIGATE",
    view: "detail",
  });
  state = reduceState(state, { type: "SELECT_TIP", tipId: "tone" });
  assert.equal(state.currentView, "detail");
  assert.equal(state.selectedTip, "tone");
});

test("empty progress uses cleared live chart data", () => {
  const state = reduceState(createInitialState(), {
    type: "SET_PERIOD",
    period: "previous",
  });
  assert.equal(state.period, "previous");
  assert.deepEqual(getProgressData(state).scores, [0, 0, 0, 0, 0, 0, 0]);
  assert.match(getProgressData(state).labels.at(-1), /^\d{1,2}\/\d{1,2}$/);
});

test("tone drill navigation selects a tone-specific exercise page", () => {
  const state = reduceState(createInitialState(), {
    type: "SET_TONE_DRILL",
    tone: "2",
  });
  assert.equal(state.currentView, "toneDrill");
  assert.equal(state.selectedToneDrill, "2");
});

test("unknown actions and invalid destinations preserve state", () => {
  const initial = createInitialState();
  assert.deepEqual(reduceState(initial, { type: "UNKNOWN" }), initial);
  assert.deepEqual(
    reduceState(initial, { type: "NAVIGATE", view: "missing" }),
    initial,
  );
});

test("teacher dashboard starts with student profiles and review workload", () => {
  const state = createInitialState();
  const summary = getTeacherDashboardSummary(state);
  assert.equal(summary.studentCount, 3);
  assert.equal(summary.pendingSubmissions, 3);
  assert.equal(summary.overdueTasks, 1);
  assert.equal(getSelectedTeacherStudent(state).name, "林一一");
});

test("teacher view navigation and student selection update teacher profile", () => {
  let state = reduceState(createInitialState(), { type: "NAVIGATE", view: "teacher" });
  assert.equal(state.currentView, "teacher");
  state = reduceState(state, { type: "SELECT_TEACHER_STUDENT", studentId: "student-chen" });
  assert.equal(state.currentView, "teacher");
  assert.equal(getSelectedTeacherStudent(state).name, "陈小禾");
});

test("recommended task package stays teacher-reviewed before publishing", () => {
  let state = createInitialState();
  let taskPackage = buildRecommendedTaskPackage(getSelectedTeacherStudent(state));
  assert.equal(taskPackage.status, "待教师审核");
  assert.equal(taskPackage.category, undefined);
  assert.match(taskPackage.title, /声母专项/);
  assert.ok(taskPackage.items.some((item) => item.includes("短句录音提交")));

  state = reduceState(state, { type: "SELECT_TEACHER_STUDENT", studentId: "student-chen" });
  taskPackage = buildRecommendedTaskPackage(getSelectedTeacherStudent(state));
  assert.match(taskPackage.title, /声调专项/);
  assert.equal(taskPackage.repeatCount, 5);
  assert.ok(taskPackage.reviewTags.includes("第三声常读平"));
});

test("teacher can publish a recommended task to the student today task", () => {
  let state = createInitialState();
  assert.equal(getTodayStudentTask(state), null);

  state = reduceState(state, { type: "PUBLISH_RECOMMENDED_TASK" });
  let todayTask = getTodayStudentTask(state);
  assert.equal(todayTask.status, "已发布");
  assert.equal(todayTask.targetStudentId, "student-lin");
  assert.match(todayTask.title, /声母专项/);

  state = reduceState(state, { type: "SELECT_TEACHER_STUDENT", studentId: "student-chen" });
  state = reduceState(state, { type: "PUBLISH_RECOMMENDED_TASK" });
  todayTask = getTodayStudentTask(state);
  assert.equal(state.publishedTasks.length, 2);
  assert.ok(state.publishedTasks.some((task) => task.targetStudentId === "student-chen"));
  assert.equal(todayTask.status, "已发布");
});

test("analysis without a published task does not create teacher submission", () => {
  const result = {
    target_text: "你好",
    pinyin_display: ["ni3", "hao3"],
    communication_result: {
      readiness_score: 80,
      main_feedback: "这次整体接近目标。",
    },
    asr: { heard_text: "你好", text_similarity: 88 },
    pinyin_diagnosis: { summary: "拼音基本一致。", issues: [] },
    tone_timing: {
      overall_score: 76,
      boundary_confidence: "medium",
      syllables: [
        { index: 0, char: "你", pinyin: "ni3", pinyin_display: "ni3", initial: "n", final: "i", tone: "3", tone_score: 76 },
      ],
    },
  };
  const state = reduceState(createInitialState(), { type: "APPLY_ANALYSIS", result });
  assert.equal(getPendingTeacherSubmissions(state).length, 0);
  assert.equal(getTeacherDashboardSummary(state).pendingSubmissions, 3);
});

test("published task analysis creates a teacher review submission", () => {
  const result = {
    target_text: "我要吃饭",
    pinyin_display: ["wo3", "yao4", "chi1", "fan4"],
    communication_result: {
      readiness_score: 67,
      main_feedback: "f 的起音比上次清楚，an 的收尾还可以再慢一点。",
    },
    asr: { heard_text: "我要吃饭", text_similarity: 82 },
    pinyin_diagnosis: {
      summary: "主要关注 fan 的韵母收尾。",
      issues: [{ index: 3, type: "final", title: "an 收尾", summary: "an 收尾还不够完整。", focus: "韵母 an" }],
    },
    tone_timing: {
      overall_score: 71,
      boundary_confidence: "low",
      syllables: [
        { index: 0, char: "我", pinyin: "wo3", pinyin_display: "wo3", initial: "", final: "uo", tone: "3", tone_score: 75 },
        { index: 3, char: "饭", pinyin: "fan4", pinyin_display: "fan4", initial: "f", final: "an", tone: "4", tone_score: 62 },
      ],
    },
  };
  let state = reduceState(createInitialState(), { type: "PUBLISH_RECOMMENDED_TASK" });
  state = reduceState(state, { type: "APPLY_ANALYSIS", result, recordingUrl: "blob:student-recording" });
  const submissions = getPendingTeacherSubmissions(state);

  assert.equal(submissions.length, 1);
  assert.equal(getTeacherDashboardSummary(state).pendingSubmissions, 4);
  assert.equal(submissions[0].studentId, "student-lin");
  assert.equal(submissions[0].recordingUrl, "blob:student-recording");
  assert.equal(submissions[0].targetText, "我要吃饭");
  assert.equal(submissions[0].aiScores.overall, 67);
  assert.equal(submissions[0].aiScores.rhythm, 62);
  assert.match(submissions[0].aiSummary, /f 的起音/);
});

test("teacher review completes a submission and exposes student feedback", () => {
  const result = {
    target_text: "我要吃饭",
    pinyin_display: ["wo3", "yao4", "chi1", "fan4"],
    communication_result: {
      readiness_score: 67,
      main_feedback: "f 的起音比上次清楚。",
    },
    asr: { heard_text: "我要吃饭", text_similarity: 82 },
    pinyin_diagnosis: { summary: "继续关注 an。", issues: [] },
    tone_timing: {
      overall_score: 71,
      boundary_confidence: "medium",
      syllables: [
        { index: 0, char: "我", pinyin: "wo3", pinyin_display: "wo3", initial: "", final: "uo", tone: "3", tone_score: 75 },
      ],
    },
  };
  let state = reduceState(createInitialState(), { type: "PUBLISH_RECOMMENDED_TASK" });
  state = reduceState(state, { type: "APPLY_ANALYSIS", result, recordingUrl: "blob:student-recording" });
  const submissionId = getPendingTeacherSubmissions(state)[0].id;
  state = reduceState(state, {
    type: "REVIEW_TASK_SUBMISSION",
    submissionId,
    teacherScore: 74,
    feedback: "这次更清楚了，下一次把 an 的收尾再放慢一点。",
  });

  assert.equal(getPendingTeacherSubmissions(state).length, 0);
  assert.equal(getTeacherDashboardSummary(state).pendingSubmissions, 3);
  assert.equal(getLatestStudentFeedback(state).teacherScore, 74);
  assert.match(getLatestStudentFeedback(state).teacherFeedback, /下一次/);
  assert.equal(getLatestStudentFeedback(state).status, "教师已复评");
  assert.equal(getStudentTaskMessages(state).length, 1);
  assert.equal(getStudentTaskMessages(state)[0].senderRole, "teacher");
  assert.match(getStudentTaskMessages(state)[0].body, /下一次/);
  assert.equal(getSelectedTeacherMessages(state).length, 1);
  assert.equal(getSelectedTeacherMessages(state)[0].relatedText, "我要吃饭");
});

test("teacher assessment report summarizes profile and reviewed submissions", () => {
  const result = {
    target_text: "我要吃饭",
    pinyin_display: ["wo3", "yao4", "chi1", "fan4"],
    communication_result: {
      readiness_score: 67,
      main_feedback: "f 的起音比上次清楚。",
    },
    asr: { heard_text: "我要吃饭", text_similarity: 82 },
    pinyin_diagnosis: { summary: "继续关注 an 收尾。", issues: [] },
    tone_timing: {
      overall_score: 71,
      boundary_confidence: "medium",
      syllables: [
        { index: 0, char: "我", pinyin: "wo3", pinyin_display: "wo3", initial: "", final: "uo", tone: "3", tone_score: 75 },
      ],
    },
  };
  let state = createInitialState();
  let report = buildStudentAssessmentReport(state);
  assert.equal(report.studentName, "林一一");
  assert.equal(report.averageAiScore, 72);
  assert.equal(report.teacherAverage, null);
  assert.ok(report.focusAreas.includes("f 起音不稳定"));

  state = reduceState(state, { type: "PUBLISH_RECOMMENDED_TASK" });
  state = reduceState(state, { type: "APPLY_ANALYSIS", result, recordingUrl: "blob:student-recording" });
  state = reduceState(state, {
    type: "REVIEW_TASK_SUBMISSION",
    submissionId: getPendingTeacherSubmissions(state)[0].id,
    teacherScore: 74,
    feedback: "这次更清楚了。",
  });
  report = buildStudentAssessmentReport(state);
  assert.equal(report.completedSubmissions, 1);
  assert.equal(report.reviewedSubmissions, 1);
  assert.equal(report.teacherAverage, 74);
  assert.equal(report.averageAiScore, 67);
  assert.ok(report.nextSteps.some((item) => item.includes("f 起音不稳定")));

  const weeklyReport = buildRehabWeeklyReport(state);
  assert.match(weeklyReport, /绘声康复周报/);
  assert.match(weeklyReport, /教师复评分均值 74 分/);
  assert.match(weeklyReport, /继续关注 an 收尾/);
});

test("teaching issue selection prefers segmental issues over tone-only issues", () => {
  const issue = selectPrimaryTeachingIssue([
    { type: "tone", index: 0, title: "声调问题" },
    { type: "final", index: 1, title: "韵母问题" },
  ]);
  assert.equal(issue.type, "final");
});

test("teaching plan uses pronunciation video clips when manifest matches", () => {
  const result = {
    target_text: "吃饭",
    pinyin_display: ["chī", "fàn"],
    communication_result: { readiness_score: 70 },
    asr: { heard_text: "七饭", text_similarity: 70 },
    pinyin_diagnosis: {
      issues: [
        {
          index: 0,
          type: "initial",
          title: "声母 ch 可能不够清楚",
          summary: "目标是 chi1，系统听成 qi1。",
          focus: "声母 ch",
          detail: "舌尖稍向后卷。",
          practice: ["吃", "茶"],
        },
      ],
    },
    tone_timing: {
      syllables: [
        {
          index: 0,
          char: "吃",
          pinyin: "chi1",
          pinyin_display: "chī",
          initial: "ch",
          final: "i",
          tone: "1",
          tone_score: 62,
          tone_curve: { target: [20, 20], user: [30, 40], has_user_pitch: true },
        },
      ],
    },
  };
  const analyzed = reduceState(createInitialState(), { type: "APPLY_ANALYSIS", result });
  const plan = buildTeachingPlan(analyzed, {
    clips: {
      initial: {
        ch: {
          url: "./assets/pronunciation-clips/initial-ch.mp4",
          title: "声母 ch 发音示范",
          notes: "看舌尖后卷和送气。",
        },
      },
      final: {},
    },
  });
  assert.equal(plan.focusIssue.type, "initial");
  assert.ok(plan.segments.some((segment) => segment.videoClips.some((clip) => clip.type === "video-articulation")));
  assert.equal(
    plan.segments.flatMap((segment) => segment.videoClips).find((clip) => clip.type === "video-articulation").videoUrl,
    "./assets/pronunciation-clips/initial-ch.mp4",
  );
});

test("teaching plan uses generated pronunciation clip manifest", () => {
  const result = {
    target_text: "妈妈",
    pinyin_display: ["mā", "ma"],
    communication_result: { readiness_score: 68 },
    asr: { heard_text: "爸爸", text_similarity: 60 },
    pinyin_diagnosis: {
      issues: [
        {
          index: 0,
          type: "initial",
          title: "声母 m 可能不够清楚",
          summary: "目标声母是 m。",
          focus: "声母 m",
          detail: "闭唇并让气流从鼻腔出来。",
          practice: ["妈"],
        },
      ],
    },
    tone_timing: {
      syllables: [
        { index: 0, char: "妈", pinyin: "ma1", pinyin_display: "mā", initial: "m", final: "a", tone: "1", tone_score: 70 },
      ],
    },
  };
  const analyzed = reduceState(createInitialState(), { type: "APPLY_ANALYSIS", result });
  const plan = buildTeachingPlan(analyzed, generatedClipManifest);
  const videoClips = plan.segments.flatMap((segment) => segment.videoClips);
  assert.ok(videoClips.some((clip) => clip.unit === "m"));
});

test("teaching plan uses generated final clips from manifest", () => {
  const result = {
    target_text: "啊",
    pinyin_display: ["ā"],
    communication_result: { readiness_score: 68 },
    asr: { heard_text: "呃", text_similarity: 60 },
    pinyin_diagnosis: {
      issues: [
        {
          index: 0,
          type: "final",
          title: "韵母 a 可能不够完整",
          summary: "目标韵母是 a。",
          focus: "韵母 a",
          detail: "口腔打开，声音要饱满。",
          practice: ["啊"],
        },
      ],
    },
    tone_timing: {
      syllables: [
        { index: 0, char: "啊", pinyin: "a1", pinyin_display: "ā", initial: "", final: "a", tone: "1", tone_score: 70 },
      ],
    },
  };
  const analyzed = reduceState(createInitialState(), { type: "APPLY_ANALYSIS", result });
  const plan = buildTeachingPlan(analyzed, generatedClipManifest);
  const videoClips = plan.segments.flatMap((segment) => segment.videoClips);
  assert.ok(videoClips.some((clip) => clip.unit === "a"));
});

test("teaching plan can use generated compound final clips", () => {
  const result = {
    target_text: "光",
    pinyin_display: ["guāng"],
    communication_result: { readiness_score: 65 },
    asr: { heard_text: "关", text_similarity: 60 },
    pinyin_diagnosis: {
      issues: [
        {
          index: 0,
          type: "final",
          title: "韵母 uang 可能不够完整",
          summary: "目标韵母是 uang。",
          focus: "韵母 uang",
          detail: "圆唇后打开并收到后鼻音。",
          practice: ["光"],
        },
      ],
    },
    tone_timing: {
      syllables: [
        { index: 0, char: "光", pinyin: "guang1", pinyin_display: "guāng", initial: "g", final: "uang", tone: "1", tone_score: 65 },
      ],
    },
  };
  const analyzed = reduceState(createInitialState(), { type: "APPLY_ANALYSIS", result });
  const plan = buildTeachingPlan(analyzed, generatedClipManifest);
  assert.ok(plan.segments.some((segment) => segment.videoClips.some((clip) => clip.type === "video-articulation" && clip.unit === "uang")));
});

test("teaching plan falls back to articulation segment when clip is missing", () => {
  const result = {
    target_text: "饭",
    pinyin_display: ["fàn"],
    communication_result: { readiness_score: 61 },
    asr: { heard_text: "范", text_similarity: 61 },
    pinyin_diagnosis: {
      issues: [
        {
          index: 0,
          type: "final",
          title: "韵母 an 可能不够完整",
          summary: "目标韵母是 an。",
          focus: "韵母 an",
          detail: "结尾收住鼻音。",
          practice: [],
        },
      ],
    },
    tone_timing: {
      syllables: [
        { index: 0, char: "饭", pinyin: "fan4", pinyin_display: "fàn", initial: "f", final: "an", tone: "4", tone_score: 58 },
      ],
    },
  };
  const analyzed = reduceState(createInitialState(), { type: "APPLY_ANALYSIS", result });
  const plan = buildTeachingPlan(analyzed, { clips: { initial: {}, final: {} } });
  assert.ok(plan.segments.some((segment) => segment.videoClips.some((clip) => clip.type === "missing-articulation" && clip.unit === "an")));
  assert.deepEqual(plan.segments.at(-1).practiceWords, ["饭"]);
});

test("analysis automatically generates teaching clip state without navigating away", () => {
  const result = {
    target_text: "饭",
    pinyin_display: ["fàn"],
    communication_result: { readiness_score: 61 },
    asr: { heard_text: "范", text_similarity: 61 },
    pinyin_diagnosis: {
      issues: [{ index: 0, type: "tone", title: "声调问题", summary: "声调需要练习。", focus: "声调 T4" }],
    },
    tone_timing: {
      syllables: [
        { index: 0, char: "饭", pinyin: "fan4", pinyin_display: "fàn", initial: "f", final: "an", tone: "4", tone_score: 58 },
      ],
    },
  };
  let state = reduceState(createInitialState(), { type: "APPLY_ANALYSIS", result, clipManifest: {} });
  assert.equal(state.currentView, "practice");
  assert.ok(state.teachingPlan);
  state = reduceState(state, { type: "RESET_PRACTICE" });
  assert.equal(state.teachingPlan, null);
  assert.equal(state.selectedClipSegmentIndex, 0);
  assert.equal(state.clipPlaying, false);
});

test("analysis without diagnosis issues generates a review teaching clip", () => {
  const result = {
    pinyin_display: ["nǐ"],
    communication_result: { readiness_score: 95 },
    asr: { heard_text: "你", text_similarity: 100 },
    pinyin_diagnosis: { issues: [], summary: "拼音一致。" },
    tone_timing: {
      syllables: [
        { index: 0, char: "你", pinyin: "ni3", pinyin_display: "nǐ", initial: "n", final: "i", tone: "3", tone_score: 90 },
      ],
    },
  };
  let state = reduceState(createInitialState(), { type: "APPLY_ANALYSIS", result, clipManifest: {} });
  assert.equal(state.currentView, "practice");
  assert.ok(state.teachingPlan);
  assert.equal(state.teachingPlan.focusIssue.type, "review");
});

test("teaching plan creates one segment per diagnosed wrong syllable", () => {
  const result = {
    target_text: "abc",
    pinyin_display: ["ma1", "guang1", "ni3"],
    communication_result: { readiness_score: 58 },
    asr: { heard_text: "abc", text_similarity: 58 },
    pinyin_diagnosis: {
      issues: [
        { index: 0, type: "initial", title: "m issue", summary: "practice m", focus: "m" },
        { index: 1, type: "final", title: "uang issue", summary: "practice uang", focus: "uang" },
        { index: 2, type: "tone", title: "tone issue", summary: "practice tone", focus: "tone" },
      ],
    },
    tone_timing: {
      syllables: [
        { index: 0, char: "A", pinyin: "ma1", pinyin_display: "ma1", initial: "m", final: "a", tone: "1", tone_score: 55 },
        { index: 1, char: "B", pinyin: "guang1", pinyin_display: "guang1", initial: "g", final: "uang", tone: "1", tone_score: 52 },
        { index: 2, char: "C", pinyin: "ni3", pinyin_display: "ni3", initial: "n", final: "i", tone: "3", tone_score: 50 },
      ],
    },
  };
  const state = reduceState(createInitialState(), { type: "APPLY_ANALYSIS", result, clipManifest: generatedClipManifest });
  assert.equal(state.teachingPlan.segments.length, 3);
  assert.deepEqual(state.teachingPlan.segments.map((segment) => segment.character), ["A", "B", "C"]);
  assert.ok(state.teachingPlan.segments[0].videoClips.some((clip) => clip.unit === "m"));
  assert.ok(state.teachingPlan.segments[1].videoClips.some((clip) => clip.unit === "uang"));
});

test("teaching plan maps apical i finals to specialized clips", () => {
  const result = {
    target_text: "资吃",
    pinyin_display: ["zi1", "chi1"],
    communication_result: { readiness_score: 58 },
    asr: { heard_text: "资吃", text_similarity: 58 },
    pinyin_diagnosis: {
      issues: [
        { index: 0, type: "final", title: "i_z issue", summary: "practice i_z", focus: "i_z" },
        { index: 1, type: "final", title: "i_zh issue", summary: "practice i_zh", focus: "i_zh" },
      ],
    },
    tone_timing: {
      syllables: [
        { index: 0, char: "资", pinyin: "zi1", pinyin_display: "zi1", initial: "z", final: "i", tone: "1", tone_score: 55 },
        { index: 1, char: "吃", pinyin: "chi1", pinyin_display: "chi1", initial: "ch", final: "i", tone: "1", tone_score: 52 },
      ],
    },
  };
  const state = reduceState(createInitialState(), { type: "APPLY_ANALYSIS", result, clipManifest: generatedClipManifest });
  assert.ok(state.teachingPlan.segments[0].videoClips.some((clip) => clip.unit === "i_z"));
  assert.ok(state.teachingPlan.segments[1].videoClips.some((clip) => clip.unit === "i_zh"));
});

test("review teaching plan chooses one lowest-scored syllable when there are no issues", () => {
  const result = {
    target_text: "abc",
    pinyin_display: ["ma1", "guang1", "ni3"],
    communication_result: { readiness_score: 92 },
    asr: { heard_text: "abc", text_similarity: 100 },
    pinyin_diagnosis: { issues: [] },
    tone_timing: {
      syllables: [
        { index: 0, char: "A", pinyin: "ma1", pinyin_display: "ma1", initial: "m", final: "a", tone: "1", tone_score: 92 },
        { index: 1, char: "B", pinyin: "guang1", pinyin_display: "guang1", initial: "g", final: "uang", tone: "1", tone_score: 85 },
        { index: 2, char: "C", pinyin: "ni3", pinyin_display: "ni3", initial: "n", final: "i", tone: "3", tone_score: 90 },
      ],
    },
  };
  const state = reduceState(createInitialState(), { type: "APPLY_ANALYSIS", result, clipManifest: generatedClipManifest });
  assert.equal(state.teachingPlan.segments.length, 1);
  assert.equal(state.teachingPlan.focusIssue.type, "review");
  assert.equal(state.teachingPlan.segments[0].character, "B");
});

test("selecting a detail syllable rebuilds teaching clip for that syllable", () => {
  const result = {
    target_text: "光明",
    pinyin_display: ["guang1", "ming2"],
    communication_result: { readiness_score: 75 },
    asr: { heard_text: "光明", text_similarity: 75 },
    pinyin_diagnosis: {
      issues: [{ index: 0, type: "final", title: "韵母 uang 需要巩固", summary: "练习 uang", focus: "韵母 uang" }],
    },
    tone_timing: {
      syllables: [
        { index: 0, char: "光", pinyin: "guang1", pinyin_display: "guang1", initial: "g", final: "uang", tone: "1", tone_score: 75 },
        { index: 1, char: "明", pinyin: "ming2", pinyin_display: "ming2", initial: "m", final: "ing", tone: "2", tone_score: 80 },
      ],
    },
  };
  let state = reduceState(createInitialState(), { type: "APPLY_ANALYSIS", result, clipManifest: generatedClipManifest });
  assert.ok(state.teachingPlan.segments.some((segment) => segment.videoClips.some((clip) => clip.videoUrl?.endsWith("final-uang.mp4"))));
  const secondId = Object.keys(state.analysisSyllables).find((id) => id.includes("ming"));
  state = reduceState(state, { type: "SELECT_SYLLABLE", syllableId: secondId, clipManifest: generatedClipManifest });
  assert.equal(state.currentView, "detail");
  assert.equal(state.teachingPlan.targetSyllable.character, "明");
  assert.ok(state.teachingPlan.segments.some((segment) => segment.videoClips.some((clip) => clip.unit === "m")));
});

test("clip segment navigation clamps to valid segment range", () => {
  const result = {
    target_text: "饭",
    pinyin_display: ["fàn"],
    communication_result: { readiness_score: 61 },
    asr: { heard_text: "范", text_similarity: 61 },
    pinyin_diagnosis: {
      issues: [{ index: 0, type: "final", title: "韵母问题", summary: "韵母需要练习。", focus: "韵母 an" }],
    },
    tone_timing: {
      syllables: [
        { index: 0, char: "饭", pinyin: "fan4", pinyin_display: "fàn", initial: "f", final: "an", tone: "4", tone_score: 58 },
      ],
    },
  };
  let state = reduceState(createInitialState(), { type: "APPLY_ANALYSIS", result });
  state = reduceState(state, { type: "GENERATE_TEACHING_CLIP", clipManifest: {} });
  state = reduceState(state, { type: "SET_CLIP_SEGMENT", index: 999 });
  assert.equal(state.selectedClipSegmentIndex, state.teachingPlan.segments.length - 1);
  state = reduceState(state, { type: "SET_CLIP_SEGMENT", index: -10 });
  assert.equal(state.selectedClipSegmentIndex, 0);
});
