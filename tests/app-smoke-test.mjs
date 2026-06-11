import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script, createContext } from "node:vm";

class ClassList {
  constructor() {
    this.values = new Set();
  }

  add(value) {
    this.values.add(value);
  }

  toggle(value, enabled) {
    if (enabled) this.values.add(value);
    else this.values.delete(value);
  }
}

class Element {
  constructor(tagName = "div") {
    this.tagName = tagName;
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.style = {};
    this.classList = new ClassList();
    this.textContent = "";
    this.innerHTML = "";
    this.disabled = false;
    this.checked = false;
    this.value = "";
    this.dataset = {};
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
    this.innerHTML = "";
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  select() {}

  click() {
    this.clicked = true;
  }

  getBoundingClientRect() {
    return { width: 900, height: 260 };
  }

  getContext() {
    return {
      beginPath() {},
      clearRect() {},
      fillRect() {},
      fillText() {},
      lineTo() {},
      moveTo() {},
      stroke() {},
      fillStyle: "",
      font: "",
      lineWidth: 1,
      strokeStyle: "",
    };
  }
}

const selectors = [
  "#practice-select",
  "#custom-text",
  "#apply-text-button",
  "#record-button",
  "#pause-button",
  "#resume-button",
  "#stop-button",
  "#copy-button",
  "#download-button",
  "#caption-size",
  "#caption-size-output",
  "#target-text",
  "#pinyin-line",
  "#focus-text",
  "#status-label",
  "#status-dot",
  "#notice-title",
  "#notice-message",
  "#level-label",
  "#meter-fill",
  "#visualizer",
  "#tone-canvas",
  "#score-value",
  "#duration-value",
  "#syllable-list",
  "#feedback-list",
  "#sr-status",
];

const elements = new Map(selectors.map((selector) => [selector, new Element()]));
elements.get("#practice-select").value = "你好";
elements.get("#custom-text").value = "你好";
elements.get("#caption-size").value = "48";

const themeInput = new Element("input");
themeInput.checked = true;
themeInput.value = "light";

let stoppedTracks = 0;
let animationFrames = 0;
let cancelledFrames = 0;
let now = 1000;

class MockAudioContext {
  constructor() {
    this.state = "running";
  }

  createMediaStreamSource() {
    return { connect() {} };
  }

  createAnalyser() {
    return {
      fftSize: 16,
      frequencyBinCount: 8,
      smoothingTimeConstant: 0,
      getByteTimeDomainData(data) {
        data.set([128, 172, 190, 168, 128, 88, 66, 92, 128, 172, 190, 168, 128, 88, 66, 92]);
      },
      getByteFrequencyData(data) {
        const frames = [
          [10, 24, 58, 130, 220, 150, 70, 30],
          [10, 22, 52, 100, 180, 230, 90, 35],
          [10, 20, 60, 160, 210, 140, 80, 40],
          [10, 30, 80, 190, 230, 150, 80, 50],
        ];
        data.set(frames[animationFrames % frames.length]);
      },
    };
  }

  resume() {
    this.state = "running";
    return Promise.resolve();
  }

  suspend() {
    this.state = "suspended";
    return Promise.resolve();
  }

  close() {
    this.state = "closed";
    return Promise.resolve();
  }
}

const documentElement = new Element("html");
const body = new Element("body");

const context = {
  Blob: class Blob {
    constructor(parts) {
      this.parts = parts;
    }
  },
  AudioContext: MockAudioContext,
  URL: {
    createObjectURL() {
      return "blob:test";
    },
    revokeObjectURL() {},
  },
  URLSearchParams,
  Uint8Array,
  console,
  document: {
    body,
    documentElement,
    createDocumentFragment() {
      return new Element("fragment");
    },
    createElement(tagName) {
      return new Element(tagName);
    },
    execCommand() {
      return true;
    },
    querySelector(selector) {
      return elements.get(selector) ?? null;
    },
    querySelectorAll(selector) {
      return selector === 'input[name="theme"]' ? [themeInput] : [];
    },
  },
  getComputedStyle() {
    return {
      getPropertyValue(name) {
        const values = {
          "--surface-strong": "#eef3f8",
          "--accent": "#2563eb",
          "--text": "#101418",
          "--border": "#cfd8e3",
          "--muted": "#5d6773",
        };
        return values[name] || "";
      },
    };
  },
  navigator: {
    clipboard: {
      writeText(text) {
        context.__copied = text;
        return Promise.resolve();
      },
    },
    mediaDevices: {
      getUserMedia() {
        return Promise.resolve({
          getTracks() {
            return [
              {
                stop() {
                  stoppedTracks += 1;
                },
              },
            ];
          },
        });
      },
    },
  },
  performance: {
    now() {
      now += 180;
      return now;
    },
  },
  window: {
    AudioContext: MockAudioContext,
    devicePixelRatio: 1,
    location: { search: "?testHooks" },
    matchMedia() {
      return { matches: false };
    },
    requestAnimationFrame(callback) {
      animationFrames += 1;
      if (animationFrames < 8) callback();
      return animationFrames;
    },
    cancelAnimationFrame() {
      cancelledFrames += 1;
    },
    addEventListener() {},
  },
};

context.globalThis = context;
context.window.window = context.window;

const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
new Script(appSource, { filename: "app.js" }).runInContext(createContext(context));

assert.equal(elements.get("#target-text").textContent, "你好");
assert.match(elements.get("#pinyin-line").textContent, /ni3/);

context.window.__seeMyVoice.setPracticeText("谢谢");
assert.equal(elements.get("#target-text").textContent, "谢谢");
assert.match(elements.get("#pinyin-line").textContent, /xie4/);

await context.window.__seeMyVoice.startRecording();
assert.equal(elements.get("#status-label").textContent, "Recording");
assert.ok(animationFrames > 0, "recording should draw live waveform frames");
assert.ok(context.window.__seeMyVoice.state.samples.length > 0, "recording should collect analysis samples");

await context.window.__seeMyVoice.pauseRecording();
assert.equal(elements.get("#status-label").textContent, "Paused");
assert.ok(cancelledFrames > 0, "pause should cancel visualization frames");

await context.window.__seeMyVoice.resumeRecording();
assert.equal(elements.get("#status-label").textContent, "Recording");

await context.window.__seeMyVoice.stopRecording();
assert.equal(elements.get("#status-label").textContent, "Feedback ready");
assert.equal(stoppedTracks, 1, "stop should release microphone tracks");
assert.ok(context.window.__seeMyVoice.state.report, "stop should produce a pronunciation report");
assert.equal(context.window.__seeMyVoice.state.report.text, "谢谢");
assert.ok(context.window.__seeMyVoice.state.report.syllables.length >= 2);
assert.notEqual(elements.get("#score-value").textContent, "—");
assert.equal(elements.get("#copy-button").disabled, false);
assert.equal(elements.get("#download-button").disabled, false);

await elements.get("#copy-button").listeners.click();
assert.match(context.__copied, /See My Voice pronunciation report/);
assert.match(context.__copied, /谢谢/);

console.log("pronunciation app smoke test passed");
