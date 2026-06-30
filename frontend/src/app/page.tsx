"use client";

import React from "react";
import { Loader2, LogOut } from "lucide-react";
import {
  analyzePracticeAttempt,
  clearToken,
  createPracticeAttempt,
  fetchCurrentUser,
  fetchPracticeAttempts,
  fetchUsers,
  loginUser,
  registerUser,
  setToken,
} from "../api";
import type {
  AuthMode,
  AuthUser,
  PracticeAttempt,
  PronunciationAnalysis,
  ScoreSet,
  SyllableFeedback,
} from "../types";

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
    feedback: "After recording, tone and clarity feedback for this syllable will appear here.",
  },
  {
    id: "yao",
    character: "要",
    pinyin: "yào",
    score: 0,
    focus: "T4",
    feedback: "After you record, the system will estimate whether the phrase was understood.",
  },
  {
    id: "chi",
    character: "吃",
    pinyin: "chī",
    score: 0,
    focus: "T1",
    feedback: "Initial, final, and tone feedback will be shown separately here.",
  },
  {
    id: "fan",
    character: "饭",
    pinyin: "fàn",
    score: 0,
    focus: "T4",
    feedback: "Once the analysis API is connected, this will show more specific practice advice.",
  },
];

const fallbackAnalysis: PronunciationAnalysis = {
  heardText: "Waiting for API",
  summary:
    "Login and MongoDB logging are connected. The pronunciation analysis API is not configured yet, so prototype feedback is shown for now.",
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
  const [attempts, setAttempts] = React.useState<PracticeAttempt[]>([]);
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
    fetchPracticeAttempts()
      .then((payload) => setAttempts(payload.attempts))
      .catch(() => setAttempts([]));
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
    setAttempts([]);
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

  return <PracticeApp user={user} users={users} attempts={attempts} setAttempts={setAttempts} onLogout={handleLogout} />;
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
              <span>Account</span>
            </div>
            <div className="brand-row">
              <h1 className="brand">
                <span className="brand-accent">VoiceSight</span> · See My Voice
              </h1>
            </div>
          </header>

          <div className="content auth-content">
            <section className="sentence-card auth-hero" aria-labelledby="auth-title">
              <label className="eyebrow" htmlFor="username">
                {mode === "login" ? "Welcome back" : "Create account"}
              </label>
              <h2 id="auth-title">Mandarin pronunciation practice</h2>
              <p>Accounts and login events are saved to MongoDB.</p>
            </section>

            <div className="auth-tabs" role="tablist" aria-label="Account mode">
              <button
                type="button"
                className={mode === "login" ? "is-active" : ""}
                onClick={() => setMode("login")}
              >
                Log in
              </button>
              <button
                type="button"
                className={mode === "register" ? "is-active" : ""}
                onClick={() => setMode("register")}
              >
                Register
              </button>
            </div>

            <form className="panel auth-form" onSubmit={submit}>
              {mode === "register" && (
                <label>
                  Display name
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
                Username
                <input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  autoComplete="username"
                />
              </label>
              <label>
                Password
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
                {busy ? "Connecting..." : mode === "register" ? "Create account" : "Start practicing"}
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
  attempts: PracticeAttempt[];
  setAttempts: React.Dispatch<React.SetStateAction<PracticeAttempt[]>>;
  onLogout: () => void;
}

function PracticeApp({ user, users, attempts, setAttempts, onLogout }: PracticeAppProps) {
  const [view, setView] = React.useState<View>("practice");
  const [targetText, setTargetText] = React.useState("我要吃饭");
  const [analysis, setAnalysis] = React.useState<PronunciationAnalysis | null>(null);
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
  const pinyin = pinyinByText[targetText] || (analysis ? activeAnalysis.heardText : "Waiting for recording analysis");

  async function startRecording() {
    setMessage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("This browser does not support microphone recording.");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunks.current.push(event.data);
    });
    recorder.addEventListener("stop", () => {
      // Stop microphone tracks before handing the captured blob to the Express analysis endpoint.
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
    let createdAttemptId = "";
    try {
      const { attempt } = await createPracticeAttempt(targetText);
      createdAttemptId = attempt.id;
      setAttempts((current) => [attempt, ...current]);

      const payload = await analyzePracticeAttempt(attempt.id, blob);
      setAnalysis(payload.analysis);
      setSelectedSyllableId(payload.analysis.syllables[0]?.id || selectedSyllableId);
      setAttempts((current) => [
        payload.attempt,
        ...current.filter((item) => item.id !== payload.attempt.id),
      ]);
      setMessage("");
    } catch (error) {
      if (createdAttemptId) {
        fetchPracticeAttempts()
          .then((payload) => setAttempts(payload.attempts))
          .catch(() => undefined);
      }
      setAnalysis(fallbackAnalysis);
      setMessage(error instanceof Error ? error.message : "Analysis failed. Check whether the API is configured.");
    } finally {
      setBusy(false);
    }
  }

  function playReference() {
    if (!("speechSynthesis" in window)) {
      setMessage("This browser cannot play the reference pronunciation.");
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

      <nav className="app-nav" aria-label="Main pages">
        <button
          type="button"
          data-view="practice"
          aria-current={view === "practice" ? "page" : "false"}
          onClick={() => setView("practice")}
        >
          <span className="nav-index">01</span>
          <span>Practice</span>
        </button>
        <button
          type="button"
          data-view="detail"
          aria-current={view === "detail" ? "page" : "false"}
          onClick={() => setView("detail")}
        >
          <span className="nav-index">02</span>
          <span>Details</span>
        </button>
        <button
          type="button"
          data-view="progress"
          aria-current={view === "progress" ? "page" : "false"}
          onClick={() => setView("progress")}
        >
          <span className="nav-index">03</span>
          <span>Progress</span>
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
  const recordCopy = busy ? "Analyzing..." : recording ? "Recording... tap to finish" : "Start recording";

  return (
    <section className="screen" data-screen="practice">
      <header className="app-header">
        <div className="status-row">
          <span>9:41</span>
          <span>Mandarin pronunciation training</span>
        </div>
        <div className="brand-row">
          <h1 className="brand">
            <span className="brand-accent">VoiceSight</span> · See My Voice
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
            Custom practice
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

        <section className="model-card level-good" aria-label="Model status">
          <div>
            <span className="model-kicker">MongoDB + API</span>
            <strong>{busy ? "Analyzing" : "Waiting for recording"}</strong>
            <span>System heard: {analysis.heardText}</span>
          </div>
          <span className="status-pill">{users.length} users</span>
        </section>

        <p className={`model-summary ${message ? "is-error" : ""}`}>
          {message || analysis.summary}
        </p>

        <div className="record-row" aria-label="Practice actions">
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
            Play
          </button>
          <button className="square-button" type="button" disabled>
            Replay
          </button>
          <button className="square-button" type="button" onClick={onReset}>
            Reset
          </button>
        </div>

        <section aria-label="Pronunciation scores">
          <div className="score-grid">
            <Score label="Overall" value={scores.overall} />
            <Score label="Tone" value={scores.tone} />
            <Score label="Clarity" value={scores.clarity} />
            <Score label="Rhythm" value={scores.rhythm} />
          </div>
        </section>

        <section className="panel diagnosis-card" aria-label="Pinyin diagnosis">
          <span className="model-kicker">Pinyin diagnosis</span>
          <strong>{analysis.heardText === "Waiting for API" ? "Likely unclear sounds will appear after recording" : "Analysis result"}</strong>
          <p>{analysis.summary}</p>
        </section>

        <section aria-labelledby="feedback-title">
          <p className="section-label" id="feedback-title">
            Syllable feedback
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
                    {item.pinyin} · {item.focus} · {Math.round(item.score)} pts
                  </span>
                  <span className="syllable-feedback">{item.feedback}</span>
                </span>
                <span className="status-pill">{statusFromScore(item.score)}</span>
              </button>
            ))}
          </div>
        </section>

        <button className="hint-card" type="button">
          Tap a syllable card to view mouth-shape guidance, tongue-position cues, tone curves, and detailed practice advice.
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
          <span>Syllable details</span>
        </div>
        <div className="detail-title-row">
          <div>
            <button className="back-button" type="button" onClick={onBack}>
              Back to practice
            </button>
            <h1 className="detail-heading">Detailed practice</h1>
            <p className="detail-subtitle">
              {syllable.pinyin} · {syllable.focus} · current {Math.round(syllable.score)} pts
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
            Mouth shape and tongue position
          </p>
          <div className="panel mouth-grid">
            <div className="mouth-panel">
              <p className="panel-title">Automatic mouth-shape guide</p>
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
              <p className="mouth-cue-line">Say this character slowly first, then connect it with the surrounding words.</p>
            </div>
            <div className="mouth-panel">
              <p className="panel-title">My mirror</p>
              <div className="mirror-area">
                <span>
                  <strong>Camera preview</strong> placeholder for future camera support.
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="panel chart-card" aria-labelledby="tone-title">
          <div className="chart-title">
            <h2 id="tone-title">Tone comparison · {syllable.focus}</h2>
            <div className="chart-legend" aria-hidden="true">
              <span className="legend-key">Target</span>
              <span className="legend-key current">Yours</span>
            </div>
          </div>
          <div className="tone-placeholder" aria-label="Target and current tone contour comparison">
            <span></span>
            <span></span>
          </div>
          <p className="plot-note">{syllable.feedback}</p>
        </section>

        <section className="panel analysis-card" aria-label="Syllable analysis conclusion">
          <strong>Syllable conclusion</strong>
          <span>{syllable.feedback}</span>
        </section>

        <button className="replay-button" type="button" onClick={onPlay}>
          Replay reference pronunciation
        </button>
      </div>
    </section>
  );
}

function ProgressScreen({ attempts }: { attempts: PracticeAttempt[] }) {
  const latest = attempts[0];
  const latestScore = attemptScore(latest);
  const days = Array.from({ length: 14 }, (_, index) => ({
    label: `${index + 1}`,
    practiced: index >= 14 - Math.min(attempts.length, 14),
  }));

  return (
    <section className="screen" data-screen="progress">
      <header className="app-header progress-header">
        <div className="status-row">
          <span>9:41</span>
          <span>My progress</span>
        </div>
        <div className="brand-row">
          <h1 className="brand">
            <span className="brand-accent">VoiceSight</span> · My progress
          </h1>
          <button className="period-button" type="button">
            Recent practice
          </button>
        </div>
      </header>

      <div className="content">
        <section aria-labelledby="trend-title">
          <p className="section-label" id="trend-title">
            Overall score trend
          </p>
          <div className="panel chart-card trend-wrap">
            <div className="progress-placeholder">
              <strong>{latest ? latestScore : 0}</strong>
              <span>{latest ? "Latest score" : "No practice records yet"}</span>
            </div>
          </div>
        </section>

        <section aria-labelledby="calendar-title">
          <p className="section-label" id="calendar-title">
            Practice calendar
          </p>
          <div className="panel calendar-grid">
            {days.map((day) => (
              <span className={`calendar-day ${day.practiced ? "is-done" : ""}`} key={day.label}>
                <strong>{day.label}</strong>
                <span>{day.practiced ? "Done" : "Open"}</span>
              </span>
            ))}
          </div>
        </section>

        <section aria-labelledby="words-title">
          <p className="section-label" id="words-title">
            Recent practice words
          </p>
          <div className="word-list">
            {attempts.length ? (
              attempts.slice(0, 6).map((attempt) => {
                const score = attemptScore(attempt);
                return (
                  <button
                    className={`word-row level-${levelFromScore(score)}`}
                    type="button"
                    key={attempt.id}
                  >
                    <span className="word-top">
                      <strong className="word-name">{attempt.targetText || attempt.text}</strong>
                      <span className="word-status">
                        {attempt.status === "complete"
                          ? `${Math.round(score)} pts · ${statusFromScore(score)}`
                          : attempt.status === "failed"
                            ? "Analysis failed"
                            : "Analysis pending"}
                      </span>
                    </span>
                    <span className="progress-track" aria-hidden="true">
                      <span className="progress-fill" style={{ width: `${score}%` }}></span>
                    </span>
                  </button>
                );
              })
            ) : (
              <section className="panel diagnosis-card">
                <strong>No practice records yet</strong>
                <p>After one recording analysis, recently practiced words and phrases will appear here.</p>
              </section>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

function attemptScore(attempt?: PracticeAttempt): number {
  return attempt?.analysis?.scores.overall ?? attempt?.scores?.overall ?? 0;
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
  if (score >= 82) return "Clear";
  if (score >= 68) return "Keep practicing";
  return "Focus practice";
}

export default App;
