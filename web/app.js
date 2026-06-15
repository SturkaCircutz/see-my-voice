import {
  getCalendarDays,
  createInitialState,
  getStreak,
  getSyllables,
  getProgressData,
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
  const activeSyllables = getSyllables(state);
  const syllable = activeSyllables[state.selectedSyllable];
  if (state.currentView === "detail" && syllable?.character) return syllable.character;
  return state.targetText.trim();
}

function mouthShapeClass(syllable) {
  const final = syllable.pinyin?.replace(/[a-z]*?([aeiouv].*)\d?$/i, "$1") || "";
  if (/u|o|ong|ou/.test(final)) return "shape-round";
  if (/a|ai|ao|ang/.test(final)) return "shape-open";
  if (/i|e|ie|ian/.test(final)) return "shape-wide";
  return "shape-neutral";
}

function tonguePositionClass(syllable) {
  const initial = (syllable.pinyin || "").replace(/\d/g, "").match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])/)?.[0] || "";
  if (["d", "t", "n", "l", "z", "c", "s"].includes(initial)) return "tongue-front";
  if (["j", "q", "x", "y"].includes(initial)) return "tongue-palate";
  if (["g", "k", "h"].includes(initial)) return "tongue-back";
  if (["zh", "ch", "sh", "r"].includes(initial)) return "tongue-curled";
  return "tongue-low";
}

function renderGeneratedMouth(syllable) {
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
        <p>系统会比较目标拼音和 FunASR 听到的拼音，指出可能影响别人听懂的声母、韵母或声调。</p>
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
          ? `<div class="drill-list">
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
          : `<p class="drill-detail">${escapeHtml(diagnosis.limitation)}</p>`
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
        <h1 class="brand"><span class="brand-accent">声见</span> · ${progress ? "我的进步" : "See My Voice"}</h1>
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
    analyzing: "FunASR 分析中",
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

        <section class="model-card level-${state.modelStatus === "error" ? "focus" : "good"}" aria-label="模型状态">
          <div>
            <span class="model-kicker">FunASR Paraformer</span>
            <strong>${statusCopy}</strong>
            <span>系统听到：${state.asrHeard}</span>
          </div>
          <span class="status-pill">${state.modelStatus === "complete" ? "已连接" : "本地模型"}</span>
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
  const syllable = activeSyllables[state.selectedSyllable] ?? Object.values(activeSyllables)[0];
  return `
    <section class="screen" data-screen="detail">
      ${detailHeader(syllable)}
      <div class="content">
        <section aria-labelledby="mouth-title">
          <p class="section-label" id="mouth-title">嘴型与舌位对照</p>
          <div class="panel mouth-grid">
            <div class="mouth-panel">
              <p class="panel-title">自动嘴型示意</p>
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
              <p class="panel-title">舌位参考照片</p>
              <p class="mouth-cue-line">${escapeHtml(syllable.tongueCue)}</p>
            </div>
            ${renderGeneratedTongue(syllable)}
          </div>
          <p class="model-summary">嘴型和舌位由目标拼音自动生成，用来提示方向；摄像头适合观察嘴唇和下巴，舌头位置仍以示意和文字提示为主。</p>
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

function render() {
  saveStoredState();
  const views = {
    practice: renderPractice,
    detail: renderDetail,
    progress: renderProgress,
    toneDrill: renderToneDrill,
  };

  app.innerHTML = views[state.currentView]();
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
  });
  render();
  showToast("分析完成，结果已更新。 ");
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
  showToast("Generating AI standard audio.");

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
      showToast(`${copy} (AI standard audio)`);
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

  if (action === "play-self") {
    playSelfRecording();
    return true;
  }

  if (action === "toggle-period") {
    showToast("进度页现在显示你的真实练习记录。");
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
    });
    const activeSyllables = getSyllables(state);
    render();
    app.scrollTop = 0;
    showToast(`正在查看“${activeSyllables[state.selectedSyllable].character}”的发音详情。`);
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
render();
syncSentenceInput();
scheduleTextInfo(state.targetText);
