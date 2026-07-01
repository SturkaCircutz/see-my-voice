import type { ScoreSet } from "../types";
import type { EntryAssessmentItem, LegacySyllable, ToneDrill } from "./types";

// Zero scores keep the practice UI stable before the first analysis.
export const defaultScores: ScoreSet = {
  overall: 0,
  tone: 0,
  clarity: 0,
  rhythm: 0,
};

// Default syllables reproduce the legacy demo feedback for 我要吃饭.
export const defaultSyllables: LegacySyllable[] = [
  {
    id: "wo",
    character: "我",
    pinyin: "wo3",
    score: 88,
    focus: "T3",
    tone: "T3",
    status: "Clear",
    level: "good",
    feedback: "The third-tone turn is natural; make the ending steadier.",
    mouthCue: "Round the lips first, then relax naturally.",
    tongueCue: "Keep the tongue relaxed and feel the oral space for final o.",
    toneCue: "Dip first, then rise; do not hold the lowest point too long.",
    targetTone: [36, 45, 62, 78, 58, 35],
    currentTone: [34, 42, 60, 72, 55, 40],
  },
  {
    id: "yao",
    character: "要",
    pinyin: "yao4",
    score: 82,
    focus: "T4",
    tone: "T4",
    status: "Clear",
    level: "good",
    feedback: "The falling tone direction is correct; make the onset more decisive.",
    mouthCue: "Open the mouth and let the lips spread naturally.",
    tongueCue: "Keep the tongue surface flat and let the sound fall quickly from a high point.",
    toneCue: "Fall quickly from a high point and finish cleanly.",
    targetTone: [20, 30, 42, 56, 72, 84],
    currentTone: [25, 34, 45, 58, 70, 80],
  },
  {
    id: "chi",
    character: "吃",
    pinyin: "chi1",
    score: 70,
    focus: "T1",
    tone: "T1",
    status: "Needs Work",
    level: "warn",
    feedback: "Move the ch onset farther back and keep the pitch steady.",
    mouthCue: "Curl the tongue tip slightly back and let the lips spread naturally.",
    tongueCue: "Place the tongue tip near the front hard palate and let airflow pass behind it.",
    toneCue: "Keep it high and level from start to finish; do not slide down.",
    targetTone: [25, 25, 25, 25, 25, 25],
    currentTone: [32, 29, 30, 34, 39, 44],
  },
  {
    id: "fan",
    character: "饭",
    pinyin: "fan4",
    score: 62,
    focus: "T4",
    tone: "T4",
    status: "Focus Practice",
    level: "focus",
    feedback: "The Tone 4 fall is not clear enough; drop quickly from a high pitch.",
    mouthCue: "Touch the upper teeth lightly to the lower lip and send airflow through the gap.",
    tongueCue: "Finish by touching the tongue tip lightly to the upper gum ridge to close the n nasal.",
    toneCue: "Start higher and fall quickly with a clear pitch range.",
    targetTone: [22, 31, 43, 56, 70, 82],
    currentTone: [35, 38, 43, 49, 57, 64],
  },
];

// Tone drills mirror the legacy tone question bank.
export const toneDrills: Record<string, ToneDrill> = {
  "1": {
    tone: "1",
    label: "Tone 1 ā",
    description: "Practice a high, level tone. The key is not sliding down.",
    words: ["妈", "吃", "高", "开", "天", "书"],
  },
  "2": {
    tone: "2",
    label: "Tone 2 á",
    description: "Practice a naturally rising tone. The key is lifting at the end.",
    words: ["麻", "来", "人", "明", "学", "忙"],
  },
  "3": {
    tone: "3",
    label: "Tone 3 ǎ",
    description: "Practice dipping then rising. The key is reaching a low point in the middle.",
    words: ["马", "你", "好", "想", "水", "买"],
  },
  "4": {
    tone: "4",
    label: "Tone 4 à",
    description: "Practice falling quickly from a high point. The key is a short, firm finish.",
    words: ["骂", "饭", "去", "看", "要", "再"],
  },
};

// Entry assessment prompts reproduce the first-time learner flow.
export const entryAssessmentItems: EntryAssessmentItem[] = [
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

// Common practice phrases use explicit pinyin instead of guessing in the UI.
export const pinyinByText: Record<string, string> = {
  我要吃饭: "wǒ yào chī fàn",
  你好: "nǐ hǎo",
  谢谢: "xiè xie",
  请再说一遍: "qǐng zài shuō yí biàn",
};
