import type { LegacySyllable } from "./types";

const articulationUnits = new Set([
  "a",
  "ai",
  "an",
  "ang",
  "ao",
  "b",
  "c",
  "ch",
  "d",
  "e",
  "ei",
  "en",
  "eng",
  "er",
  "f",
  "g",
  "h",
  "i",
  "i_z",
  "i_zh",
  "ia",
  "ian",
  "iang",
  "iao",
  "in",
  "ing",
  "iong",
  "ie",
  "iu",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "ong",
  "ou",
  "p",
  "q",
  "r",
  "s",
  "sh",
  "t",
  "u",
  "ua",
  "uai",
  "uan",
  "uang",
  "uo",
  "ueng",
  "ui",
  "un",
  "v",
  "van",
  "ve",
  "vn",
  "x",
  "z",
  "zh",
]);

const initials = ["zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s"];
const imageExtensions = ["png", "jpeg", "jpg", "webp"];
const splitArticulationUnits = new Set(["b", "m", "p"]);

const articulationImageUnits = new Set([
  "a",
  "ai",
  "an",
  "ang",
  "ao",
  "b",
  "c",
  "ch",
  "d",
  "e",
  "ei",
  "en",
  "eng",
  "er",
  "f",
  "g",
  "h",
  "i",
  "i_z",
  "i_zh",
  "ia",
  "ian",
  "iang",
  "iao",
  "ie",
  "in",
  "ing",
  "iong",
  "iu",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "ong",
  "ou",
  "p",
  "q",
  "r",
  "s",
  "sh",
  "t",
  "u",
  "ua",
  "uai",
  "uan",
  "uang",
  "uo",
  "ueng",
  "ui",
  "un",
  "v",
  "van",
  "ve",
  "vn",
  "x",
  "z",
  "zh",
]);

export interface ArticulationUnit {
  kind: "Initial" | "Final";
  unit: string;
}

export function mouthShapeClass(syllable: LegacySyllable) {
  const final = syllable.pinyin?.replace(/[a-z]*?([aeiouv].*)\d?$/i, "$1") || "";
  if (/u|o|ong|ou/.test(final)) return "shape-round";
  if (/a|ai|ao|ang/.test(final)) return "shape-open";
  if (/i|e|ie|ian/.test(final)) return "shape-wide";
  return "shape-neutral";
}

export function tonguePositionClass(syllable: LegacySyllable) {
  const initial = normalizedInitial(syllable) || (syllable.pinyin || "").replace(/\d/g, "").match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])/)?.[0] || "";
  if (["d", "t", "n", "l", "z", "c", "s"].includes(initial)) return "tongue-front";
  if (["j", "q", "x", "y"].includes(initial)) return "tongue-palate";
  if (["g", "k", "h"].includes(initial)) return "tongue-back";
  if (["zh", "ch", "sh", "r"].includes(initial)) return "tongue-curled";
  return "tongue-low";
}

export function preciseArticulationUnits(syllable: LegacySyllable) {
  return resolvedArticulationUnits(syllable).filter((item) => articulationImageUnits.has(item.unit));
}

export function missingArticulationImageUnits(syllable: LegacySyllable) {
  return resolvedArticulationUnits(syllable).filter((item) => !articulationImageUnits.has(item.unit));
}

export function articulationImageSources(unit: string, imageType: "mouth" | "tongue") {
  return imageExtensions.map((extension) => `/assets/articulation/${unit}/${imageType}.${extension}`);
}

export function splitArticulationImageSources(unit: string, imageType: "mouth" | "tongue") {
  if (!splitArticulationUnits.has(unit)) return [];
  return [1, 2].map((index) => `/assets/articulation/${unit}/${imageType}-${index}.png`);
}

function normalizePinyinUnit(value?: string) {
  return String(value || "").toLowerCase().replace(/ü/g, "v").replace(/u:/g, "v");
}

function pinyinBodyFor(syllable: LegacySyllable) {
  return normalizePinyinUnit(syllable.pinyin).replace(/\d/g, "");
}

function splitZeroInitialSpelling(pinyinBody: string) {
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

function normalizedFinal(syllable: LegacySyllable) {
  const pinyinBody = pinyinBodyFor(syllable);
  const zeroInitial = splitZeroInitialSpelling(pinyinBody);
  if (zeroInitial) return zeroInitial.final;
  const raw = pinyinBody.replace(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])/, "");
  return normalizePinyinUnit(raw);
}

function normalizedInitial(syllable: LegacySyllable) {
  const pinyinBody = pinyinBodyFor(syllable);
  if (splitZeroInitialSpelling(pinyinBody)) return "";
  return initials.find((item) => pinyinBody.startsWith(item)) || "";
}

function resolveArticulationUnit(value: string) {
  const unit = normalizePinyinUnit(value);
  const candidates = [unit, unit.slice(-3), unit.slice(-2), unit.slice(-1)].filter(Boolean);
  return candidates.find((item) => articulationUnits.has(item)) || "";
}

function resolvedArticulationUnits(syllable: LegacySyllable): ArticulationUnit[] {
  const units: ArticulationUnit[] = [];
  const initial = resolveArticulationUnit(normalizedInitial(syllable));
  const final = resolveArticulationUnit(normalizedFinal(syllable));
  if (initial) units.push({ kind: "Initial", unit: initial });
  if (final && final !== initial) units.push({ kind: "Final", unit: final });
  return units;
}
