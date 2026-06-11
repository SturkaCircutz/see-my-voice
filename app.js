const PRACTICE_LIBRARY = [
  { text: "你好", pinyin: ["ni3", "hao3"], meaning: "hello", focus: "third-tone dip and recovery" },
  { text: "妈妈", pinyin: ["ma1", "ma1"], meaning: "mother", focus: "steady first tone" },
  { text: "谢谢", pinyin: ["xie4", "xie4"], meaning: "thank you", focus: "clear falling fourth tone" },
  { text: "我想喝水", pinyin: ["wo3", "xiang3", "he1", "shui3"], meaning: "I want to drink water", focus: "third tones and natural rhythm" },
  { text: "请再说一遍", pinyin: ["qing3", "zai4", "shuo1", "yi2", "bian4"], meaning: "please say it again", focus: "question-friendly rhythm" },
];

const PINYIN_BY_CHAR = {
  你: "ni3",
  好: "hao3",
  妈: "ma1",
  谢: "xie4",
  我: "wo3",
  想: "xiang3",
  喝: "he1",
  水: "shui3",
  请: "qing3",
  再: "zai4",
  说: "shuo1",
  一: "yi1",
  遍: "bian4",
};

const state = {
  status: "idle",
  stream: null,
  audioContext: null,
  analyser: null,
  source: null,
  animationFrame: null,
  startedAt: 0,
  practiceText: PRACTICE_LIBRARY[0].text,
  pinyin: PRACTICE_LIBRARY[0].pinyin,
  meaning: PRACTICE_LIBRARY[0].meaning,
  focus: PRACTICE_LIBRARY[0].focus,
  samples: [],
  frequencyFrames: [],
  waveform: [],
  level: 0,
  report: null,
  error: null,
};

const elements = {
  practiceSelect: document.querySelector("#practice-select"),
  customText: document.querySelector("#custom-text"),
  applyTextButton: document.querySelector("#apply-text-button"),
  recordButton: document.querySelector("#record-button"),
  pauseButton: document.querySelector("#pause-button"),
  resumeButton: document.querySelector("#resume-button"),
  stopButton: document.querySelector("#stop-button"),
  copyButton: document.querySelector("#copy-button"),
  downloadButton: document.querySelector("#download-button"),
  captionSize: document.querySelector("#caption-size"),
  captionSizeOutput: document.querySelector("#caption-size-output"),
  targetText: document.querySelector("#target-text"),
  pinyinLine: document.querySelector("#pinyin-line"),
  focusText: document.querySelector("#focus-text"),
  statusLabel: document.querySelector("#status-label"),
  statusDot: document.querySelector("#status-dot"),
  noticeTitle: document.querySelector("#notice-title"),
  noticeMessage: document.querySelector("#notice-message"),
  levelLabel: document.querySelector("#level-label"),
  meterFill: document.querySelector("#meter-fill"),
  visualizer: document.querySelector("#visualizer"),
  toneCanvas: document.querySelector("#tone-canvas"),
  scoreValue: document.querySelector("#score-value"),
  durationValue: document.querySelector("#duration-value"),
  syllableList: document.querySelector("#syllable-list"),
  feedbackList: document.querySelector("#feedback-list"),
  srStatus: document.querySelector("#sr-status"),
  themeInputs: document.querySelectorAll('input[name="theme"]'),
};

const visualizerContext = elements.visualizer.getContext("2d");
const toneContext = elements.toneCanvas.getContext("2d");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (new URLSearchParams(window.location.search).has("testHooks")) {
  window.__seeMyVoice = {
    state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    setPracticeText,
    analyzeRecording,
    render,
  };
}

function setStatus(status, message) {
  state.status = status;
  elements.srStatus.textContent = message || status;
  render();
}

function setPracticeText(text) {
  const normalized = text.trim() || PRACTICE_LIBRARY[0].text;
  const preset = PRACTICE_LIBRARY.find((item) => item.text === normalized);
  state.practiceText = normalized;
  state.pinyin = preset ? preset.pinyin : inferPinyin(normalized);
  state.meaning = preset ? preset.meaning : "custom practice text";
  state.focus = preset ? preset.focus : "tone shape, syllable rhythm, and clarity";
  state.report = null;
  render();
  drawIdleCanvases();
}

function inferPinyin(text) {
  return [...text]
    .filter((char) => /[\u4e00-\u9fff]/.test(char))
    .map((char) => PINYIN_BY_CHAR[char] || `${char}?`);
}

function render() {
  const isRecording = state.status === "recording";
  const isPaused = state.status === "paused";
  const isBusy = state.status === "requesting-permission" || state.status === "analyzing";
  const hasReport = Boolean(state.report);

  elements.recordButton.disabled = isRecording || isPaused || isBusy;
  elements.pauseButton.disabled = !isRecording;
  elements.resumeButton.disabled = !isPaused;
  elements.stopButton.disabled = !(isRecording || isPaused || isBusy);
  elements.copyButton.disabled = !hasReport;
  elements.downloadButton.disabled = !hasReport;

  const labels = {
    idle: "Ready",
    "requesting-permission": "Requesting microphone",
    recording: "Recording",
    paused: "Paused",
    analyzing: "Analyzing",
    complete: "Feedback ready",
    error: "Needs attention",
  };
  elements.statusLabel.textContent = labels[state.status] || "Ready";
  elements.statusDot.className = "status-dot";
  if (isRecording) elements.statusDot.classList.add("recording");
  if (isPaused) elements.statusDot.classList.add("paused");
  if (state.status === "error") elements.statusDot.classList.add("error");

  elements.targetText.textContent = state.practiceText;
  elements.pinyinLine.textContent = state.pinyin.length ? state.pinyin.join("  ") : "Add Chinese text to infer pinyin.";
  elements.focusText.textContent = `${state.meaning} · ${state.focus}`;

  renderNotice();
  renderReport();
}

function renderNotice() {
  let title = "Practice by seeing your voice.";
  let message = "Choose a Mandarin phrase, record yourself, then compare tone shape, rhythm, and syllable feedback. Audio stays in this browser for this prototype.";

  if (state.status === "requesting-permission") {
    title = "Waiting for microphone permission.";
    message = "Allow microphone access so the app can visualize and analyze your pronunciation locally in the browser.";
  } else if (state.status === "recording") {
    title = "Recording your pronunciation.";
    message = "Speak the target phrase once. The waveform and level meter show that the microphone is receiving your voice.";
  } else if (state.status === "paused") {
    title = "Recording is paused.";
    message = "Resume to continue or stop to analyze what you have recorded so far.";
  } else if (state.status === "complete") {
    title = "Pronunciation feedback is ready.";
    message = "Review the tone curve, syllable cards, and next practice suggestions. This is an MVP signal analysis, not a clinical assessment.";
  } else if (state.status === "error" && state.error) {
    title = state.error.title;
    message = state.error.message;
  }

  elements.noticeTitle.textContent = title;
  elements.noticeMessage.textContent = message;
}

async function startRecording() {
  state.error = null;
  state.report = null;
  state.samples = [];
  state.frequencyFrames = [];
  state.waveform = [];
  setMeterLevel(0);
  setStatus("requesting-permission", "Requesting microphone permission");

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw createError("Microphone unavailable", "This browser does not support microphone capture.");
    }

    state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await setupAudioGraph(state.stream);
    state.startedAt = performance.now();
    setStatus("recording", "Recording");
    startVisualizer();
  } catch (error) {
    handleError(normalizeError(error));
  }
}

async function setupAudioGraph(stream) {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    throw createError("Audio analysis unavailable", "This browser does not support the Web Audio API.");
  }

  state.audioContext = new AudioContextConstructor();
  state.source = state.audioContext.createMediaStreamSource(stream);
  state.analyser = state.audioContext.createAnalyser();
  state.analyser.fftSize = 2048;
  state.analyser.smoothingTimeConstant = 0.72;
  state.source.connect(state.analyser);

  if (state.audioContext.state === "suspended") {
    await state.audioContext.resume();
  }
}

async function pauseRecording() {
  stopVisualizer();
  if (state.audioContext?.state === "running") {
    await state.audioContext.suspend();
  }
  setMeterLevel(0);
  setStatus("paused", "Paused");
}

async function resumeRecording() {
  if (!state.stream) {
    await startRecording();
    return;
  }

  if (state.audioContext?.state === "suspended") {
    await state.audioContext.resume();
  }
  setStatus("recording", "Recording");
  startVisualizer();
}

async function stopRecording() {
  stopVisualizer();
  setStatus("analyzing", "Analyzing pronunciation");
  stopStream();
  if (state.audioContext) {
    await state.audioContext.close().catch(() => {});
  }
  state.audioContext = null;
  state.analyser = null;
  state.source = null;
  setMeterLevel(0);
  state.report = analyzeRecording();
  drawToneCanvas();
  setStatus("complete", "Feedback ready");
}

function startVisualizer() {
  stopVisualizer();
  const timeData = new Uint8Array(state.analyser?.fftSize || 0);
  const frequencyData = new Uint8Array(state.analyser?.frequencyBinCount || 0);

  const draw = () => {
    if (!state.analyser || state.status !== "recording") return;

    resizeCanvas(elements.visualizer);
    state.analyser.getByteTimeDomainData(timeData);
    state.analyser.getByteFrequencyData(frequencyData);

    const level = calculateLevel(timeData);
    state.level = level;
    state.samples.push({ time: elapsedSeconds(), level, pitch: estimatePitchFromFrequency(frequencyData) });
    state.frequencyFrames.push([...frequencyData]);
    state.waveform = downsampleWaveform(timeData);

    drawWaveform(timeData, frequencyData);
    setMeterLevel(level);

    state.animationFrame = window.requestAnimationFrame(draw);
  };

  draw();
}

function stopVisualizer() {
  if (state.animationFrame) {
    window.cancelAnimationFrame(state.animationFrame);
    state.animationFrame = null;
  }
}

function stopStream() {
  if (!state.stream) return;
  state.stream.getTracks().forEach((track) => track.stop());
  state.stream = null;
}

function elapsedSeconds() {
  return Math.max(0, (performance.now() - state.startedAt) / 1000);
}

function calculateLevel(timeData) {
  if (!timeData.length) return 0;
  let sum = 0;
  for (const value of timeData) {
    const centered = (value - 128) / 128;
    sum += centered * centered;
  }
  return Math.min(1, Math.sqrt(sum / timeData.length) * 3.2);
}

function estimatePitchFromFrequency(frequencyData) {
  if (!frequencyData.length) return 0;
  let maxValue = 0;
  let maxIndex = 0;
  const limit = Math.min(frequencyData.length, 96);
  for (let index = 3; index < limit; index += 1) {
    if (frequencyData[index] > maxValue) {
      maxValue = frequencyData[index];
      maxIndex = index;
    }
  }
  if (maxValue < 18) return 0;
  return 80 + maxIndex * 5;
}

function downsampleWaveform(timeData) {
  const buckets = 80;
  const result = [];
  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const index = Math.floor((bucket / buckets) * timeData.length);
    result.push((timeData[index] - 128) / 128);
  }
  return result;
}

function analyzeRecording() {
  const voicedSamples = state.samples.filter((sample) => sample.level > 0.04);
  const duration = state.samples.length ? state.samples[state.samples.length - 1].time : 0;
  const activeDuration = voicedSamples.length ? voicedSamples[voicedSamples.length - 1].time - voicedSamples[0].time : 0;
  const averageLevel = average(voicedSamples.map((sample) => sample.level));
  const pitchContour = smoothPitch(voicedSamples.map((sample) => sample.pitch));
  const syllables = buildSyllableFeedback(pitchContour, activeDuration || duration);
  const toneScore = average(syllables.map((item) => item.score));
  const rhythmScore = scoreRhythm(activeDuration || duration, state.pinyin.length);
  const energyScore = Math.round(Math.min(100, Math.max(35, averageLevel * 210)));
  const overallScore = Math.round(0.52 * toneScore + 0.28 * rhythmScore + 0.2 * energyScore);

  return {
    createdAt: new Date().toISOString(),
    text: state.practiceText,
    pinyin: state.pinyin,
    duration,
    activeDuration,
    averageLevel,
    pitchContour,
    syllables,
    scores: {
      overall: overallScore,
      tone: Math.round(toneScore),
      rhythm: rhythmScore,
      energy: energyScore,
    },
    suggestions: buildSuggestions(syllables, rhythmScore, energyScore),
  };
}

function buildSyllableFeedback(pitchContour, activeDuration) {
  const chars = [...state.practiceText].filter((char) => /[\u4e00-\u9fff]/.test(char));
  const pinyin = state.pinyin.length ? state.pinyin : chars.map((char) => PINYIN_BY_CHAR[char] || `${char}?`);
  const count = Math.max(1, pinyin.length);
  const fallbackContour = Array.from({ length: Math.max(12, count * 8) }, (_, index) => 120 + Math.sin(index / 2) * 8);
  const contour = pitchContour.length >= count ? pitchContour : fallbackContour;

  return pinyin.map((syllable, index) => {
    const tone = toneFromPinyin(syllable);
    const startIndex = Math.floor((index / count) * contour.length);
    const endIndex = Math.max(startIndex + 2, Math.floor(((index + 1) / count) * contour.length));
    const segment = contour.slice(startIndex, endIndex);
    const movement = segment.length ? segment[segment.length - 1] - segment[0] : 0;
    const score = scoreTone(tone, movement, segment);
    return {
      index,
      char: chars[index] || "—",
      pinyin: syllable,
      tone,
      window: {
        start: (activeDuration / count) * index,
        end: (activeDuration / count) * (index + 1),
      },
      movement,
      score,
      feedback: toneFeedback(tone, score, movement),
      action: actionCue(tone),
    };
  });
}

function smoothPitch(values) {
  const clean = values.filter((value) => value > 0);
  if (clean.length < 3) return [];
  const result = [];
  for (let index = 0; index < clean.length; index += 1) {
    const window = clean.slice(Math.max(0, index - 2), Math.min(clean.length, index + 3));
    result.push(average(window));
  }
  return result;
}

function toneFromPinyin(pinyin) {
  const match = pinyin.match(/[1-5]$/);
  return match ? match[0] : "5";
}

function scoreTone(tone, movement, segment) {
  const range = Math.max(...segment) - Math.min(...segment);
  if (!segment.length) return 45;
  if (tone === "1") return clampScore(92 - Math.abs(movement) * 2.2 - range * 0.7);
  if (tone === "2") return clampScore(58 + movement * 1.8);
  if (tone === "3") return clampScore(70 + range * 0.65 - Math.abs(movement) * 0.45);
  if (tone === "4") return clampScore(58 - movement * 1.8);
  return clampScore(76 - range * 0.4);
}

function clampScore(value) {
  return Math.round(Math.max(25, Math.min(100, value)));
}

function scoreRhythm(activeDuration, syllableCount) {
  if (!activeDuration || !syllableCount) return 45;
  const secondsPerSyllable = activeDuration / syllableCount;
  const distance = Math.abs(secondsPerSyllable - 0.55);
  return clampScore(96 - distance * 80);
}

function toneFeedback(tone, score, movement) {
  if (score >= 82) return "Tone shape is close. Keep this movement.";
  if (tone === "1") return "Keep pitch flatter and steadier from start to finish.";
  if (tone === "2") return "Make the pitch rise more clearly, like asking a short question.";
  if (tone === "3") return "Dip lower in the middle before lifting slightly.";
  if (tone === "4") return "Start higher and drop faster with a firm ending.";
  return movement > 0 ? "Make the neutral tone lighter and shorter." : "Keep the neutral tone short and relaxed.";
}

function actionCue(tone) {
  if (tone === "1") return "Mouth: steady opening. Voice: hold level.";
  if (tone === "2") return "Voice: glide upward. Body cue: lift finger as pitch rises.";
  if (tone === "3") return "Voice: low dip. Body cue: trace a shallow V.";
  if (tone === "4") return "Voice: quick fall. Breath: release firmly.";
  return "Voice: short and light. Avoid stretching the syllable.";
}

function buildSuggestions(syllables, rhythmScore, energyScore) {
  const suggestions = [];
  const weakest = [...syllables].sort((a, b) => a.score - b.score)[0];
  if (weakest) suggestions.push(`Repeat ${weakest.char} (${weakest.pinyin}) three times: ${weakest.feedback}`);
  if (rhythmScore < 75) suggestions.push("Practice with one beat per syllable, then say the whole phrase smoothly.");
  if (energyScore < 65) suggestions.push("Move closer to the microphone or speak with a little more steady airflow.");
  if (!suggestions.length) suggestions.push("Good pass. Record again and try to keep the same tone shape with a smoother rhythm.");
  return suggestions;
}

function renderReport() {
  const report = state.report;
  if (!report) {
    elements.scoreValue.textContent = "—";
    elements.durationValue.textContent = "0.0s";
    elements.syllableList.innerHTML = '<p class="empty-state">Record a phrase to see syllable feedback.</p>';
    elements.feedbackList.innerHTML = '<p class="empty-state">Next practice suggestions will appear here.</p>';
    return;
  }

  elements.scoreValue.textContent = String(report.scores.overall);
  elements.durationValue.textContent = `${report.duration.toFixed(1)}s`;

  const syllableFragment = document.createDocumentFragment();
  report.syllables.forEach((syllable) => {
    const item = document.createElement("article");
    item.className = "syllable-card";
    item.innerHTML = `
      <div><strong>${syllable.char}</strong><span>${syllable.pinyin}</span></div>
      <meter min="0" max="100" value="${syllable.score}">${syllable.score}</meter>
      <p>${syllable.feedback}</p>
      <small>${syllable.action}</small>
    `;
    syllableFragment.append(item);
  });
  elements.syllableList.replaceChildren(syllableFragment);

  const feedbackFragment = document.createDocumentFragment();
  report.suggestions.forEach((suggestion) => {
    const item = document.createElement("li");
    item.textContent = suggestion;
    feedbackFragment.append(item);
  });
  elements.feedbackList.replaceChildren(feedbackFragment);
}

function drawWaveform(timeData, frequencyData) {
  const canvas = elements.visualizer;
  resizeCanvas(canvas);
  const { width, height } = canvas;
  const style = getComputedStyle(document.body);
  const surface = style.getPropertyValue("--surface-strong").trim();
  const accent = style.getPropertyValue("--accent").trim();
  const text = style.getPropertyValue("--text").trim();
  const border = style.getPropertyValue("--border").trim();

  visualizerContext.clearRect(0, 0, width, height);
  visualizerContext.fillStyle = surface;
  visualizerContext.fillRect(0, 0, width, height);
  visualizerContext.strokeStyle = border;
  visualizerContext.lineWidth = 1;
  for (let line = 1; line < 4; line += 1) {
    const y = (height / 4) * line;
    visualizerContext.beginPath();
    visualizerContext.moveTo(0, y);
    visualizerContext.lineTo(width, y);
    visualizerContext.stroke();
  }

  visualizerContext.strokeStyle = accent;
  visualizerContext.lineWidth = Math.max(2, width / 420);
  visualizerContext.beginPath();
  for (let index = 0; index < timeData.length; index += 1) {
    const x = (index / (timeData.length - 1)) * width;
    const y = height * 0.45 + ((timeData[index] - 128) / 128) * height * 0.26;
    if (index === 0) visualizerContext.moveTo(x, y);
    else visualizerContext.lineTo(x, y);
  }
  visualizerContext.stroke();

  const bars = reducedMotion.matches ? 20 : 44;
  const barWidth = width / bars;
  visualizerContext.fillStyle = text;
  for (let index = 0; index < bars; index += 1) {
    const sourceIndex = Math.floor((index / bars) * frequencyData.length);
    const value = frequencyData[sourceIndex] / 255;
    const barHeight = Math.max(3, value * height * 0.28);
    visualizerContext.fillRect(index * barWidth + 2, height - barHeight - 8, Math.max(2, barWidth - 4), barHeight);
  }
}

function drawToneCanvas() {
  const canvas = elements.toneCanvas;
  resizeCanvas(canvas);
  const { width, height } = canvas;
  const style = getComputedStyle(document.body);
  const surface = style.getPropertyValue("--surface-strong").trim();
  const accent = style.getPropertyValue("--accent").trim();
  const muted = style.getPropertyValue("--muted").trim();
  const border = style.getPropertyValue("--border").trim();
  const report = state.report;

  toneContext.clearRect(0, 0, width, height);
  toneContext.fillStyle = surface;
  toneContext.fillRect(0, 0, width, height);
  toneContext.strokeStyle = border;
  toneContext.lineWidth = 1;
  for (let line = 1; line < 4; line += 1) {
    const y = (height / 4) * line;
    toneContext.beginPath();
    toneContext.moveTo(0, y);
    toneContext.lineTo(width, y);
    toneContext.stroke();
  }

  if (!report || report.pitchContour.length < 2) {
    toneContext.fillStyle = muted;
    toneContext.font = "16px sans-serif";
    toneContext.fillText("Tone curve appears after recording.", 18, 34);
    return;
  }

  const values = report.pitchContour;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(1, max - min);
  toneContext.strokeStyle = accent;
  toneContext.lineWidth = Math.max(2, width / 420);
  toneContext.beginPath();
  values.forEach((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - 24 - ((value - min) / spread) * (height - 48);
    if (index === 0) toneContext.moveTo(x, y);
    else toneContext.lineTo(x, y);
  });
  toneContext.stroke();

  report.syllables.forEach((syllable, index) => {
    const x = (index / report.syllables.length) * width;
    toneContext.strokeStyle = border;
    toneContext.beginPath();
    toneContext.moveTo(x, 0);
    toneContext.lineTo(x, height);
    toneContext.stroke();
    toneContext.fillStyle = muted;
    toneContext.font = "13px sans-serif";
    toneContext.fillText(syllable.pinyin, x + 8, height - 10);
  });
}

function drawIdleCanvases() {
  drawIdleLine(elements.visualizer, visualizerContext, "Live waveform appears while recording.");
  drawIdleLine(elements.toneCanvas, toneContext, "Tone curve appears after analysis.");
}

function drawIdleLine(canvas, context, label) {
  resizeCanvas(canvas);
  const { width, height } = canvas;
  const style = getComputedStyle(document.body);
  const surface = style.getPropertyValue("--surface-strong").trim();
  const muted = style.getPropertyValue("--muted").trim();
  context.clearRect(0, 0, width, height);
  context.fillStyle = surface;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = muted;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, height / 2);
  context.lineTo(width, height / 2);
  context.stroke();
  context.fillStyle = muted;
  context.font = "16px sans-serif";
  context.fillText(label, 18, 34);
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function setMeterLevel(level) {
  const percent = Math.round(level * 100);
  elements.meterFill.style.width = `${percent}%`;
  elements.levelLabel.textContent = `Voice level ${percent}%`;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function reportText() {
  if (!state.report) return "";
  const lines = [
    `See My Voice pronunciation report`,
    `Text: ${state.report.text}`,
    `Pinyin: ${state.report.pinyin.join(" ")}`,
    `Overall: ${state.report.scores.overall}`,
    `Tone: ${state.report.scores.tone}`,
    `Rhythm: ${state.report.scores.rhythm}`,
    `Energy: ${state.report.scores.energy}`,
    `Duration: ${state.report.duration.toFixed(2)}s`,
    "",
    "Syllables:",
    ...state.report.syllables.map((item) => `${item.char} ${item.pinyin}: ${item.score} - ${item.feedback} ${item.action}`),
    "",
    "Next practice:",
    ...state.report.suggestions.map((item) => `- ${item}`),
  ];
  return lines.join("\n");
}

async function copyReport() {
  const text = reportText();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  elements.srStatus.textContent = "Feedback report copied";
}

function downloadReport() {
  const text = reportText();
  if (!text) return;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `see-my-voice-pronunciation-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  elements.srStatus.textContent = "Feedback report downloaded";
}

function handleError(error) {
  stopVisualizer();
  stopStream();
  if (state.audioContext) state.audioContext.close().catch(() => {});
  state.audioContext = null;
  state.analyser = null;
  state.source = null;
  state.error = error;
  setMeterLevel(0);
  drawIdleCanvases();
  setStatus("error", error.message);
}

function normalizeError(error) {
  if (error?.title && error?.message) return error;
  if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
    return createError("Microphone permission denied", "Allow microphone access in the browser, then record again.");
  }
  if (error?.name === "NotFoundError") {
    return createError("No microphone found", "Connect or enable a microphone, then try again.");
  }
  return createError("Recording failed", error?.message || "The browser could not start the microphone session.");
}

function createError(title, message) {
  return { title, message };
}

function bindEvents() {
  elements.practiceSelect.addEventListener("change", () => {
    const selected = PRACTICE_LIBRARY.find((item) => item.text === elements.practiceSelect.value);
    if (selected) {
      elements.customText.value = selected.text;
      setPracticeText(selected.text);
    }
  });
  elements.applyTextButton.addEventListener("click", () => setPracticeText(elements.customText.value));
  elements.recordButton.addEventListener("click", startRecording);
  elements.pauseButton.addEventListener("click", pauseRecording);
  elements.resumeButton.addEventListener("click", resumeRecording);
  elements.stopButton.addEventListener("click", stopRecording);
  elements.copyButton.addEventListener("click", copyReport);
  elements.downloadButton.addEventListener("click", downloadReport);

  elements.captionSize.addEventListener("input", () => {
    const size = `${elements.captionSize.value}px`;
    document.documentElement.style.setProperty("--target-size", size);
    elements.captionSizeOutput.textContent = size;
  });

  elements.themeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        document.body.dataset.theme = input.value;
        drawIdleCanvases();
        if (state.report) drawToneCanvas();
      }
    });
  });

  window.addEventListener("resize", () => {
    if (state.status === "recording") return;
    if (state.report) drawToneCanvas();
    else drawIdleCanvases();
  });
}

bindEvents();
elements.customText.value = state.practiceText;
drawIdleCanvases();
render();
