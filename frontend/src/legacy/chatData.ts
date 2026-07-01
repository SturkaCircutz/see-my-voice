import type { ChatThread } from "./types";

// Sample chat threads keep the chat layout visible in the React port.
export const chatThreads: ChatThread[] = [
  {
    id: "chat-direct-chen",
    title: "Ms. Wang",
    type: "direct",
    unread: 1,
    lastMessage: "Finish the f + an short-sentence recording first today.",
    memberIds: ["student-chen", "teacher-main"],
    messages: [
      {
        id: "m1",
        sender: "Ms. Wang",
        senderId: "teacher-main",
        body: "Finish the f + an short-sentence recording first today. Reading a little slower is fine.",
        time: "08:30",
        readBy: ["teacher-main"],
        relatedText: "f + an",
      },
      {
        id: "m1-reply",
        sender: "Chen Xiaohe",
        senderId: "student-chen",
        body: "I finished the first recording. Please review it again.",
        time: "08:46",
        readBy: ["student-chen", "teacher-main"],
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
    memberIds: ["student-chen", "student-lin", "student-qiao", "teacher-main"],
    messages: [
      {
        id: "m2",
        sender: "Ms. Wang",
        senderId: "teacher-main",
        body: "Everyone, after you finish today's assigned recordings, I will listen to them one by one.",
        time: "09:05",
        readBy: ["teacher-main", "student-chen", "student-lin", "student-qiao"],
      },
    ],
  },
];

export const studentQuickReplies = [
  "Got it",
  "I finished the recording",
  "Please review it again",
  "I will keep practicing today",
];

export const teacherQuickReplies = [
  "Improving. Keep going.",
  "This is steadier than last time.",
  "Read a little slower first.",
  "I will listen again.",
  "No rush. Follow the steps.",
];
