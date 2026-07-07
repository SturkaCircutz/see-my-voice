import type { AssessmentProfile, QuestionBankPackage, TeacherStudent } from "./types";

// Neutral sample learners let the teacher pages render before real task APIs exist.
export const teacherStudents: TeacherStudent[] = [
  {
    id: "learner-a",
    name: "Learner A",
    stage: "Initial Stabilization Stage",
    latestScore: 72,
    weeklyPracticeCount: 5,
    pendingSubmissions: 2,
    overdueTasks: 0,
    lastPracticeAt: "Today",
    focusTags: ["Unstable f onset", "Incomplete an ending", "Tone 2 rise is not clear"],
    assessmentSummary: "Clarity improved from last week; final endings still need slow repetition.",
    trend: "Improving",
  },
  {
    id: "learner-b",
    name: "Learner B",
    stage: "Tone Strengthening Stage",
    latestScore: 66,
    weeklyPracticeCount: 3,
    pendingSubmissions: 1,
    overdueTasks: 1,
    lastPracticeAt: "Yesterday",
    focusTags: ["Tone 3 often sounds flat", "Speaking rate is too fast", "Pauses are unnatural"],
    assessmentSummary: "Single-character tones are distinguishable; Tone 3 and pauses in short sentences need continued observation.",
    trend: "Needs Attention",
  },
  {
    id: "learner-c",
    name: "Learner C",
    stage: "Final Completeness Training",
    latestScore: 81,
    weeklyPracticeCount: 6,
    pendingSubmissions: 0,
    overdueTasks: 0,
    lastPracticeAt: "Today",
    focusTags: ["n/l confusion", "Unstable ang ending", "Repeat-after-me volume is too low"],
    assessmentSummary: "Practice frequency was strong this week, and the ang ending is clearer than last time.",
    trend: "Stable",
  },
];

// Question bank packages drive the teacher practice-pack editor.
export const questionBankPackages: QuestionBankPackage[] = [
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
    id: "tone-four",
    title: "Tone 4 Practice Pack",
    category: "Tone",
    focusTags: ["Tone 4 fall is not clear", "Ending is dragged"],
    description: "Fall quickly from a high point; keep it short and firm without dragging the ending.",
    items: ["饭", "去", "看", "要", "我要去。", "我想吃饭。"],
    targetText: "我要去",
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

export const assessmentProfiles: AssessmentProfile[] = [
  // Sample assessment profile drives the teacher confirmation flow.
  {
    id: "assessment-sample",
    studentName: "Learner B",
    status: "Needs Teacher Confirmation",
    overallScore: 68,
    issueTags: ["Unstable f onset", "Incomplete final an ending", "Tone 4 fall is not clear"],
    profileSummary: "Entry assessment shows understandable short sentences, but the f onset and final an ending need slow, focused repetition.",
    recommendation: "Start with focused sound practice, then record a short sentence for review.",
  },
];
