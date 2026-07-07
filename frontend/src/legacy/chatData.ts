import type { ChatThread } from "./types";

// Sample chat threads keep the chat layout visible in the React port.
export const chatThreads: ChatThread[] = [
  {
    id: "chat-direct-sample",
    title: "Coach",
    type: "direct",
    unread: 1,
    lastMessage: "Finish the f + an short-sentence recording first today.",
    memberIds: ["learner-b", "teacher-main"],
    messages: [
      {
        id: "m1",
        sender: "Coach",
        senderId: "teacher-main",
        body: "Finish the f + an short-sentence recording first today. Reading a little slower is fine.",
        time: "08:30",
        readBy: ["teacher-main"],
        relatedText: "f + an",
      },
      {
        id: "m1-reply",
        sender: "Learner B",
        senderId: "learner-b",
        body: "I finished the first recording. Please review it again.",
        time: "08:46",
        readBy: ["learner-b", "teacher-main"],
        relatedText: "我要吃饭",
      },
    ],
  },
  {
    id: "chat-class-main",
    title: "Qiyin Class 1 Group Chat",
    type: "class",
    unread: 0,
    lastMessage: "After today's recordings, I will listen to them one by one.",
    memberIds: ["learner-b", "learner-a", "learner-c", "teacher-main"],
    messages: [
      {
        id: "m2",
        sender: "Coach",
        senderId: "teacher-main",
        body: "Everyone, after you finish today's assigned recordings, I will listen to them one by one.",
        time: "09:05",
        readBy: ["teacher-main", "learner-b", "learner-a", "learner-c"],
      },
    ],
  },
];

export const studentQuickReplies = [
  // Quick replies reduce typing on mobile chat screens.
  "Got it",
  "I finished the recording",
  "Please review it again",
  "I will keep practicing today",
];

export const teacherQuickReplies = [
  // Teacher quick replies focus on short feedback and pacing.
  "Improving. Keep going.",
  "This is steadier than last time.",
  "Read a little slower first.",
  "I will listen again.",
  "No rush. Follow the steps.",
];
