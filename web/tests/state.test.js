import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialState,
  getStreak,
  getProgressData,
  reduceState,
} from "../state.js";

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
