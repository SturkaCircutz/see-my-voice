import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createInitialState, buildTeachingPlan, reduceState } from "../state.js";


const webRoot = path.join(import.meta.dirname, "..");
const manifestPath = path.join(webRoot, "assets/pronunciation-clips/manifest.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function analysisWithIssue({ issueType, unit, initial = "", final = "", text = "妈", pinyin = "ma1" }) {
  return {
    target_text: text,
    pinyin_display: [pinyin],
    communication_result: { readiness_score: 66, main_feedback: "需要重点练习。" },
    asr: { heard_text: text, text_similarity: 60 },
    pinyin_diagnosis: {
      issues: [
        {
          index: 0,
          type: issueType,
          title: `${issueType === "initial" ? "声母" : "韵母"} ${unit} 需要练习`,
          summary: `目标 ${unit} 需要更清楚。`,
          focus: `${issueType === "initial" ? "声母" : "韵母"} ${unit}`,
          detail: "对照视频片段练习。",
          practice: [text],
        },
      ],
    },
    tone_timing: {
      syllables: [
        {
          index: 0,
          char: text,
          pinyin,
          pinyin_display: pinyin,
          initial,
          final,
          tone: "1",
          tone_score: 66,
        },
      ],
    },
  };
}

test("generated pronunciation manifest points to existing clip files", () => {
  const manifest = readJson(manifestPath);
  const clips = [
    ...Object.values(manifest.clips.initial),
    ...Object.values(manifest.clips.final),
  ];
  assert.equal(Object.keys(manifest.clips.initial).length, 21);
  assert.equal(Object.keys(manifest.clips.final).length, 38);
  assert.equal(clips.length, 59);
  for (const initial of ["b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "zh", "ch", "sh", "r", "z", "c", "s"]) {
    assert.ok(manifest.clips.initial[initial], `${initial} should have an initial clip`);
  }
  for (const final of ["i_z", "i_zh"]) {
    assert.ok(manifest.clips.final[final], `${final} should have a special apical final clip`);
  }
  for (const final of ["ei", "ao", "ou", "iu", "iao", "ui", "uai", "ie", "uo", "ua", "ve", "an", "en", "ian", "uan", "van", "in", "un", "vn", "ang", "eng", "iang", "ing", "ong"]) {
    assert.ok(manifest.clips.final[final], `${final} should have a supplemented final clip`);
  }
  for (const clip of clips) {
    const clipPath = path.join(webRoot, clip.url.replace(/^\.\//, ""));
    assert.ok(fs.existsSync(clipPath), `${clip.url} should exist`);
    assert.ok(fs.statSync(clipPath).size > 1000, `${clip.url} should be non-empty`);
  }
});

test("teaching plan resolves real generated initial and final videos", () => {
  const manifest = readJson(manifestPath);
  const initialState = reduceState(createInitialState(), {
    type: "APPLY_ANALYSIS",
    result: analysisWithIssue({ issueType: "initial", unit: "m", initial: "m", final: "a" }),
  });
  const finalState = reduceState(createInitialState(), {
    type: "APPLY_ANALYSIS",
    result: analysisWithIssue({ issueType: "final", unit: "uang", initial: "g", final: "uang", text: "光", pinyin: "guang1" }),
  });
  const initialPlan = buildTeachingPlan(initialState, manifest);
  const finalPlan = buildTeachingPlan(finalState, manifest);
  assert.ok(initialPlan.segments.some((segment) => segment.videoClips.some((clip) => clip.videoUrl.endsWith("initial-m.mp4"))));
  assert.ok(finalPlan.segments.some((segment) => segment.videoClips.some((clip) => clip.videoUrl.endsWith("final-uang.mp4"))));
});

test("teaching plan maps zero-initial y/w spellings to real finals", () => {
  const manifest = readJson(manifestPath);
  const cases = [
    ["wo3", "uo", "final-uo.mp4"],
    ["yao4", "iao", "final-iao.mp4"],
    ["yue4", "ve", "final-ve.mp4"],
    ["yuan2", "van", "final-van.mp4"],
    ["yun2", "vn", "final-vn.mp4"],
  ];
  for (const [pinyin, unit, expectedFile] of cases) {
    const state = reduceState(createInitialState(), {
      type: "APPLY_ANALYSIS",
      clipManifest: manifest,
      result: analysisWithIssue({ issueType: "final", unit, initial: "", final: unit, text: pinyin, pinyin }),
    });
    assert.ok(
      state.teachingPlan.segments.some((segment) => segment.videoClips.some((clip) => clip.videoUrl.endsWith(expectedFile))),
      `${pinyin} should use ${expectedFile}`,
    );
  }
});

test("web app contains teaching video detail renderer and demo entry", () => {
  const appJs = fs.readFileSync(path.join(webRoot, "app.js"), "utf8");
  assert.match(appJs, /renderTeachingVideoPanel/);
  assert.match(appJs, /renderTeachingClip/);
  assert.match(appJs, /ARTICULATION_IMAGE_UNITS/);
  assert.match(appJs, /missingArticulationImageUnits/);
  assert.match(appJs, /activeTeachingSegment/);
  assert.match(appJs, /教学视频/);
  assert.match(appJs, /showSegmentNavigation\s*=\s*segments\.length\s*>\s*1/);
  assert.match(appJs, /clip-video/);
  assert.match(appJs, /pronunciation-clips\/manifest\.json/);
  assert.match(appJs, /demoClip/);
  assert.match(appJs, /demoTeachingClipResult/);
});

test("articulation images are only advertised for units with local image assets", () => {
  const appJs = fs.readFileSync(path.join(webRoot, "app.js"), "utf8");
  const imageUnitBlock = appJs.match(/const ARTICULATION_IMAGE_UNITS = new Set\(\[([\s\S]*?)\]\);/)?.[1] || "";
  assert.match(imageUnitBlock, /"ve"/);
  assert.match(imageUnitBlock, /"uo"/);
  assert.match(imageUnitBlock, /"iao"/);
  assert.match(imageUnitBlock, /"uan"/);
  assert.match(imageUnitBlock, /"i_z"/);
  assert.match(imageUnitBlock, /"i_zh"/);
});

test("teaching clip control flow supports generation, playback, navigation, and returning to practice", () => {
  const manifest = readJson(manifestPath);
  let state = reduceState(createInitialState(), { type: "SELECT_ROLE", role: "student" });
  state = reduceState(state, {
    type: "APPLY_ANALYSIS",
    clipManifest: manifest,
    result: analysisWithIssue({
      issueType: "final",
      unit: "uang",
      initial: "g",
      final: "uang",
      text: "guang",
      pinyin: "guang1",
    }),
  });

  assert.equal(state.currentView, "practice");
  assert.equal(state.selectedClipSegmentIndex, 0);
  assert.equal(state.clipPlaying, false);
  assert.equal(state.teachingPlan.segments.length, 1);
  assert.ok(state.teachingPlan.segments.some((segment) => segment.videoClips.some((clip) => clip.videoUrl.endsWith("final-uang.mp4"))));

  state = reduceState(state, { type: "SET_CLIP_PLAYING", playing: true });
  assert.equal(state.clipPlaying, true);

  state = reduceState(state, { type: "SET_CLIP_SEGMENT", index: state.teachingPlan.segments.length + 20 });
  assert.equal(state.selectedClipSegmentIndex, state.teachingPlan.segments.length - 1);

  state = reduceState(state, { type: "PREVIOUS_CLIP_SEGMENT" });
  assert.equal(state.selectedClipSegmentIndex, 0);

  state = reduceState(state, { type: "SET_CLIP_PLAYING", playing: false });
  assert.equal(state.clipPlaying, false);

  state = reduceState(state, { type: "NAVIGATE", view: "practice" });
  assert.equal(state.currentView, "practice");
  assert.equal(state.clipPlaying, false);
});

test("teaching clip navigation moves between multiple wrong-syllable video segments", () => {
  const manifest = readJson(manifestPath);
  let state = reduceState(createInitialState(), {
    type: "APPLY_ANALYSIS",
    clipManifest: manifest,
    result: {
      target_text: "ABC",
      pinyin_display: ["ma1", "guang1"],
      communication_result: { readiness_score: 52 },
      asr: { heard_text: "ABC", text_similarity: 52 },
      pinyin_diagnosis: {
        issues: [
          { index: 0, type: "initial", title: "m issue", summary: "practice m", focus: "m" },
          { index: 1, type: "final", title: "uang issue", summary: "practice uang", focus: "uang" },
        ],
      },
      tone_timing: {
        syllables: [
          { index: 0, char: "A", pinyin: "ma1", pinyin_display: "ma1", initial: "m", final: "a", tone: "1", tone_score: 50 },
          { index: 1, char: "B", pinyin: "guang1", pinyin_display: "guang1", initial: "g", final: "uang", tone: "1", tone_score: 48 },
        ],
      },
    },
  });

  assert.equal(state.teachingPlan.segments.length, 2);
  assert.equal(state.selectedClipSegmentIndex, 0);
  state = reduceState(state, { type: "NEXT_CLIP_SEGMENT" });
  assert.equal(state.selectedClipSegmentIndex, 1);
  state = reduceState(state, { type: "PREVIOUS_CLIP_SEGMENT" });
  assert.equal(state.selectedClipSegmentIndex, 0);
});
