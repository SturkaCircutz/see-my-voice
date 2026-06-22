import React from "react";
import ReactDOM from "react-dom/client";
import { Loader2, LogOut } from "lucide-react";
import {
  analyzePronunciation,
  clearToken,
  fetchCurrentUser,
  fetchUsers,
  loginUser,
  registerUser,
  setToken,
} from "./api";
import type {
  AuthMode,
  AuthUser,
  PracticeAttempt,
  PronunciationAnalysis,
  ScoreSet,
  SyllableFeedback,
} from "./types";
import "./styles.css";

type View = "practice" | "detail" | "progress";

const defaultScores: ScoreSet = {
  overall: 0,
  tone: 0,
  clarity: 0,
  rhythm: 0,
};

const defaultSyllables: SyllableFeedback[] = [
  {
    id: "wo",
    character: "我",
    pinyin: "wǒ",
    score: 0,
    focus: "T3",
    feedback: "录音后会显示这个音节的声调和清晰度反馈。",
  },
  {
    id: "yao",
    character: "要",
    pinyin: "yào",
    score: 0,
    focus: "T4",
    feedback: "点击录音后系统会判断是否听懂。",
  },
  {
    id: "chi",
    character: "吃",
    pinyin: "chī",
    score: 0,
    focus: "T1",
    feedback: "声母、韵母和声调会在这里拆开显示。",
  },
  {
    id: "fan",
    character: "饭",
    pinyin: "fàn",
    score: 0,
    focus: "T4",
    feedback: "API 接入后会给出更具体的练习建议。",
  },
];

const fallbackAnalysis: PronunciationAnalysis = {
  heardText: "等待 API",
  summary:
    "登录和 MongoDB 记录已连接。发音分析 API 还没有配置，所以这里先保留原型反馈。",
  scores: defaultScores,
  syllables: defaultSyllables,
};

const pinyinByText: Record<string, string> = {
  我要吃饭: "wǒ yào chī fàn",
  你好: "nǐ hǎo",
  谢谢: "xiè xie",
  请再说一遍: "qǐng zài shuō yí biàn",
};

function App() {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [users, setUsers] = React.useState<AuthUser[]>([]);
  const [booting, setBooting] = React.useState(true);
  const [authError, setAuthError] = React.useState("");

  React.useEffect(() => {
    fetchCurrentUser()
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch(() => clearToken())
      .finally(() => setBooting(false));
  }, []);

  React.useEffect(() => {
    if (!user) return;
    fetchUsers()
      .then((payload) => setUsers(payload.users))
      .catch(() => setUsers([]));
  }, [user]);

  function handleAuthed(payload: { token: string; user: AuthUser }) {
    setToken(payload.token);
    setUser(payload.user);
    setAuthError("");
  }

  function handleLogout() {
    clearToken();
    setUser(null);
    setUsers([]);
  }

  if (booting) {
    return (
      <PhoneShell>
        <main id="app">
          <section className="screen loading-screen">
            <Loader2 className="spin" aria-hidden="true" />
            <span>Loading See My Voice</span>
          </section>
        </main>
      </PhoneShell>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        error={authError}
        onLogin={(username, password) =>
          loginUser({ username, password }).then(handleAuthed).catch((error) => {
            setAuthError(error.message);
          })
        }
        onRegister={(name, username, password) =>
          registerUser({ name, username, password }).then(handleAuthed).catch((error) => {
            setAuthError(error.message);
          })
        }
      />
    );
  }

  return <PracticeApp user={user} users={users} onLogout={handleLogout} />;
}

function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-stage">
      <div className="phone-shell">{children}</div>
    </div>
  );
}

interface AuthScreenProps {
  error: string;
  onLogin: (username: string, password: string) => Promise<void> | void;
  onRegister: (name: string, username: string, password: string) => Promise<void> | void;
}

function AuthScreen({ error, onLogin, onRegister }: AuthScreenProps) {
  const [mode, setMode] = React.useState<AuthMode>("login");
  const [name, setName] = React.useState("Jiawen");
  const [username, setUsername] = React.useState("jiawen");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "register") await onRegister(name, username, password);
      else await onLogin(username, password);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PhoneShell>
      <main id="app">
        <section className="screen">
          <header className="app-header">
            <div className="status-row">
              <span>9:41</span>
              <span>账户</span>
            </div>
            <div className="brand-row">
              <h1 className="brand">
                <span className="brand-accent">声见</span> · See My Voice
              </h1>
            </div>
          </header>

          <div className="content auth-content">
            <section className="sentence-card auth-hero" aria-labelledby="auth-title">
              <label className="eyebrow" htmlFor="username">
                {mode === "login" ? "欢迎回来" : "创建账户"}
              </label>
              <h2 id="auth-title">中文发音练习</h2>
              <p>账号和登录记录会写入 MongoDB。</p>
            </section>

            <div className="auth-tabs" role="tablist" aria-label="账户模式">
              <button
                type="button"
                className={mode === "login" ? "is-active" : ""}
                onClick={() => setMode("login")}
              >
                登录
              </button>
              <button
                type="button"
                className={mode === "register" ? "is-active" : ""}
                onClick={() => setMode("register")}
              >
                注册
              </button>
            </div>

            <form className="panel auth-form" onSubmit={submit}>
              {mode === "register" && (
                <label>
                  昵称
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    minLength={2}
                    required
                    autoComplete="name"
                  />
                </label>
              )}
              <label>
                用户名
                <input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  autoComplete="username"
                />
              </label>
              <label>
                密码
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={3}
                  required
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                />
              </label>
              {error && <p className="model-summary is-error">{error}</p>}
              <button className="record-button auth-submit" type="submit" disabled={busy}>
                <span className="record-state-dot"></span>
                {busy ? "正在连接…" : mode === "register" ? "创建账户" : "进入练习"}
              </button>
            </form>
          </div>
        </section>
      </main>
    </PhoneShell>
  );
}

interface PracticeAppProps {
  user: AuthUser;
  users: AuthUser[];
  onLogout: () => void;
}

function PracticeApp({ user, users, onLogout }: PracticeAppProps) {
  const [view, setView] = React.useState<View>("practice");
  const [targetText, setTargetText] = React.useState("我要吃饭");
  const [analysis, setAnalysis] = React.useState<PronunciationAnalysis | null>(null);
  const [attempts, setAttempts] = React.useState<PracticeAttempt[]>([]);
  const [recording, setRecording] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [selectedSyllableId, setSelectedSyllableId] = React.useState("fan");
  const mediaRecorder = React.useRef<MediaRecorder | null>(null);
  const chunks = React.useRef<Blob[]>([]);

  const activeAnalysis = analysis || fallbackAnalysis;
  const scores = activeAnalysis.scores;
  const syllables = activeAnalysis.syllables.length ? activeAnalysis.syllables : defaultSyllables;
  const selectedSyllable =
    syllables.find((item) => item.id === selectedSyllableId) || syllables[0] || defaultSyllables[0];
  const pinyin = pinyinByText[targetText] || (analysis ? activeAnalysis.heardText : "等待录音分析");

  async function startRecording() {
    setMessage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("当前浏览器不支持麦克风录音。");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunks.current.push(event.data);
    });
    recorder.addEventListener("stop", () => {
      stream.getTracks().forEach((track) => track.stop());
      void submitRecording(new Blob(chunks.current, { type: recorder.mimeType || "audio/webm" }));
    });
    mediaRecorder.current = recorder;
    recorder.start();
    setRecording(true);
  }

  function stopRecording() {
    if (!mediaRecorder.current || mediaRecorder.current.state === "inactive") return;
    mediaRecorder.current.stop();
    setRecording(false);
  }

  async function submitRecording(blob: Blob) {
    setBusy(true);
    try {
      const payload = await analyzePronunciation(targetText, blob);
      setAnalysis(payload);
      setSelectedSyllableId(payload.syllables[0]?.id || selectedSyllableId);
      setAttempts((current) => [
        {
          id: crypto.randomUUID(),
          text: targetText,
          createdAt: new Date().toISOString(),
          scores: payload.scores,
        },
        ...current,
      ]);
      setMessage("");
    } catch (error) {
      setAnalysis(fallbackAnalysis);
      setMessage(error instanceof Error ? error.message : "分析失败，请确认 API 是否配置。");
    } finally {
      setBusy(false);
    }
  }

  function playReference() {
    if (!("speechSynthesis" in window)) {
      setMessage("当前浏览器无法播放标准音。");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(targetText);
    utterance.lang = "zh-CN";
    utterance.rate = 0.78;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function resetPractice() {
    setAnalysis(null);
    setMessage("");
    setSelectedSyllableId("fan");
  }

  return (
    <PhoneShell>
      <main id="app" tabIndex={-1}>
        {view === "practice" && (
          <PracticeScreen
            user={user}
            users={users}
            targetText={targetText}
            pinyin={pinyin}
            message={message}
            busy={busy}
            recording={recording}
            analysis={activeAnalysis}
            scores={scores}
            syllables={syllables}
            onTextChange={setTargetText}
            onRecord={recording ? stopRecording : startRecording}
            onPlay={playReference}
            onReset={resetPractice}
            onLogout={onLogout}
            onSelectSyllable={(id) => {
              setSelectedSyllableId(id);
              setView("detail");
            }}
          />
        )}
        {view === "detail" && (
          <DetailScreen
            syllable={selectedSyllable}
            onBack={() => setView("practice")}
            onPlay={playReference}
          />
        )}
        {view === "progress" && <ProgressScreen attempts={attempts} />}
      </main>

      <nav className="app-nav" aria-label="主要页面">
        <button
          type="button"
          data-view="practice"
          aria-current={view === "practice" ? "page" : "false"}
          onClick={() => setView("practice")}
        >
          <span className="nav-index">01</span>
          <span>练习</span>
        </button>
        <button
          type="button"
          data-view="detail"
          aria-current={view === "detail" ? "page" : "false"}
          onClick={() => setView("detail")}
        >
          <span className="nav-index">02</span>
          <span>详情</span>
        </button>
        <button
          type="button"
          data-view="progress"
          aria-current={view === "progress" ? "page" : "false"}
          onClick={() => setView("progress")}
        >
          <span className="nav-index">03</span>
          <span>进度</span>
        </button>
      </nav>
    </PhoneShell>
  );
}

interface PracticeScreenProps {
  user: AuthUser;
  users: AuthUser[];
  targetText: string;
  pinyin: string;
  message: string;
  busy: boolean;
  recording: boolean;
  analysis: PronunciationAnalysis;
  scores: ScoreSet;
  syllables: SyllableFeedback[];
  onTextChange: (text: string) => void;
  onRecord: () => void;
  onPlay: () => void;
  onReset: () => void;
  onLogout: () => void;
  onSelectSyllable: (id: string) => void;
}

function PracticeScreen({
  user,
  users,
  targetText,
  pinyin,
  message,
  busy,
  recording,
  analysis,
  scores,
  syllables,
  onTextChange,
  onRecord,
  onPlay,
  onReset,
  onLogout,
  onSelectSyllable,
}: PracticeScreenProps) {
  const recordCopy = busy ? "正在分析…" : recording ? "正在录音… 点击完成" : "开始录音";

  return (
    <section className="screen" data-screen="practice">
      <header className="app-header">
        <div className="status-row">
          <span>9:41</span>
          <span>中文发音训练</span>
        </div>
        <div className="brand-row">
          <h1 className="brand">
            <span className="brand-accent">声见</span> · See My Voice
          </h1>
          <button className="header-link" type="button" onClick={onLogout}>
            <LogOut size={13} aria-hidden="true" />
            @{user.username}
          </button>
        </div>
      </header>

      <div className="content">
        <section className="sentence-card" aria-labelledby="sentence-title">
          <label className="eyebrow" htmlFor="target-text">
            自定义练习
          </label>
          <input
            className="sentence-input"
            id="target-text"
            value={targetText}
            onChange={(event) => onTextChange(event.target.value)}
            autoComplete="off"
            inputMode="text"
            lang="zh-CN"
          />
          <p className="pinyin">{pinyin}</p>
        </section>

        <section className="model-card level-good" aria-label="模型状态">
          <div>
            <span className="model-kicker">MongoDB + API</span>
            <strong>{busy ? "分析中" : "等待录音"}</strong>
            <span>系统听到：{analysis.heardText}</span>
          </div>
          <span className="status-pill">{users.length} 用户</span>
        </section>

        <p className={`model-summary ${message ? "is-error" : ""}`}>
          {message || analysis.summary}
        </p>

        <div className="record-row" aria-label="练习操作">
          <button
            className="record-button"
            type="button"
            data-state={recording ? "recording" : busy ? "complete" : "idle"}
            onClick={onRecord}
            disabled={busy || !targetText.trim()}
          >
            <span className="record-state-dot"></span>
            {recordCopy}
          </button>
          <button className="square-button" type="button" onClick={onPlay}>
            播放
          </button>
          <button className="square-button" type="button" disabled>
            回听
          </button>
          <button className="square-button" type="button" onClick={onReset}>
            重来
          </button>
        </div>

        <section aria-label="发音评分">
          <div className="score-grid">
            <Score label="综合" value={scores.overall} />
            <Score label="声调" value={scores.tone} />
            <Score label="清晰度" value={scores.clarity} />
            <Score label="节奏" value={scores.rhythm} />
          </div>
        </section>

        <section className="panel diagnosis-card" aria-label="拼音诊断">
          <span className="model-kicker">拼音诊断</span>
          <strong>{analysis.heardText === "等待 API" ? "录音后显示可能不准的音" : "分析结果"}</strong>
          <p>{analysis.summary}</p>
        </section>

        <section aria-labelledby="feedback-title">
          <p className="section-label" id="feedback-title">
            音节反馈
          </p>
          <div className="syllable-list">
            {syllables.map((item) => (
              <button
                className={`syllable-card level-${levelFromScore(item.score)}`}
                type="button"
                key={item.id}
                onClick={() => onSelectSyllable(item.id)}
              >
                <span>
                  <strong className="syllable-character">{item.character}</strong>
                  <span className="syllable-meta">
                    {item.pinyin} · {item.focus} · {Math.round(item.score)}分
                  </span>
                  <span className="syllable-feedback">{item.feedback}</span>
                </span>
                <span className="status-pill">{statusFromScore(item.score)}</span>
              </button>
            ))}
          </div>
        </section>

        <button className="hint-card" type="button">
          点击音节卡片查看嘴型示范、舌位提示、声调曲线和详细练习建议。
        </button>
      </div>
    </section>
  );
}

function DetailScreen({
  syllable,
  onBack,
  onPlay,
}: {
  syllable: SyllableFeedback;
  onBack: () => void;
  onPlay: () => void;
}) {
  return (
    <section className="screen" data-screen="detail">
      <header className="app-header detail-header">
        <div className="status-row">
          <span>9:41</span>
          <span>音节详情</span>
        </div>
        <div className="detail-title-row">
          <div>
            <button className="back-button" type="button" onClick={onBack}>
              返回练习
            </button>
            <h1 className="detail-heading">详细练习</h1>
            <p className="detail-subtitle">
              {syllable.pinyin} · {syllable.focus} · 当前 {Math.round(syllable.score)} 分
            </p>
          </div>
          <div className="detail-character" aria-hidden="true">
            {syllable.character}
          </div>
        </div>
      </header>

      <div className="content">
        <section aria-labelledby="mouth-title">
          <p className="section-label" id="mouth-title">
            嘴型与舌位对照
          </p>
          <div className="panel mouth-grid">
            <div className="mouth-panel">
              <p className="panel-title">自动嘴型示意</p>
              <div className="mouth-reference">
                <div className="mouth-animation shape-open">
                  <div className="face-outline">
                    <span className="eye left"></span>
                    <span className="eye right"></span>
                    <span className="nose"></span>
                    <span className="lip upper"></span>
                    <span className="mouth-hole"></span>
                    <span className="lip lower"></span>
                  </div>
                  <span className="mouth-target">
                    <strong>{syllable.character}</strong>
                    <span>{syllable.pinyin}</span>
                  </span>
                </div>
              </div>
              <p className="mouth-cue-line">先慢速读这个字，再和前后字连起来。</p>
            </div>
            <div className="mouth-panel">
              <p className="panel-title">我的镜像</p>
              <div className="mirror-area">
                <span>
                  <strong>摄像头预览</strong>保留原型位置，后续接入摄像头。
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="panel chart-card" aria-labelledby="tone-title">
          <div className="chart-title">
            <h2 id="tone-title">声调对比 · {syllable.focus}</h2>
            <div className="chart-legend" aria-hidden="true">
              <span className="legend-key">目标</span>
              <span className="legend-key current">你的</span>
            </div>
          </div>
          <div className="tone-placeholder" aria-label="目标声调与当前声调趋势对比图">
            <span></span>
            <span></span>
          </div>
          <p className="plot-note">{syllable.feedback}</p>
        </section>

        <section className="panel analysis-card" aria-label="本音节分析结论">
          <strong>本音节结论</strong>
          <span>{syllable.feedback}</span>
        </section>

        <button className="replay-button" type="button" onClick={onPlay}>
          重听标准发音
        </button>
      </div>
    </section>
  );
}

function ProgressScreen({ attempts }: { attempts: PracticeAttempt[] }) {
  const latest = attempts[0];
  const days = Array.from({ length: 14 }, (_, index) => ({
    label: `${index + 1}`,
    practiced: index >= 14 - Math.min(attempts.length, 14),
  }));

  return (
    <section className="screen" data-screen="progress">
      <header className="app-header progress-header">
        <div className="status-row">
          <span>9:41</span>
          <span>我的进步</span>
        </div>
        <div className="brand-row">
          <h1 className="brand">
            <span className="brand-accent">声见</span> · 我的进步
          </h1>
          <button className="period-button" type="button">
            最近练习
          </button>
        </div>
      </header>

      <div className="content">
        <section aria-labelledby="trend-title">
          <p className="section-label" id="trend-title">
            综合评分趋势
          </p>
          <div className="panel chart-card trend-wrap">
            <div className="progress-placeholder">
              <strong>{latest ? latest.scores.overall : 0}</strong>
              <span>{latest ? "最近一次成绩" : "还没有练习记录"}</span>
            </div>
          </div>
        </section>

        <section aria-labelledby="calendar-title">
          <p className="section-label" id="calendar-title">
            打卡日历
          </p>
          <div className="panel calendar-grid">
            {days.map((day) => (
              <span className={`calendar-day ${day.practiced ? "is-done" : ""}`} key={day.label}>
                <strong>{day.label}</strong>
                <span>{day.practiced ? "已练" : "未练"}</span>
              </span>
            ))}
          </div>
        </section>

        <section aria-labelledby="words-title">
          <p className="section-label" id="words-title">
            最近练习词汇
          </p>
          <div className="word-list">
            {attempts.length ? (
              attempts.slice(0, 6).map((attempt) => (
                <button
                  className={`word-row level-${levelFromScore(attempt.scores.overall)}`}
                  type="button"
                  key={attempt.id}
                >
                  <span className="word-top">
                    <strong className="word-name">{attempt.text}</strong>
                    <span className="word-status">
                      {Math.round(attempt.scores.overall)}分 ·{" "}
                      {statusFromScore(attempt.scores.overall)}
                    </span>
                  </span>
                  <span className="progress-track" aria-hidden="true">
                    <span className="progress-fill" style={{ width: `${attempt.scores.overall}%` }}></span>
                  </span>
                </button>
              ))
            ) : (
              <section className="panel diagnosis-card">
                <strong>还没有练习记录</strong>
                <p>完成一次录音分析后，这里会显示最近练过的词句。</p>
              </section>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="score-cell">
      <strong className="score-value">{Math.round(value)}</strong>
      <span className="score-name">{label}</span>
    </div>
  );
}

function levelFromScore(score: number) {
  if (score >= 82) return "good";
  if (score >= 68) return "warn";
  return "focus";
}

function statusFromScore(score: number) {
  if (score >= 82) return "清楚";
  if (score >= 68) return "继续练习";
  return "重点练习";
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
