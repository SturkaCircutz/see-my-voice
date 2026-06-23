import {
  getCalendarDays,
  createInitialState,
  getStreak,
  getSyllables,
  getProgressData,
  getSelectedTeacherStudent,
  getTeacherDashboardSummary,
  getTeacherStudents,
  reduceState,
  toneDrills,
  tips,
} from "./state.js";

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
const nav = document.querySelector(".app-nav");
const STORAGE_KEY = "see-my-voice-practice-state";

let state = createInitialState();
let recordingTimer = null;
let playbackTimer = null;
let toastTimer = null;
let textInfoTimer = null;
let mediaRecorder = null;
let mediaStream = null;
let recordedChunks = [];
let isComposingText = false;
let cameraStream = null;
let standardUtterance = null;
let lastRecordingObjectUrl = "";
let standardAudio = null;
let pronunciationClipManifest = { clips: { initial: {}, final: {} } };

const ARTICULATION_UNITS = new Set([
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

const INITIALS = ["zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s"];
const IMAGE_EXTENSIONS = ["png", "jpeg", "jpg", "webp"];
const SPLIT_ARTICULATION_UNITS = new Set(["b", "m", "p"]);
const ARTICULATION_IMAGE_UNITS = new Set([
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
  "ie",
  "in",
  "ing",
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
  "ui",
  "un",
  "v",
  "ve",
  "vn",
  "x",
  "z",
  "zh",
]);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function loadStoredState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const stored = JSON.parse(raw);
    state = {
      ...state,
      practiceHistory: Array.isArray(stored.practiceHistory) ? stored.practiceHistory : [],
      selectedToneDrill: stored.selectedToneDrill || state.selectedToneDrill,
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function saveStoredState() {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        practiceHistory: state.practiceHistory || [],
        selectedToneDrill: state.selectedToneDrill,
      }),
    );
  } catch {
    // Storage can fail in private windows; the app still works for the session.
  }
}

function standardPronunciationText() {
  if (state.currentView === "teachingClip" || (state.currentView === "detail" && state.teachingPlan)) {
    const segment = state.teachingPlan?.segments?.[state.selectedClipSegmentIndex];
    return segment?.practiceWords?.[0]
      || state.teachingPlan?.targetSyllable?.character
      || state.teachingPlan?.targetText
      || state.targetText.trim();
  }
  const activeSyllables = getSyllables(state);
  const syllable = activeSyllables[state.selectedSyllable];
  if (state.currentView === "detail" && syllable?.character) return syllable.character;
  return state.targetText.trim();
}

async function loadPronunciationClipManifest() {
  try {
    const response = await fetch("./assets/pronunciation-clips/manifest.json", { cache: "no-store" });
    if (!response.ok) return;
    pronunciationClipManifest = await response.json();
  } catch {
    pronunciationClipManifest = { clips: { initial: {}, final: {} } };
  }
}

function mouthShapeClass(syllable) {
  const final = syllable.pinyin?.replace(/[a-z]*?([aeiouv].*)\d?$/i, "$1") || "";
  if (/u|o|ong|ou/.test(final)) return "shape-round";
  if (/a|ai|ao|ang/.test(final)) return "shape-open";
  if (/i|e|ie|ian/.test(final)) return "shape-wide";
  return "shape-neutral";
}

function normalizePinyinUnit(value) {
  return String(value || "").toLowerCase().replaceAll("ü", "v").replaceAll("u:", "v");
}

function pinyinBodyFor(syllable) {
  return normalizePinyinUnit(syllable.pinyin || syllable.pinyinDisplay || "").replace(/\d/g, "");
}

function splitZeroInitialSpelling(pinyinBody) {
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

function normalizedFinal(syllable) {
  const pinyinBody = pinyinBodyFor(syllable);
  const zeroInitial = splitZeroInitialSpelling(pinyinBody);
  if (zeroInitial) return zeroInitial.final;
  const explicitFinal = normalizePinyinUnit(syllable.final);
  const raw = explicitFinal || pinyinBody.replace(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])/, "");
  return normalizePinyinUnit(raw);
}

function normalizedInitial(syllable) {
  const pinyinBody = pinyinBodyFor(syllable);
  if (splitZeroInitialSpelling(pinyinBody)) return "";
  const explicitInitial = normalizePinyinUnit(syllable.initial);
  return explicitInitial || INITIALS.find((item) => pinyinBody.startsWith(item)) || "";
}

function resolveArticulationUnit(value) {
  const unit = normalizePinyinUnit(value);
  const candidates = [
    unit,
    unit.slice(-3),
    unit.slice(-2),
    unit.slice(-1),
  ].filter(Boolean);
  return candidates.find((item) => ARTICULATION_UNITS.has(item)) || "";
}

function articulationUnits(syllable) {
  const units = [];
  const initial = resolveArticulationUnit(normalizedInitial(syllable));
  const final = resolveArticulationUnit(normalizedFinal(syllable));
  if (initial) units.push({ kind: "声母", unit: initial });
  if (final && final !== initial) units.push({ kind: "韵母", unit: final });
  return units;
}

function articulationUnit(syllable) {
  const final = normalizedFinal(syllable);
  return resolveArticulationUnit(final);
}

function preciseArticulationUnits(syllable) {
  return articulationUnits(syllable).filter((item) => ARTICULATION_IMAGE_UNITS.has(item.unit));
}

function missingArticulationImageUnits(syllable) {
  return articulationUnits(syllable).filter((item) => !ARTICULATION_IMAGE_UNITS.has(item.unit));
}

function hasArticulationReference(syllable) {
  return preciseArticulationUnits(syllable).length > 0;
}

function tonguePositionClass(syllable) {
  const initial =
    syllable.initial ||
    (syllable.pinyin || "").replace(/\d/g, "").match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])/)?.[0] ||
    "";
  if (["d", "t", "n", "l", "z", "c", "s"].includes(initial)) return "tongue-front";
  if (["j", "q", "x", "y"].includes(initial)) return "tongue-palate";
  if (["g", "k", "h"].includes(initial)) return "tongue-back";
  if (["zh", "ch", "sh", "r"].includes(initial)) return "tongue-curled";
  return "tongue-low";
}

function renderArticulationPhoto(item, imageType, syllable) {
  const label = `${item.kind} ${item.unit}`;
  const title = imageType === "mouth" ? "嘴形" : "舌位";
  const className = imageType === "mouth" ? "articulation-photo" : "tongue-photo";
  const fallbackSources = IMAGE_EXTENSIONS.map((ext) => `./assets/articulation/${item.unit}/${imageType}.${ext}`);
  const splitSources = [1, 2].map((index) => `./assets/articulation/${item.unit}/${imageType}-${index}.png`);
  const fallbackScript = `const sources=JSON.parse(this.dataset.sources);const next=Number(this.dataset.next||0);if(next<sources.length){this.dataset.next=String(next+1);this.src=sources[next];}else{this.closest('.articulation-image-shell').hidden=true;}`;
  const renderImage = (src, extraSources = fallbackSources) => `
    <img
      class="${className}"
      src="${src}"
      data-sources='${escapeHtml(JSON.stringify(extraSources))}'
      data-next="0"
      alt="${escapeHtml(syllable.character)} ${escapeHtml(label)} 的${title}参考图"
      onerror="${fallbackScript}"
    >
  `;
  const imageContent = SPLIT_ARTICULATION_UNITS.has(item.unit)
    ? `
        <div class="articulation-split-pair">
          <div class="articulation-image-shell">${renderImage(splitSources[0], fallbackSources)}</div>
          <div class="articulation-image-shell">${renderImage(splitSources[1], [])}</div>
        </div>
      `
    : `
        <div class="articulation-image-shell">${renderImage(fallbackSources[0], fallbackSources.slice(1))}</div>
      `;
  return `
    <figure class="articulation-photo-card">
      <div class="articulation-photo-frame">
        ${imageContent}
      </div>
      <figcaption>
        <strong>${escapeHtml(item.unit)}</strong>
        <span>${escapeHtml(item.kind)} · ${title}</span>
      </figcaption>
    </figure>
  `;
}

function renderGeneratedMouth(syllable) {
  const units = preciseArticulationUnits(syllable);
  if (units.length) {
    return `
      <div class="articulation-unit-grid">
        ${units.map((item) => renderArticulationPhoto(item, "mouth", syllable)).join("")}
      </div>
    `;
  }

  return `
    <div class="mouth-animation ${mouthShapeClass(syllable)}">
      <div class="face-outline">
        <span class="eye left"></span>
        <span class="eye right"></span>
        <span class="nose"></span>
        <span class="lip upper"></span>
        <span class="mouth-hole"></span>
        <span class="lip lower"></span>
      </div>
      <span class="mouth-target">
        <strong>${escapeHtml(syllable.character)}</strong>
        <span>${escapeHtml(syllable.pinyinDisplay || syllable.pinyin)}</span>
      </span>
    </div>
  `;
}

function renderGeneratedTongue(syllable) {
  const units = preciseArticulationUnits(syllable);
  if (units.length) {
    return `
      <div class="tongue-unit-grid">
        ${units.map((item) => renderArticulationPhoto(item, "tongue", syllable)).join("")}
      </div>
    `;
  }

  return `
    <div class="tongue-diagram ${tonguePositionClass(syllable)}">
      <span class="palate-line"></span>
      <span class="upper-teeth"></span>
      <span class="lower-jaw"></span>
      <span class="tongue-shape"></span>
      <span class="tongue-dot"></span>
    </div>
  `;
}

const scoreItems = () => [
  { name: "综合", value: state.score },
  { name: "声调", value: state.pitchScore },
  { name: "清晰度", value: state.clarityScore },
  { name: "节奏", value: state.rhythmScore },
];

function renderPinyinDiagnosis() {
  const diagnosis = state.pinyinDiagnosis;
  if (!diagnosis) {
    return `
      <section class="panel diagnosis-card" aria-label="拼音诊断">
        <span class="model-kicker">拼音诊断</span>
        <strong>录音后显示可能不准的音</strong>
        <p>系统会根据你的录音给出发音反馈，指出可能影响别人听懂的声母、韵母或声调。</p>
      </section>
    `;
  }

  const issues = diagnosis.issues || [];
  return `
    <section class="panel diagnosis-card" aria-label="拼音诊断">
      <span class="model-kicker">拼音诊断</span>
      <strong>${escapeHtml(diagnosis.summary)}</strong>
      <p>目标：${escapeHtml((diagnosis.target_pinyin || []).join(" "))}</p>
      <p>系统听到：${escapeHtml((diagnosis.heard_pinyin || []).join(" ") || "未稳定听清")}</p>
      ${
        issues.length
          ? `<button class="teaching-clip-entry" type="button" data-action="generate-teaching-clip">
              生成本次个性化教学短片
            </button>
            <div class="drill-list">
              ${issues
                .map(
                  (issue) => `
                    <div class="drill-card">
                      <span class="status-pill">${escapeHtml(issue.focus)}</span>
                      <strong>${escapeHtml(issue.title)}</strong>
                      <p>${escapeHtml(issue.summary)}</p>
                      <p class="drill-detail">${escapeHtml(issue.detail)}</p>
                      ${
                        issue.practice?.length
                          ? `<div class="drill-words">${issue.practice
                              .map((word) => `<button type="button" data-set-text="${escapeHtml(word)}">${escapeHtml(word)}</button>`)
                              .join("")}</div>`
                          : ""
                      }
                    </div>
                  `,
                )
                .join("")}
            </div>`
          : ""
      }
    </section>
  `;
}

function brandHeader({ progress = false } = {}) {
  const streak = getStreak(state);
  return `
    <header class="app-header ${progress ? "progress-header" : ""}">
      <div class="status-row">
        <span>9:41</span>
        <span>中文发音训练</span>
      </div>
      <div class="brand-row">
        <h1 class="brand"><span class="brand-accent">绘声</span> · ${progress ? "我的进步" : "See My Voice"}</h1>
        ${
          progress
            ? `<button class="period-button" type="button" data-action="toggle-period">${getProgressData(state).label}</button>`
            : `<button class="header-link" type="button" data-view="progress">连续 ${streak} 天 · 进度</button>`
        }
      </div>
    </header>
  `;
}

function renderPractice() {
  const activeSyllables = getSyllables(state);
  const recordCopy = {
    idle: "开始录音",
    recording: "正在录音… 点击完成",
    complete: state.modelStatus === "analyzing" ? "正在分析…" : "分析完成 · 再练一次",
  }[state.recordingState];

  const statusCopy = {
    idle: "等待录音",
    recording: "正在录音",
    analyzing: "正在分析发音",
    complete: "分析完成",
    error: "需要重试",
  }[state.modelStatus];

  return `
    <section class="screen" data-screen="practice">
      ${brandHeader()}
      <div class="content">
        ${
          state.practiceBackView === "toneDrill"
            ? `<button class="practice-back-button" type="button" data-view="toneDrill">返回专项题库</button>`
            : ""
        }
        <section class="sentence-card" aria-labelledby="sentence-title">
          <label class="eyebrow" for="target-text">自定义练习</label>
          <input class="sentence-input" id="target-text" data-field="target-text" value="${escapeHtml(state.targetText)}" autocomplete="off" inputmode="text">
          <p class="pinyin">${state.pinyinText}</p>
        </section>

        <section class="model-card level-${state.modelStatus === "error" ? "focus" : "good"}" aria-label="发音反馈状态">
          <div>
            <span class="model-kicker">发音反馈</span>
            <strong>${statusCopy}</strong>
            <span>系统听到：${state.asrHeard}</span>
          </div>
          <span class="status-pill">${state.modelStatus === "complete" ? "已完成" : "准备中"}</span>
        </section>
        <p class="model-summary ${state.recordingError ? "is-error" : ""}">${state.recordingError || state.modelSummary}</p>

        <div class="record-row" aria-label="练习操作">
          <button class="record-button" type="button" data-action="record" data-state="${state.recordingState}" ${state.modelStatus === "analyzing" ? "disabled" : ""}>
            <span class="record-state-dot"></span>${recordCopy}
          </button>
          <button class="square-button ${state.playing ? "is-active" : ""}" type="button" data-action="play">
            ${state.playing ? "播放中" : "播放"}
          </button>
          <button class="square-button" type="button" data-action="play-self" ${state.lastRecordingUrl ? "" : "disabled"}>
            回听
          </button>
          <button class="square-button" type="button" data-action="reset">重来</button>
        </div>

        <section aria-label="发音评分">
          <div class="score-grid">
            ${scoreItems()
              .map(
                (item) => `
                  <div class="score-cell">
                    <strong class="score-value">${item.value}</strong>
                    <span class="score-name">${item.name}</span>
                  </div>
                `,
              )
              .join("")}
          </div>
        </section>

        ${renderPinyinDiagnosis()}

        <section aria-labelledby="feedback-title">
          <p class="section-label" id="feedback-title">音节反馈</p>
          <div class="syllable-list">
            ${Object.values(activeSyllables)
              .map(
                (item) => `
                  <button class="syllable-card level-${item.level}" type="button" data-syllable="${item.id}">
                    <span>
                      <strong class="syllable-character">${item.character}</strong>
                      <span class="syllable-meta">${item.pinyinDisplay || item.pinyin} · ${item.tone} · ${item.score}分</span>
                      <span class="syllable-feedback">${item.feedback}</span>
                    </span>
                    <span class="status-pill">${item.status}</span>
                  </button>
                `,
              )
              .join("")}
          </div>
        </section>

        <button class="hint-card" type="button" data-syllable="fan">
          点击音节卡片查看嘴型示范、舌位提示、声调曲线和详细练习建议。
        </button>
      </div>
    </section>
  `;
}

function detailHeader(syllable) {
  return `
    <header class="app-header detail-header">
      <div class="status-row">
        <span>9:41</span>
        <span>音节详情</span>
      </div>
      <div class="detail-title-row">
        <div>
          <button class="back-button" type="button" data-view="practice">返回练习</button>
          <h1 class="detail-heading">详细练习</h1>
          <p class="detail-subtitle">${syllable.pinyinDisplay || syllable.pinyin} · ${syllable.tone} · 当前 ${syllable.score} 分</p>
        </div>
        <div class="detail-character" aria-hidden="true">${syllable.character}</div>
      </div>
    </header>
  `;
}

function renderDetail() {
  const activeSyllables = getSyllables(state);
  const activeTeachingSegment = state.teachingPlan?.segments?.[state.selectedClipSegmentIndex];
  const segmentSyllable = activeTeachingSegment?.syllableId
    ? activeSyllables[activeTeachingSegment.syllableId]
    : activeTeachingSegment?.syllable;
  const syllable = segmentSyllable ?? activeSyllables[state.selectedSyllable] ?? Object.values(activeSyllables)[0];
  const hasReference = hasArticulationReference(syllable);
  const missingImageUnits = missingArticulationImageUnits(syllable);
  return `
    <section class="screen" data-screen="detail">
      ${detailHeader(syllable)}
      <div class="content">
        ${renderTeachingVideoPanel()}
        <section aria-labelledby="mouth-title">
          <p class="section-label" id="mouth-title">嘴型与舌位对照</p>
          <div class="panel mouth-grid">
            <div class="mouth-panel">
              <p class="panel-title">${hasReference ? "参考嘴型图" : "自动嘴型示意"}</p>
              <div class="mouth-reference">
                ${renderGeneratedMouth(syllable)}
              </div>
              <p class="mouth-cue-line">${escapeHtml(syllable.mouthCue)}</p>
            </div>
            <div class="mouth-panel">
              <p class="panel-title">我的镜像</p>
              <div class="mirror-area" id="mirror-area">
                <span><strong>正在等待摄像头</strong>允许摄像头后，对照左侧嘴型观察唇齿位置</span>
              </div>
            </div>
          </div>
          <div class="panel tongue-reference">
            <div>
              <p class="panel-title">${hasReference ? "参考舌位图" : "自动舌位示意"}</p>
              <p class="mouth-cue-line">${escapeHtml(syllable.tongueCue)}</p>
            </div>
            ${renderGeneratedTongue(syllable)}
          </div>
          <p class="model-summary">系统会把一个拼音拆成声母和韵母分别展示。请先看声母的嘴形和舌位，再看韵母的嘴形和舌位；摄像头适合观察嘴唇和下巴，舌头位置以参考图和文字提示为主。</p>
          ${
            missingImageUnits.length
              ? `<p class="model-summary">当前 ${missingImageUnits.map((item) => `${item.kind} ${item.unit}`).join("、")} 暂无精确嘴型/舌位图，已避免显示不匹配图片；请以上方教学视频和文字提示为准。</p>`
              : ""
          }
        </section>

        <section class="panel chart-card" aria-labelledby="tone-title">
          <div class="chart-title">
            <h2 id="tone-title">声调对比 · 第${syllable.tone.replace("T", "")}声</h2>
            <div class="chart-legend" aria-hidden="true">
              <span class="legend-key">目标</span>
              <span class="legend-key current">你的</span>
            </div>
          </div>
          <canvas id="tone-chart" width="640" height="248" aria-label="目标声调与当前声调趋势对比图"></canvas>
          <p class="plot-note">${escapeHtml(syllable.toneCue)}</p>
        </section>

        <section class="panel analysis-card" aria-label="本音节分析结论">
          <strong>本音节结论</strong>
          <span>${escapeHtml(syllable.feedback)}</span>
          ${
            syllable.issue
              ? `<span class="analysis-extra">${escapeHtml(syllable.issue.detail)}</span>`
              : ""
          }
        </section>

        <section aria-labelledby="tips-title">
          <p class="section-label" id="tips-title">发音建议</p>
          <div class="tip-list">
            ${tips
              .map(
                (tip, index) => `
                  <button class="tip-card ${state.selectedTip === tip.id ? "is-selected" : ""}" type="button" data-tip="${tip.id}">
                    <span class="tip-number">${index + 1}</span>
                    <span>
                      <strong class="tip-title">${tip.title}</strong>
                      <span class="tip-copy">${syllable[tip.descriptionKey]}</span>
                    </span>
                  </button>
                `,
              )
              .join("")}
          </div>
        </section>

        <button class="replay-button ${state.playing ? "is-active" : ""}" type="button" data-action="play-detail">
          ${state.playing ? "正在重听示范…" : "重听标准发音"}
        </button>
      </div>
    </section>
  `;
}

function renderProgress() {
  const progress = getProgressData(state);
  const calendarDays = getCalendarDays(state);
  return `
    <section class="screen" data-screen="progress">
      ${brandHeader({ progress: true })}
      <div class="content">
        <section aria-labelledby="trend-title">
          <p class="section-label" id="trend-title">综合评分趋势</p>
          <div class="panel chart-card trend-wrap">
            <canvas id="progress-chart" width="640" height="248" aria-label="${progress.label}综合评分折线图"></canvas>
          </div>
        </section>

        <section aria-labelledby="calendar-title">
          <p class="section-label" id="calendar-title">打卡日历</p>
          <div class="panel calendar-grid">
            ${calendarDays
              .map(
                (day) => `
                  <span class="calendar-day ${day.practiced ? "is-done" : ""} ${day.today ? "is-today" : ""}">
                    <strong>${day.label}</strong>
                    <span>${day.practiced ? "已练" : "未练"}</span>
                  </span>
                `,
              )
              .join("")}
          </div>
        </section>

        <section aria-labelledby="words-title">
          <p class="section-label" id="words-title">${progress.label}练习词汇</p>
          <div class="word-list">
            ${progress.words
              .map(
                (item) => `
                  <button class="word-row level-${item.level}" type="button" data-word="${item.word}" data-score="${item.score}" data-status="${item.status}">
                    <span class="word-top">
                      <strong class="word-name">${item.word}</strong>
                      <span class="word-status">${item.score}分 · ${item.status}</span>
                    </span>
                    <span class="progress-track" aria-hidden="true">
                      <span class="progress-fill" style="width:${item.score}%"></span>
                    </span>
                  </button>
                `,
              )
              .join("")}
          </div>
        </section>

        <section aria-labelledby="tones-title">
          <p class="section-label" id="tones-title">声调专项</p>
          <div class="panel tone-list">
            ${progress.tones
              .map(
                (item) => `
                  <button class="tone-card ${item.level}" type="button" data-tone-drill="${item.tone}">
                    <div class="tone-top">
                      <span class="tone-label">${item.label}</span>
                      <span class="tone-score">${item.score} 分</span>
                    </div>
                    <div class="progress-track" aria-hidden="true">
                      <div class="progress-fill" style="width:${item.score}%"></div>
                    </div>
                  </button>
                `,
              )
              .join("")}
          </div>
        </section>

        <button class="replay-button" type="button" data-view="practice">返回今日练习</button>
      </div>
    </section>
  `;
}

function renderTeacherDashboard() {
  const summary = getTeacherDashboardSummary(state);
  const students = getTeacherStudents(state);
  const selectedStudent = getSelectedTeacherStudent(state);
  return `
    <section class="screen teacher-screen" data-screen="teacher">
      <header class="app-header teacher-header">
        <div class="status-row">
          <span>9:41</span>
          <span>康复训练管理后台</span>
        </div>
        <div class="brand-row">
          <div>
            <h1 class="brand"><span class="brand-accent">绘声</span> 教师端</h1>
            <p class="teacher-subtitle">${escapeHtml(state.teacherDashboard.teacherName)} · ${escapeHtml(state.teacherDashboard.className)}</p>
          </div>
          <button class="header-link" type="button" data-view="practice">学生端</button>
        </div>
      </header>
      <div class="content teacher-content">
        <section aria-labelledby="teacher-today-title">
          <p class="section-label" id="teacher-today-title">今日待处理</p>
          <div class="teacher-metric-grid">
            <div class="teacher-metric-card">
              <strong>${summary.studentCount}</strong>
              <span>学生档案</span>
            </div>
            <div class="teacher-metric-card is-warm">
              <strong>${summary.pendingSubmissions}</strong>
              <span>未批改录音</span>
            </div>
            <div class="teacher-metric-card ${summary.overdueTasks ? "is-alert" : ""}">
              <strong>${summary.overdueTasks}</strong>
              <span>逾期任务</span>
            </div>
            <div class="teacher-metric-card ${summary.needsAttention ? "is-alert" : ""}">
              <strong>${summary.needsAttention}</strong>
              <span>需要关注</span>
            </div>
          </div>
        </section>

        <section aria-labelledby="teacher-students-title">
          <p class="section-label" id="teacher-students-title">学生列表</p>
          <div class="teacher-student-list">
            ${students
              .map(
                (student) => `
                  <button class="teacher-student-card ${student.id === selectedStudent?.id ? "is-selected" : ""}" type="button" data-teacher-student="${escapeHtml(student.id)}">
                    <span>
                      <strong>${escapeHtml(student.name)}</strong>
                      <span>${escapeHtml(student.stage)} · 本周 ${student.weeklyPracticeCount} 次</span>
                    </span>
                    <span class="status-pill">${student.latestScore} 分</span>
                  </button>
                `,
              )
              .join("")}
          </div>
        </section>

        ${
          selectedStudent
            ? `
              <section class="panel teacher-profile-card" aria-labelledby="teacher-profile-title">
                <span class="model-kicker">学生发音档案</span>
                <h2 id="teacher-profile-title">${escapeHtml(selectedStudent.name)} · ${selectedStudent.age} 岁</h2>
                <p>${escapeHtml(selectedStudent.hearingProfile)}</p>
                <dl class="teacher-profile-list">
                  <div>
                    <dt>康复目标</dt>
                    <dd>${escapeHtml(selectedStudent.rehabGoal)}</dd>
                  </div>
                  <div>
                    <dt>最近练习</dt>
                    <dd>${escapeHtml(selectedStudent.lastPracticeAt)} · ${selectedStudent.weeklyPracticeCount} 次/周</dd>
                  </div>
                  <div>
                    <dt>测评结论</dt>
                    <dd>${escapeHtml(selectedStudent.assessmentSummary)}</dd>
                  </div>
                </dl>
                <div class="teacher-tag-list">
                  ${selectedStudent.focusTags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
                </div>
              </section>

              <section class="panel teacher-next-card" aria-label="AI 辅助建议">
                <span class="model-kicker">AI 辅助建议</span>
                <strong>先生成任务包，再由老师确认发布</strong>
                <p>建议围绕“${escapeHtml(selectedStudent.focusTags[0])}”安排 5 分钟跟读任务，并保留教师复评入口。</p>
                <button class="teacher-primary-button" type="button" data-action="teacher-task-placeholder">生成任务包</button>
              </section>
            `
            : ""
        }
      </div>
    </section>
  `;
}

function renderToneDrill() {
  const drill = toneDrills[state.selectedToneDrill] || toneDrills["3"];
  return `
    <section class="screen" data-screen="tone-drill">
      <header class="app-header tone-drill-header">
        <div class="status-row">
          <span>9:41</span>
          <span>声调专项</span>
        </div>
        <div class="tone-drill-title-row">
          <div>
            <button class="tone-back-icon" type="button" data-view="progress" aria-label="返回进度页">
              <span aria-hidden="true">‹</span>
              <span>进度</span>
            </button>
            <h1 class="tone-drill-heading">${escapeHtml(drill.label)}</h1>
            <p class="tone-drill-subtitle">${escapeHtml(drill.description)}</p>
          </div>
          <div class="tone-number" aria-hidden="true">${escapeHtml(state.selectedToneDrill)}</div>
        </div>
      </header>
      <div class="content">
        <section class="panel tone-drill-intro">
          <span class="model-kicker">自动题库</span>
          <strong>选择一个字开始专项练习</strong>
          <p>这些字都属于同一个声调。点击后会自动切换到练习页，你可以听标准音、录音、看声调趋势。</p>
        </section>
        <div class="tone-drill-grid">
          ${drill.words
            .map(
              (word) => `
                <button class="tone-drill-word" type="button" data-set-text="${escapeHtml(word)}">
                  ${escapeHtml(word)}
                </button>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderClipSegmentContent(segment, plan) {
  const syllable = plan.targetSyllable || Object.values(getSyllables(state))[0];
  if (segment.type === "syllable-video") {
    const clips = segment.videoClips || [];
    return `
      <div class="clip-syllable-videos">
        ${
          clips.length
            ? clips.map((clip) => `
                <div class="clip-syllable-video">
                  <p class="panel-title">${escapeHtml(clip.title || clip.videoTitle || "发音示范")}</p>
                  ${
                    clip.videoUrl
                      ? `
                        <div class="clip-video-shell">
                          <video class="clip-video" controls playsinline ${clip.posterUrl ? `poster="${escapeHtml(clip.posterUrl)}"` : ""}>
                            <source src="${escapeHtml(clip.videoUrl)}" type="video/mp4">
                          </video>
                        </div>
                      `
                      : `<p class="clip-asset-note">这个发音暂时没有切好的视频素材。</p>`
                  }
                  <p class="clip-asset-note">${escapeHtml(clip.guidanceText || clip.videoTitle || "")}</p>
                </div>
              `).join("")
            : `<p class="clip-asset-note">这个音节暂时没有匹配到可用视频素材。</p>`
        }
      </div>
      ${
        segment.standardAudioUrl || plan.standardAudioUrl
          ? `<button class="replay-button" type="button" data-action="clip-replay-standard">播放整句标准发音</button>`
          : ""
      }
    `;
  }
  if (segment.type === "video-articulation") {
    return `
      <div class="clip-video-shell">
        <video class="clip-video" controls playsinline ${segment.posterUrl ? `poster="${escapeHtml(segment.posterUrl)}"` : ""}>
          <source src="${escapeHtml(segment.videoUrl)}" type="video/mp4">
        </video>
      </div>
      <p class="clip-asset-note">${escapeHtml(segment.videoTitle || `${segment.unit} 发音片段`)}</p>
    `;
  }
  if (segment.type === "articulation") {
    return `
      <div class="clip-articulation-grid">
        <div class="clip-articulation-panel">
          <p class="panel-title">口型参考</p>
          ${renderGeneratedMouth(syllable)}
        </div>
        <div class="clip-articulation-panel">
          <p class="panel-title">舌位参考</p>
          ${renderGeneratedTongue(syllable)}
        </div>
      </div>
      <p class="clip-asset-note">这个音暂时没有切好的视频片段，先使用口型和舌位参考图练习。</p>
    `;
  }
  if (segment.type === "tone") {
    return `
      <div class="panel chart-card clip-tone-card">
        <div class="chart-title">
          <h2>声调趋势</h2>
          <div class="chart-legend" aria-hidden="true">
            <span class="legend-key">目标</span>
            <span class="legend-key current">你的</span>
          </div>
        </div>
        <canvas id="clip-tone-chart" width="640" height="248" aria-label="教学短片声调趋势图"></canvas>
      </div>
    `;
  }
  if (segment.type === "practice") {
    return `
      <div class="clip-practice-words">
        ${(segment.practiceWords || [])
          .map((word) => `<button type="button" data-set-text="${escapeHtml(word)}">${escapeHtml(word)}</button>`)
          .join("")}
      </div>
      <button class="replay-button" type="button" data-action="clip-replay-standard">播放标准发音</button>
    `;
  }
  return `
    <div class="clip-focus-character" aria-hidden="true">
      ${escapeHtml(plan.targetSyllable?.character || plan.focusIssue?.focus || "练")}
    </div>
  `;
}

function renderTeachingVideoPanel() {
  const plan = state.teachingPlan;
  if (!plan) {
    return `
      <section class="panel clip-summary" aria-label="教学视频">
        <span class="model-kicker">教学视频</span>
        <strong>录音后自动生成</strong>
        <p>完成一次录音分析后，这里会显示本次的个性化教学视频。</p>
      </section>
    `;
  }

  const segments = plan.segments || [];
  const index = Math.min(state.selectedClipSegmentIndex, Math.max(segments.length - 1, 0));
  const segment = segments[index] || segments[0];
  const progress = segments.length ? `${index + 1} / ${segments.length}` : "0 / 0";
  const showSegmentNavigation = segments.length > 1;
  return `
    <section class="panel clip-player detail-teaching-video" aria-labelledby="detail-teaching-video-title">
      <span class="model-kicker">教学视频</span>
      <h2 id="detail-teaching-video-title">教学视频</h2>
      <p class="detail-subtitle">${escapeHtml(plan.title || "本次个性化教学视频")}</p>
      ${
        showSegmentNavigation
          ? `
            <div class="clip-progress-row">
              <span>${progress}</span>
              <span>${state.clipPlaying ? "自动播放中" : "已暂停"}</span>
            </div>
            <div class="clip-progress-track" aria-hidden="true">
              <span style="width:${segments.length ? ((index + 1) / segments.length) * 100 : 0}%"></span>
            </div>
          `
          : ""
      }
      <h3>${escapeHtml(segment.title)}</h3>
      <p>${escapeHtml(segment.guidanceText)}</p>
      ${renderClipSegmentContent(segment, plan)}
      <div class="clip-controls" aria-label="教学视频控制">
        ${showSegmentNavigation ? `<button type="button" data-action="clip-prev" ${index <= 0 ? "disabled" : ""}>上一段</button>` : ""}
        <button type="button" data-action="${state.clipPlaying ? "clip-pause" : "clip-play"}">
          ${state.clipPlaying ? "暂停" : "播放"}
        </button>
        ${showSegmentNavigation ? `<button type="button" data-action="clip-next" ${index >= segments.length - 1 ? "disabled" : ""}>下一段</button>` : ""}
      </div>
    </section>
  `;
}

function renderTeachingClip() {
  const plan = state.teachingPlan;
  if (!plan) {
    return `
      <section class="screen" data-screen="teaching-clip">
        <header class="app-header detail-header">
          <div class="status-row">
            <span>9:41</span>
            <span>教学短片</span>
          </div>
          <div class="detail-title-row">
            <div>
              <button class="back-button" type="button" data-view="practice">返回练习</button>
              <h1 class="detail-heading">还没有教学短片</h1>
              <p class="detail-subtitle">完成一次分析后再生成。</p>
            </div>
          </div>
        </header>
      </section>
    `;
  }

  const segments = plan.segments || [];
  const index = Math.min(state.selectedClipSegmentIndex, Math.max(segments.length - 1, 0));
  const segment = segments[index] || segments[0];
  const progress = segments.length ? `${index + 1} / ${segments.length}` : "0 / 0";
  return `
    <section class="screen" data-screen="teaching-clip">
      <header class="app-header clip-header">
        <div class="status-row">
          <span>9:41</span>
          <span>个性化教学短片</span>
        </div>
        <div class="detail-title-row">
          <div>
            <button class="back-button" type="button" data-view="practice">返回练习</button>
            <h1 class="detail-heading">${escapeHtml(plan.title)}</h1>
            <p class="detail-subtitle">目标句：${escapeHtml(plan.targetText || state.targetText)}</p>
          </div>
          <div class="detail-character" aria-hidden="true">${escapeHtml(plan.targetSyllable?.character || "练")}</div>
        </div>
      </header>
      <div class="content">
        <section class="panel clip-summary">
          <span class="model-kicker">本次重点</span>
          <strong>${escapeHtml(plan.focusIssue?.title || plan.focusIssue?.focus || "发音练习")}</strong>
          <p>${escapeHtml(plan.focusIssue?.summary || "系统会根据你的分析结果安排练习。")}</p>
        </section>

        <section class="panel clip-player" aria-labelledby="clip-segment-title">
          <div class="clip-progress-row">
            <span>${progress}</span>
            <span>${state.clipPlaying ? "自动播放中" : "已暂停"}</span>
          </div>
          <div class="clip-progress-track" aria-hidden="true">
            <span style="width:${segments.length ? ((index + 1) / segments.length) * 100 : 0}%"></span>
          </div>
          <h2 id="clip-segment-title">${escapeHtml(segment.title)}</h2>
          <p>${escapeHtml(segment.guidanceText)}</p>
          ${renderClipSegmentContent(segment, plan)}
        </section>

        <div class="clip-controls" aria-label="教学短片控制">
          <button type="button" data-action="clip-prev" ${index <= 0 ? "disabled" : ""}>上一段</button>
          <button type="button" data-action="${state.clipPlaying ? "clip-pause" : "clip-play"}">
            ${state.clipPlaying ? "暂停" : "播放"}
          </button>
          <button type="button" data-action="clip-next" ${index >= segments.length - 1 ? "disabled" : ""}>下一段</button>
        </div>
      </div>
    </section>
  `;
}

function render() {
  saveStoredState();
  const views = {
    practice: renderPractice,
    detail: renderDetail,
    progress: renderProgress,
    teacher: renderTeacherDashboard,
    toneDrill: renderToneDrill,
    teachingClip: renderTeachingClip,
  };

  app.innerHTML = (views[state.currentView] || renderPractice)();
  nav.querySelectorAll("[data-view]").forEach((button) => {
    const active = button.dataset.view === state.currentView;
    button.setAttribute("aria-current", active ? "page" : "false");
  });

  requestAnimationFrame(() => {
    if (state.currentView === "detail") {
      drawToneChart();
      startCameraPreview();
    } else {
      stopCameraPreview();
    }
    if (state.currentView === "progress") drawProgressChart();
    if (state.currentView === "teachingClip" || (state.currentView === "detail" && state.teachingPlan)) {
      drawClipToneChart();
      if (state.clipPlaying) {
        const playResult = document.querySelector(".clip-video")?.play?.();
        playResult?.catch?.(() => {});
      }
    }
  });
}

function syncSentenceInput() {
  const input = document.querySelector("#target-text");
  if (input instanceof HTMLInputElement && input.value !== state.targetText) {
    input.value = state.targetText;
  }
}

function drawLineChart(canvas, series, options = {}) {
  if (!canvas?.getContext) return;
  const context = canvas.getContext("2d");
  if (!context) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 320;
  const height = canvas.clientHeight || 124;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  context.scale(dpr, dpr);
  context.clearRect(0, 0, width, height);

  const padding = { top: 15, right: 13, bottom: 25, left: 13 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  context.lineWidth = 1;
  context.strokeStyle = "#ece8e0";
  for (let row = 0; row < 3; row += 1) {
    const y = padding.top + (innerHeight * row) / 2;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
  }

  series.forEach((item) => {
    context.beginPath();
    context.lineWidth = item.width ?? 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = item.color;
    item.values.forEach((value, index) => {
      const x =
        padding.left +
        (innerWidth * index) / Math.max(item.values.length - 1, 1);
      const y = padding.top + (innerHeight * value) / 100;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();

    if (item.points) {
      item.values.forEach((value, index) => {
        const x =
          padding.left +
          (innerWidth * index) / Math.max(item.values.length - 1, 1);
        const y = padding.top + (innerHeight * value) / 100;
        context.beginPath();
        context.fillStyle = item.color;
        context.arc(x, y, index === item.values.length - 1 ? 4 : 3, 0, Math.PI * 2);
        context.fill();
      });
    }
  });

  if (options.labels) {
    context.fillStyle = "#aaa6ad";
    context.font = "10px -apple-system, sans-serif";
    context.textAlign = "center";
    options.labels.forEach((label, index) => {
      const x =
        padding.left +
        (innerWidth * index) / Math.max(options.labels.length - 1, 1);
      context.fillText(label, x, height - 6);
    });
  }

  if (options.finalLabel) {
    context.fillStyle = options.finalLabel.color;
    context.font = "700 11px -apple-system, sans-serif";
    context.textAlign = "right";
    context.fillText(options.finalLabel.text, width - padding.right, 11);
  }
}

function drawToneChart() {
  const activeSyllables = getSyllables(state);
  const syllable = activeSyllables[state.selectedSyllable] ?? Object.values(activeSyllables)[0];
  drawLineChart(document.querySelector("#tone-chart"), [
    { values: syllable.targetTone, color: "#209a78", width: 3 },
    { values: syllable.currentTone, color: "#cf4b31", width: 3 },
  ]);
}

function drawClipToneChart() {
  const segment = state.teachingPlan?.segments?.[state.selectedClipSegmentIndex];
  if (segment?.type !== "tone") return;
  drawLineChart(document.querySelector("#clip-tone-chart"), [
    { values: segment.targetTone || [50, 50, 50, 50, 50, 50], color: "#209a78", width: 3 },
    { values: segment.currentTone || [50, 50, 50, 50, 50, 50], color: "#cf4b31", width: 3 },
  ]);
}

function drawProgressChart() {
  const progress = getProgressData(state);
  const min = 50;
  const max = 90;
  const normalized = progress.scores.map(
    (score) => (score > 0 ? 100 - ((score - min) / (max - min)) * 100 : 100),
  );
  const latestScore = [...progress.scores].reverse().find((score) => score > 0) || 0;
  drawLineChart(
    document.querySelector("#progress-chart"),
    [{ values: normalized, color: "#cf4b31", width: 3, points: true }],
    {
      labels: progress.labels,
      finalLabel: {
        text: latestScore ? `${latestScore} 分` : "未练",
        color: "#cf4b31",
      },
    },
  );
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1800);
}

function clearTimers() {
  window.clearTimeout(recordingTimer);
  window.clearTimeout(playbackTimer);
  window.clearTimeout(textInfoTimer);
  recordingTimer = null;
  playbackTimer = null;
  textInfoTimer = null;
}

function scheduleClipAdvance() {
  window.clearTimeout(playbackTimer);
  if (!state.clipPlaying || !["teachingClip", "detail"].includes(state.currentView)) return;
  const count = state.teachingPlan?.segments?.length || 0;
  if (count <= 1) return;
  if (!count || state.selectedClipSegmentIndex >= count - 1) {
    state = reduceState(state, { type: "SET_CLIP_PLAYING", playing: false });
    render();
    return;
  }
  playbackTimer = window.setTimeout(() => {
    state = reduceState(state, { type: "NEXT_CLIP_SEGMENT" });
    render();
    scheduleClipAdvance();
  }, 5200);
}

async function startCameraPreview() {
  const mirror = document.querySelector("#mirror-area");
  if (!mirror) return;

  let video = mirror.querySelector("video");
  if (!video) {
    mirror.innerHTML = `<video autoplay muted playsinline aria-label="我的实时镜像"></video>`;
    video = mirror.querySelector("video");
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    mirror.innerHTML = `<span><strong>无法打开摄像头</strong>当前浏览器不支持摄像头预览。</span>`;
    return;
  }

  try {
    if (!cameraStream) {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
    }
    video.srcObject = cameraStream;
  } catch {
    mirror.innerHTML = `<span><strong>摄像头未开启</strong>请允许浏览器使用摄像头后再进入嘴型对照。</span>`;
  }
}

function stopCameraPreview() {
  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = null;
}

async function refreshTextInfo(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const response = await fetch(`/api/text-info?text=${encodeURIComponent(trimmed)}`);
  if (!response.ok) return;
  const info = await response.json();
  if (state.targetText.trim() !== trimmed) return;
  state = reduceState(state, { type: "APPLY_TEXT_INFO", info });
  render();
}

function scheduleTextInfo(text) {
  window.clearTimeout(textInfoTimer);
  textInfoTimer = window.setTimeout(() => {
    refreshTextInfo(text).catch(() => {
      // Keep typing smooth even if the backend is not ready yet.
    });
  }, 220);
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("当前浏览器不支持麦克风录音，请使用 Chrome、Edge 或 Safari 新版本。 ");
  }
  recordedChunks = [];
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(mediaStream);
  mediaRecorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) recordedChunks.push(event.data);
  });
  mediaRecorder.start();
}

function stopTracks() {
  mediaStream?.getTracks().forEach((track) => track.stop());
  mediaStream = null;
}

async function stopRecordingAndAnalyze() {
  if (!mediaRecorder || mediaRecorder.state === "inactive") return;
  const blob = await new Promise((resolve) => {
    mediaRecorder.addEventListener(
      "stop",
      () => resolve(new Blob(recordedChunks, { type: mediaRecorder.mimeType || "audio/webm" })),
      { once: true },
    );
    mediaRecorder.stop();
  });
  stopTracks();
  if (lastRecordingObjectUrl) URL.revokeObjectURL(lastRecordingObjectUrl);
  lastRecordingObjectUrl = URL.createObjectURL(blob);
  await analyzeRecording(blob);
}

async function analyzeRecording(blob) {
  const form = new FormData();
  form.append("text", state.targetText.trim());
  form.append("audio", blob, "practice.webm");
  state = reduceState(state, { type: "ANALYZE_START" });
  render();

  const response = await fetch("/api/analyze", { method: "POST", body: form });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "分析失败，请确认后端已经启动。 ");
  }
  state = reduceState(state, {
    type: "APPLY_ANALYSIS",
    result: payload,
    recordingUrl: lastRecordingObjectUrl,
    clipManifest: pronunciationClipManifest,
  });
  render();
  showToast("分析完成，结果已更新。 ");
}

function demoTeachingClipResult() {
  return {
    target_text: "光",
    pinyin_display: ["guang1"],
    communication_result: {
      readiness_score: 62,
      main_feedback: "系统发现这次最值得先练的是韵母 uang 的口型过渡。",
    },
    asr: {
      heard_text: "刚",
      text_similarity: 60,
    },
    pinyin_diagnosis: {
      method: "demo",
      issues: [
        {
          index: 0,
          type: "final",
          title: "韵母 uang 需要更完整",
          summary: "目标韵母是 uang，圆唇到开口再收到后鼻音的过程还不够稳定。",
          focus: "韵母 uang",
          detail: "先圆唇发 u，再自然打开到 ang，最后把后鼻音收住。",
          practice: ["光", "广", "逛"],
        },
      ],
    },
    tone_timing: {
      overall_score: 62,
      boundary_confidence: "medium",
      syllables: [
        {
          index: 0,
          char: "光",
          pinyin: "guang1",
          pinyin_display: "guang1",
          initial: "g",
          final: "uang",
          tone: "1",
          tone_score: 70,
          feedback: "第一声保持平稳，重点先放在韵母口型变化。",
          tone_curve: {
            target: [50, 50, 50, 50, 50, 50],
            user: [45, 52, 48, 55, 50, 46],
            has_user_pitch: true,
          },
        },
      ],
    },
  };
}

function loadDemoTeachingClip() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("demoClip") !== "1") return false;
  state = reduceState(state, { type: "SET_TEXT", text: "光" });
  state = reduceState(state, {
    type: "APPLY_ANALYSIS",
    result: demoTeachingClipResult(),
    clipManifest: pronunciationClipManifest,
  });
  state = reduceState(state, { type: "NAVIGATE", view: "detail" });
  render();
  return true;
}

function setPlaying(copy) {
  window.clearTimeout(playbackTimer);
  state = reduceState(state, { type: "SET_PLAYING", playing: true });
  render();
  showToast(copy);
  playbackTimer = window.setTimeout(() => {
    state = reduceState(state, { type: "SET_PLAYING", playing: false });
    render();
  }, 1300);
}

function speakStandard(copy) {
  const text = standardPronunciationText();
  if (!text) {
    showToast("请先输入想练习的中文句子。");
    return;
  }

  window.clearTimeout(playbackTimer);
  standardAudio?.pause();
  standardAudio = null;

  if (state.currentView === "teachingClip") {
    speakStandardWithAi(copy, text);
    return;
  }

  if (state.standardAudioUrl) {
    standardAudio = new Audio(state.standardAudioUrl);
    state = reduceState(state, { type: "SET_PLAYING", playing: true });
    render();
    showToast(`${copy}（真人标准音）`);
    standardAudio.addEventListener("ended", () => {
      state = reduceState(state, { type: "SET_PLAYING", playing: false });
      render();
    });
    standardAudio.addEventListener("error", () => {
      state = reduceState(state, { type: "SET_PLAYING", playing: false });
      render();
      showToast("本地真人标准音无法播放，已改用系统中文朗读。");
      state = reduceState(state, { type: "SET_PLAYING", playing: false });
      speakStandardWithTts(copy, text);
    }, { once: true });
    standardAudio.play().catch(() => speakStandardWithTts(copy, text));
    return;
  }

  speakStandardWithAi(copy, text);
}

async function fetchAiStandardAudio(text) {
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "AI standard audio failed.");
  }
  return payload.audioUrl;
}

function speakStandardWithAi(copy, text) {
  state = reduceState(state, { type: "SET_PLAYING", playing: true });
  render();
  showToast("正在生成 AI 标准音。");

  fetchAiStandardAudio(text)
    .then((audioUrl) => {
      standardAudio?.pause();
      standardAudio = new Audio(audioUrl);
      standardAudio.addEventListener("ended", () => {
        state = reduceState(state, { type: "SET_PLAYING", playing: false });
        render();
      });
      standardAudio.addEventListener(
        "error",
        () => {
          state = reduceState(state, { type: "SET_PLAYING", playing: false });
          render();
          speakStandardWithTts(copy, text);
        },
        { once: true },
      );
      showToast(`${copy}（AI 标准音）`);
      return standardAudio.play();
    })
    .catch(() => {
      state = reduceState(state, { type: "SET_PLAYING", playing: false });
      render();
      speakStandardWithTts(copy, text);
    });
}

function speakStandardWithTts(copy, text) {
  if (!("speechSynthesis" in window)) {
    setPlaying("当前浏览器不支持标准发音播放。");
    return;
  }

  window.speechSynthesis.cancel();
  standardUtterance = new SpeechSynthesisUtterance(text);
  standardUtterance.lang = "zh-CN";
  standardUtterance.rate = 0.78;
  standardUtterance.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  standardUtterance.voice =
    voices.find((voice) => voice.lang === "zh-CN") ||
    voices.find((voice) => voice.lang.startsWith("zh")) ||
    null;

  state = reduceState(state, { type: "SET_PLAYING", playing: true });
  render();
  showToast(`${copy}（当前为系统中文朗读）`);

  standardUtterance.onend = () => {
    state = reduceState(state, { type: "SET_PLAYING", playing: false });
    render();
  };
  standardUtterance.onerror = () => {
    state = reduceState(state, { type: "SET_PLAYING", playing: false });
    render();
    showToast("标准发音播放失败，请检查浏览器声音设置。");
  };

  window.speechSynthesis.speak(standardUtterance);
}

function playSelfRecording() {
  if (!state.lastRecordingUrl) {
    showToast("还没有可以回听的录音。");
    return;
  }
  const audio = new Audio(state.lastRecordingUrl);
  audio.play().then(() => {
    showToast("正在播放你的录音。");
  }).catch(() => {
    showToast("无法播放你的录音，请重新录一次。");
  });
}

function handleAction(target) {
  const action = target.closest("[data-action]")?.dataset.action;
  if (!action) return false;

  if (action === "record") {
    if (state.recordingState === "complete") {
      state = reduceState(state, { type: "RESET_PRACTICE" });
      render();
      showToast("练习已重置，可以重新录音。");
      return true;
    }
    if (!state.targetText.trim()) {
      showToast("请先输入想练习的中文句子。 ");
      return true;
    }
    if (state.recordingState === "idle") {
      startRecording()
        .then(() => {
          state = reduceState(state, { type: "RECORD_START" });
          render();
          showToast("正在录音，请说出屏幕上的句子。 ");
        })
        .catch((error) => {
          state = reduceState(state, { type: "ANALYZE_ERROR", message: error.message });
          render();
          showToast(error.message);
        });
      return true;
    }
    if (state.recordingState === "recording") {
      stopRecordingAndAnalyze().catch((error) => {
        stopTracks();
        state = reduceState(state, { type: "ANALYZE_ERROR", message: error.message });
        render();
        showToast(error.message);
      });
      return true;
    }
    return true;
  }

  if (action === "reset") {
    clearTimers();
    state = reduceState(state, { type: "RESET_PRACTICE" });
    stopTracks();
    scheduleTextInfo(state.targetText);
    render();
    showToast("已恢复本次练习的初始数据。");
    return true;
  }

  if (action === "play" || action === "play-detail") {
    speakStandard(action === "play" ? "正在播放参考发音。" : "正在重听标准发音。");
    return true;
  }

  if (action === "generate-teaching-clip") {
    state = reduceState(state, {
      type: "GENERATE_TEACHING_CLIP",
      clipManifest: pronunciationClipManifest,
    });
    render();
    app.scrollTop = 0;
    showToast(state.currentView === "teachingClip"
      ? "已生成本次个性化教学短片。"
      : "这次分析没有发现需要生成短片的问题。");
    return true;
  }

  if (action === "clip-prev") {
    clearTimers();
    state = reduceState(state, { type: "PREVIOUS_CLIP_SEGMENT" });
    render();
    return true;
  }

  if (action === "clip-next") {
    clearTimers();
    state = reduceState(state, { type: "NEXT_CLIP_SEGMENT" });
    state = reduceState(state, { type: "SET_CLIP_PLAYING", playing: false });
    render();
    return true;
  }

  if (action === "clip-play") {
    state = reduceState(state, { type: "SET_CLIP_PLAYING", playing: true });
    render();
    scheduleClipAdvance();
    return true;
  }

  if (action === "clip-pause") {
    clearTimers();
    state = reduceState(state, { type: "SET_CLIP_PLAYING", playing: false });
    document.querySelector(".clip-video")?.pause?.();
    render();
    return true;
  }

  if (action === "clip-replay-standard") {
    speakStandard("正在播放短片练习标准音。");
    return true;
  }

  if (action === "play-self") {
    playSelfRecording();
    return true;
  }

  if (action === "toggle-period") {
    showToast("进度页现在显示你的真实练习记录。");
    return true;
  }

  if (action === "teacher-task-placeholder") {
    showToast("下一步会把该学生的问题标签生成可编辑任务包。");
    return true;
  }

  return false;
}

function handleClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (handleAction(target)) return;

  const viewButton = target.closest("[data-view]");
  if (viewButton) {
    clearTimers();
    if (viewButton.dataset.view !== "detail") stopCameraPreview();
    state = reduceState(state, {
      type: "NAVIGATE",
      view: viewButton.dataset.view,
    });
    render();
    app.scrollTop = 0;
    return;
  }

  const syllableButton = target.closest("[data-syllable]");
  if (syllableButton) {
    clearTimers();
    state = reduceState(state, {
      type: "SELECT_SYLLABLE",
      syllableId: syllableButton.dataset.syllable,
      clipManifest: pronunciationClipManifest,
    });
    const activeSyllables = getSyllables(state);
    render();
    app.scrollTop = 0;
    showToast(`正在查看“${activeSyllables[state.selectedSyllable].character}”的发音详情。`);
    return;
  }

  const teacherStudentButton = target.closest("[data-teacher-student]");
  if (teacherStudentButton) {
    state = reduceState(state, {
      type: "SELECT_TEACHER_STUDENT",
      studentId: teacherStudentButton.dataset.teacherStudent,
    });
    render();
    app.scrollTop = 0;
    showToast("已切换学生发音档案。");
    return;
  }

  const tipButton = target.closest("[data-tip]");
  if (tipButton) {
    state = reduceState(state, {
      type: "SELECT_TIP",
      tipId: tipButton.dataset.tip,
    });
    render();
    showToast(`已选中“${tipButton.querySelector(".tip-title").textContent}”建议。`);
    return;
  }

  const setTextButton = target.closest("[data-set-text]");
  if (setTextButton) {
    const text = setTextButton.dataset.setText || "";
    clearTimers();
    state = reduceState(state, {
      type: "SET_TARGET_TEXT",
      text,
      returnToToneDrill: state.currentView === "toneDrill",
    });
    state = reduceState(state, { type: "NAVIGATE", view: "practice" });
    render();
    scheduleTextInfo(text);
    app.scrollTop = 0;
    showToast(`已切换到“${text}”专项练习。`);
    return;
  }

  const toneDrillButton = target.closest("[data-tone-drill]");
  if (toneDrillButton) {
    state = reduceState(state, {
      type: "SET_TONE_DRILL",
      tone: toneDrillButton.dataset.toneDrill,
    });
    render();
    app.scrollTop = 0;
    return;
  }

  const wordButton = target.closest("[data-word]");
  if (wordButton) {
    showToast(
      `${wordButton.dataset.word}：${wordButton.dataset.score} 分，${wordButton.dataset.status}。`,
    );
  }
}

function handleInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.dataset.field === "target-text") {
    state = reduceState(state, { type: "SET_TARGET_TEXT", text: target.value });
    if (!isComposingText) scheduleTextInfo(target.value);
  }
}

function handleCompositionStart(event) {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.dataset.field === "target-text") {
    isComposingText = true;
  }
}

function handleCompositionEnd(event) {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.dataset.field === "target-text") {
    isComposingText = false;
    state = reduceState(state, { type: "SET_TARGET_TEXT", text: target.value });
    scheduleTextInfo(target.value);
  }
}

document.addEventListener("click", handleClick);
document.addEventListener("input", handleInput);
document.addEventListener("compositionstart", handleCompositionStart);
document.addEventListener("compositionend", handleCompositionEnd);
window.speechSynthesis?.addEventListener?.("voiceschanged", () => {});
window.addEventListener("resize", () => {
  if (state.currentView === "detail") drawToneChart();
  if (state.currentView === "progress") drawProgressChart();
});

loadStoredState();
loadPronunciationClipManifest().finally(() => {
  if (!loadDemoTeachingClip()) {
    render();
    scheduleTextInfo(state.targetText);
  }
  syncSentenceInput();
});
