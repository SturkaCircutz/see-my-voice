import type { StudentTaskPackage, TaskSubmission } from "./types";

// Published task packages let the task screens match the old prototype before live task APIs exist.
export const studentTaskPackages: StudentTaskPackage[] = [
  {
    id: "task-tone-four-fan",
    title: "Tone 4 Falling Practice",
    goal: "Stabilize the f onset, finish the an ending, and make Tone 4 fall quickly.",
    status: "Published",
    suggestedDue: "Due Today",
    requiredSubmissions: 1,
    practiceText: "我要吃饭",
    teacherNote: "Slow down the f + an movement first. Submit the final sentence after every step is complete.",
    reviewTags: ["Tone 4 fall", "f + an", "Sentence rhythm"],
    exerciseSet: [
      {
        id: "listen",
        type: "Listening",
        title: "Listen and Watch",
        instruction: "Listen to the standard pronunciation and observe mouth shape and rhythm.",
        targetText: "我要吃饭",
        requiredCount: 1,
        requiresSubmission: false,
        practiceItems: ["饭", "要", "我要吃饭"],
        sourceMode: "bank",
        bankPackageId: "tone-four",
      },
      {
        id: "repeat",
        type: "Repeat",
        title: "Repeat Focus Sounds",
        instruction: "Repeat the focus sound slowly before reading the full sentence.",
        targetText: "我要吃饭",
        requiredCount: 3,
        requiresSubmission: false,
        practiceItems: ["饭", "发音", "我想吃饭"],
        sourceMode: "bank",
        bankPackageId: "initial-f",
      },
      {
        id: "submit",
        type: "Recording",
        title: "Short-Sentence Recording Submit",
        instruction: "Read the full sentence, record, and submit it to your teacher.",
        targetText: "我要吃饭",
        requiredCount: 1,
        requiresSubmission: true,
        practiceItems: ["我要吃饭"],
        sourceMode: "custom",
      },
    ],
  },
];

// Task submissions feed the student feedback card and teacher review center.
export const taskSubmissions: TaskSubmission[] = [
  {
    id: "submission-tone-four-fan",
    taskId: "task-tone-four-fan",
    studentId: "student-chen",
    studentName: "Chen Xiaohe",
    taskTitle: "Tone 4 Falling Practice",
    exerciseTitle: "Short-Sentence Recording Submit",
    targetText: "我要吃饭",
    heardText: "我要吃饭",
    status: "Needs Teacher Feedback",
    aiScores: {
      overall: 72,
      tone: 68,
      clarity: 74,
      rhythm: 79,
    },
    aiSummary: "AI first-pass review found the sentence understandable, with Tone 4 fall and final an still needing slow practice.",
  },
];
