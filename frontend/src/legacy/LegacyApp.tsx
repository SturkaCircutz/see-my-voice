"use client";

import React from "react";
import {
  analyzePracticeAttempt,
  createPracticeAttempt,
  fetchPracticeAttempts,
  fetchUsers,
  fetchTasks,
  createTask,
  fetchChatThreads,
  fetchChatMessages,
  createChatThread,
  createChatMessage,
} from "../api";
import { AppNav } from "./AppNav";
import { LoadingShell, LoginScreen, ResponsiveShell } from "./AppShell";
import { AccountScreen } from "./AccountScreen";
import { ArticulationReference } from "./ArticulationReference";
import {
  defaultScores,
  defaultSyllables,
  entryAssessmentItems,
  pinyinByText,
  questionBankPackages,
  assessmentProfiles,
  studentQuickReplies,
  teacherQuickReplies,
  toneDrills,
  type AssessmentProfile,
  type ChatThread,
  type EntryAssessmentResult,
  type EntryAssessmentSession,
  type LegacySyllable,
  type Role,
  type StudentView,
  type StudentTaskPackage,
  type StudentTaskStep,
  type TaskSubmission,
  type TeacherStudent,
  type TeacherView,
} from "./data";
import type { AuthUser, ChatApiMessage, ChatApiThread, PracticeAttempt, PronunciationAnalysis, ScoreSet, TaskApiItem } from "../types";
import {
  assessmentResultFromAnalysis,
  buildAssessmentProfileFromSession,
  cleanEditorText,
  countFromEditor,
  customTeacherStep,
  defaultAssessmentSession,
  fallbackAssessmentResult,
  nextAssessmentSession,
  practiceItemsFromEditor,
  taskDraftFromSteps,
} from "./assessmentHelpers";
import {
  assessmentSectionClass,
  assessmentStepClass,
  assessmentStepNumberClass,
  fallbackAnalysis,
  primaryTeacherButtonClass,
  secondaryTeacherButtonClass,
  STORAGE_KEY,
  teacherFilterButtonBaseClass,
  teacherReviewHeadingClass,
  teacherReviewScoreClass,
  teacherScorePillClass,
  teacherScoreStripClass,
  teacherTagClass,
  teacherTagListClass,
  teacherTaskMetaClass,
  teacherTaskMetaItemClass,
  templateFieldClass,
  templateInputClass,
} from "./legacyAppConstants";
import type {
  LocalAccountState,
  RecordingContext,
  TaskProgressState,
  TaskStepProgress,
  TeacherStudentFilter,
  TeachingClipPlan,
} from "./legacyAppTypes";
import {
  asArray,
  isRole,
  isStudentView,
  isTeacherView,
  loadStoredLegacyState,
  progressWidthClass,
  todayDateKey,
} from "./legacyState";
import {
  assessmentProfileForStudent,
  assessmentTaskForStudent,
  buildTaskSubmission,
  commonTeacherFocusTags,
  recommendedTaskForStudent,
  stepFromQuestionBank,
  taskPracticeItemsForExercise,
  teacherDashboardNeedsAttention,
  teacherStudentAttentionReasons,
} from "./taskHelpers";
import {
  buildTeachingClipPlan,
  diagnosisDetailLines,
  diagnosisIssueSummary,
} from "./teachingClipHelpers";
import {
  progressCalendarDays,
  progressChartLabels,
  progressChartScores,
  practiceStreakDays,
  ProgressTrendChart,
} from "./progressHelpers";
import { Avatar, Score } from "./ui";
import {
  appHeaderBaseClass,
  brandAccentClass,
  brandClass,
  brandRowClass,
  cn,
  contentBaseClass,
  contentClass,
  diagnosisCardClass,
  diagnosisCopyClass,
  diagnosisTitleClass,
  focusStatusPillClass,
  modelCardClass,
  modelCardLabelClass,
  modelCardTitleClass,
  modelKickerClass,
  panelClass,
  panelFrameClass,
  practiceItemListClass,
  practiceItemPillClass,
  screenClass,
  sectionLabelClass,
  statusPillClass,
  statusRowClass,
  syllableStatusPillClass,
  toastClass,
  toastVisibleClass,
} from "./styles";
import {
  attemptScore,
  clipSourceFor,
  getFocusSyllable,
  latestCompleteAnalysis,
  normalizeSyllables,
  statusFromScore,
  statusTime,
  teacherViewLabel,
  threadTypeLabel,
  tonePoints,
  unreadCount,
} from "./utils";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function chatMessageTime(value: string) {
  // Backend timestamps become compact chat bubble times.
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return statusTime();
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function apiMessageToLegacy(message: ChatApiMessage): ChatThread["messages"][number] {
  // Convert backend chat messages into the legacy thread message shape.
  return {
    id: message.id,
    sender: message.sender || "User",
    senderId: message.senderId,
    body: message.body,
    time: chatMessageTime(message.createdAt),
    readBy: [message.senderId],
  };
}

function apiThreadToLegacy(thread: ChatApiThread, messages: ChatApiMessage[] = []): ChatThread {
  // Threads carry their messages so the legacy chat window can render offline.
  const legacyMessages = messages.map(apiMessageToLegacy);
  const lastMessage = legacyMessages.at(-1)?.body || thread.lastMessage || "";
  return {
    id: thread.id,
    title: thread.title,
    type: thread.type,
    unread: 0,
    lastMessage,
    memberIds: thread.memberIds,
    messages: legacyMessages,
  };
}

function apiTaskToPackage(task: TaskApiItem): StudentTaskPackage {
  // Backend tasks are normalized to the local practice-pack shape.
  return {
    id: task.id,
    title: task.title,
    goal: task.goal || task.targetText,
    status: task.status === "published" ? "Published" : task.status,
    suggestedDue: task.suggestedDue || "Due this week",
    requiredSubmissions: task.requiredSubmissions || 1,
    practiceText: task.practiceText || task.targetText,
    targetStudentId: task.studentId,
    focusTag: task.focusTag,
    teacherNote: task.teacherNote,
    reviewTags: task.reviewTags || [],
    exerciseSet: task.exerciseSet || [],
  };
}

function learnerAccountToTeacherStudent(account: AuthUser, index: number): TeacherStudent {
  // Registered learner accounts fill the teacher dashboard list.
  return {
    id: account.id,
    name: account.name || account.username,
    stage: "Account Learner",
    latestScore: 70,
    weeklyPracticeCount: 0,
    pendingSubmissions: 0,
    overdueTasks: 0,
    lastPracticeAt: account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleDateString() : "No practice yet",
    focusTags: ["Teacher assigned practice"],
    assessmentSummary: `Registered learner account: ${account.username}`,
    trend: index === 0 ? "Needs Attention" : "Stable",
  };
}

// Props keep the legacy UI connected to auth and practice state owned by the app shell.
interface LegacyAppProps {
  user: AuthUser | null;
  authReady: boolean;
  attempts: PracticeAttempt[];
  setAttempts: React.Dispatch<React.SetStateAction<PracticeAttempt[]>>;
  onLogin: (username: string, password: string, role: Exclude<Role, "guest">) => Promise<AuthUser> | AuthUser;
  onRegister: (username: string, password: string, role: Exclude<Role, "guest">) => Promise<AuthUser> | AuthUser;
  onLogout: () => void;
}

export function LegacyApp({
  user,
  authReady,
  attempts,
  setAttempts,
  onLogin,
  onRegister,
  onLogout,
}: LegacyAppProps) {
  // Navigation state controls which legacy screen is visible.
  const [role, setRole] = React.useState<Exclude<Role, "guest">>("student");
  const [studentView, setStudentView] = React.useState<StudentView>("practice");
  const [teacherView, setTeacherView] = React.useState<TeacherView>("home");
  const [teacherStudentFilter, setTeacherStudentFilter] = React.useState<TeacherStudentFilter>("all");

  // Practice state follows the current text, latest analysis, and recorder status.
  const [targetText, setTargetText] = React.useState("我要吃饭");
  const [analysis, setAnalysis] = React.useState<PronunciationAnalysis | null>(null);
  const [assessmentSession, setAssessmentSession] = React.useState<EntryAssessmentSession>(() => defaultAssessmentSession());
  const [localAssessmentProfiles, setLocalAssessmentProfiles] = React.useState<AssessmentProfile[]>(assessmentProfiles);
  const [recording, setRecording] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [toast, setToast] = React.useState("");
  const [selectedSyllableId, setSelectedSyllableId] = React.useState("fan");
  const [selectedStudentId, setSelectedStudentId] = React.useState("");
  const [taskEditorStudentId, setTaskEditorStudentId] = React.useState("");
  const [localTeacherStudents, setLocalTeacherStudents] = React.useState<TeacherStudent[]>([]);
  const [editingStudentSummaryId, setEditingStudentSummaryId] = React.useState("");
  const [selectedToneDrill, setSelectedToneDrill] = React.useState("3");
  const [practiceBackView, setPracticeBackView] = React.useState<"" | "toneDrill">("");

  // Teacher/task/chat state is local until each screen is fully backed by the API.
  const [publishedTasks, setPublishedTasks] = React.useState<StudentTaskPackage[]>([]);
  const [taskSubmissions, setTaskSubmissions] = React.useState<TaskSubmission[]>([]);
  const [taskStepProgress, setTaskStepProgress] = React.useState<TaskProgressState>({});
  const [selectedTaskId, setSelectedTaskId] = React.useState("");
  const [activeTaskExerciseId, setActiveTaskExerciseId] = React.useState("");
  const [activeTaskItemIndex, setActiveTaskItemIndex] = React.useState(0);
  const [selectedReviewId, setSelectedReviewId] = React.useState("");
  const [accountAvatar, setAccountAvatar] = React.useState("");
  const [localChatThreads, setLocalChatThreads] = React.useState<ChatThread[]>([]);
  const [chatUsers, setChatUsers] = React.useState<AuthUser[]>([]);
  const [chatBusy, setChatBusy] = React.useState(false);
  const [chatError, setChatError] = React.useState("");
  const [lastRecordingUrl, setLastRecordingUrl] = React.useState("");
  const [localAccount, setLocalAccount] = React.useState<LocalAccountState>({
    isLoggedIn: false,
    isRegistered: false,
    username: "",
    displayName: "Learner",
    password: "",
    avatarDataUrl: "",
    lastLoginAt: "",
    registeredAt: "",
    entryAssessmentCompleted: false,
  });
  const [teachingClipPlan, setTeachingClipPlan] = React.useState<TeachingClipPlan | null>(null);
  const [selectedClipSegmentIndex, setSelectedClipSegmentIndex] = React.useState(0);
  const [authMessage, setAuthMessage] = React.useState("");
  const [authBusy, setAuthBusy] = React.useState(false);

  // Recording and toast refs hold browser objects that should not trigger rerenders.
  const mediaRecorder = React.useRef<MediaRecorder | null>(null);
  const chunks = React.useRef<Blob[]>([]);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const recordingSignalRef = React.useRef({ peak: 0, hasSignal: false });
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingUrlRef = React.useRef("");
  const recordingContextRef = React.useRef<RecordingContext>("practice");
  const activeTaskRecordingRef = React.useRef<{ taskId: string; exerciseId: string; itemIndex: number } | null>(null);
  const [storageReady, setStorageReady] = React.useState(false);

  React.useEffect(() => {
    // Restore browser-saved UI state after hydration.
    const stored = loadStoredLegacyState();
    if (stored) {
      const storedRole: Exclude<Role, "guest"> | null = isRole(stored.role) && stored.role !== "guest"
        ? stored.role
        : isRole(stored.currentRole) && stored.currentRole !== "guest"
          ? stored.currentRole
          : null;
      const storedStudentView = isStudentView(stored.studentView)
        ? stored.studentView
        : isStudentView(stored.currentView)
          ? stored.currentView
          : null;

      if (storedRole) setRole(storedRole);
      if (storedStudentView) setStudentView(storedStudentView);
      if (isTeacherView(stored.teacherView)) setTeacherView(stored.teacherView);
      if (storedRole === "teacher" && stored.currentView === "account") setTeacherView("account");
      if (stored.teacherStudentFilter === "all" || stored.teacherStudentFilter === "attention") {
        setTeacherStudentFilter(stored.teacherStudentFilter);
      }
      if (typeof stored.targetText === "string") setTargetText(stored.targetText);
      if (stored.assessmentSession && typeof stored.assessmentSession === "object") {
        setAssessmentSession({ ...defaultAssessmentSession(), ...stored.assessmentSession });
      }
      setLocalAssessmentProfiles(asArray<AssessmentProfile>(stored.assessmentProfiles, assessmentProfiles));
      if (typeof stored.selectedSyllableId === "string") setSelectedSyllableId(stored.selectedSyllableId);
      if (typeof stored.selectedToneDrill === "string") setSelectedToneDrill(stored.selectedToneDrill);
      if (stored.practiceBackView === "" || stored.practiceBackView === "toneDrill") setPracticeBackView(stored.practiceBackView);
      setTaskSubmissions(asArray<TaskSubmission>(stored.taskSubmissions, []));
      if (stored.taskStepProgress && typeof stored.taskStepProgress === "object") {
        setTaskStepProgress(stored.taskStepProgress);
      }
      if (typeof stored.selectedTaskId === "string") setSelectedTaskId(stored.selectedTaskId);
      if (typeof stored.activeTaskExerciseId === "string") setActiveTaskExerciseId(stored.activeTaskExerciseId);
      if (Number.isFinite(Number(stored.activeTaskItemIndex))) setActiveTaskItemIndex(Number(stored.activeTaskItemIndex));
      if (typeof stored.selectedReviewId === "string") setSelectedReviewId(stored.selectedReviewId);
      if (stored.account && typeof stored.account === "object") {
        setLocalAccount((current) => ({ ...current, ...stored.account }));
        setAccountAvatar(stored.account.avatarDataUrl || "");
      }
    }
    setStorageReady(true);
  }, []);

  React.useEffect(() => {
    if (!storageReady) return;
    try {
      // Persist lightweight UI state so refreshes keep the current workspace.
      const account = { ...localAccount, avatarDataUrl: accountAvatar };
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          role,
          currentRole: role,
          studentView,
          currentView: role === "teacher" && teacherView !== "account" ? "teacher" : role === "teacher" ? "account" : studentView,
          teacherView,
          teacherStudentFilter,
          targetText,
          assessmentSession,
          assessmentProfiles: localAssessmentProfiles,
          selectedSyllableId,
          selectedToneDrill,
          practiceBackView,
          taskSubmissions,
          taskStepProgress,
          selectedTaskId,
          activeTaskExerciseId,
          activeTaskItemIndex,
          selectedReviewId,
          account,
        }),
      );
    } catch {
      // Storage can fail in private windows; the demo still works for this session.
    }
  }, [
    accountAvatar,
    activeTaskExerciseId,
    activeTaskItemIndex,
    assessmentSession,
    localAssessmentProfiles,
    localAccount,
    practiceBackView,
    role,
    selectedReviewId,
    selectedSyllableId,
    selectedTaskId,
    selectedToneDrill,
    studentView,
    storageReady,
    targetText,
    taskStepProgress,
    taskSubmissions,
    teacherStudentFilter,
    teacherView,
  ]);

  React.useEffect(() => {
    // Clean up timers and microphone capture if the legacy app unmounts.
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (mediaRecorder.current?.state === "recording") mediaRecorder.current.stop();
      audioContextRef.current?.close().catch(() => undefined);
      if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    };
  }, []);

  // Derived practice data falls back to the latest completed attempt or demo values.
  const activeAnalysis = analysis || latestCompleteAnalysis(attempts) || fallbackAnalysis;
  const scores = activeAnalysis.scores || defaultScores;
  const syllables = normalizeSyllables(activeAnalysis.syllables);
  const hasAssessmentProfile = localAssessmentProfiles.length > assessmentProfiles.length || assessmentSession.completed;
  const selectedSyllable =
    syllables.find((item) => item.id === selectedSyllableId) || syllables[0] || defaultSyllables[0];
  const pinyin = pinyinByText[targetText] || (analysis ? activeAnalysis.heardText : "Waiting for recording analysis");
  const streak = practiceStreakDays(attempts);
  const accountDisplayName = user?.name || localAccount.displayName || localAccount.username || (role === "teacher" ? "Teacher" : "Learner");

  React.useEffect(() => {
    if (!user) {
      setLocalChatThreads([]);
      setChatUsers([]);
      setChatError("");
      setPublishedTasks([]);
      setLocalTeacherStudents([]);
      setSelectedStudentId("");
      return;
    }

    let cancelled = false;
    // Load account-scoped chat, task, and learner lists from the backend.
    setChatBusy(true);
    setChatError("");
    Promise.all([fetchChatThreads(), fetchUsers(), fetchTasks(), fetchUsers("student")])
      .then(async ([threadPayload, userPayload, taskPayload, learnerPayload]) => {
        const threadsWithMessages = await Promise.all(
          threadPayload.threads.map(async (thread) => {
            const messagePayload = await fetchChatMessages(thread.id);
            return apiThreadToLegacy(thread, messagePayload.messages);
          }),
        );
        if (cancelled) return;
        const learnerAccounts = learnerPayload.users.map(learnerAccountToTeacherStudent);
        setLocalChatThreads(threadsWithMessages);
        setChatUsers(userPayload.users);
        setLocalTeacherStudents(learnerAccounts);
        setSelectedStudentId((current) =>
          learnerAccounts.some((student) => student.id === current) ? current : learnerAccounts[0]?.id || "",
        );
        setTaskEditorStudentId((current) =>
          learnerAccounts.some((student) => student.id === current) ? current : "",
        );
        setPublishedTasks(taskPayload.tasks.map(apiTaskToPackage));
      })
      .catch((error) => {
        if (cancelled) return;
        setLocalChatThreads([]);
        setChatUsers([]);
        setLocalTeacherStudents([]);
        setPublishedTasks([]);
        setSelectedStudentId("");
        setTaskEditorStudentId("");
        setChatError(error instanceof Error ? error.message : "Account data could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setChatBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Toasts are intentionally short-lived so action feedback does not cover the UI.
  function showToast(messageText: string) {
    setToast(messageText);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1800);
  }

  function loginLocalAccount(nextRole: Exclude<Role, "guest">, username: string, password: string) {
    // Mirror backend auth into local legacy account fields for existing screens.
    const dateKey = todayDateKey();
    const accountUsername = username.trim();
    const displayName = accountUsername || localAccount.displayName || "User";
    const isDifferentAccount = Boolean(localAccount.username && localAccount.username !== accountUsername);
    const avatarDataUrl = isDifferentAccount ? "" : accountAvatar;
    setAccountAvatar(avatarDataUrl);
    setLocalAccount({
      ...localAccount,
      isLoggedIn: true,
      isRegistered: true,
      username: accountUsername,
      displayName,
      password,
      avatarDataUrl,
      lastLoginAt: dateKey,
      registeredAt: isDifferentAccount ? dateKey : localAccount.registeredAt || dateKey,
    });
    setLocalChatThreads([]);
    setRole(nextRole);
    setPracticeBackView("");
    if (nextRole === "teacher") {
      setTeacherView("home");
    } else {
      setStudentView("practice");
    }
    showToast(nextRole === "teacher" ? "Logged in as teacher." : "Logged in as learner.");
  }

  function logoutLocalAccount() {
    // Reset visible role and local session state on logout.
    setLocalAccount((current) => ({ ...current, isLoggedIn: false, password: "" }));
    setRole("student");
    setStudentView("practice");
    setTeacherView("home");
    onLogout();
    showToast("Logged out.");
  }

  async function submitLoginGate(input: {
    role: Exclude<Role, "guest">;
    mode: "login" | "register";
    username: string;
    password: string;
  }) {
    // The login gate handles both register and login modes.
    setAuthMessage("");
    if (!input.username || !input.password) {
      setAuthMessage("Enter an account and password.");
      return;
    }
    setAuthBusy(true);
    try {
      if (input.mode === "register") {
        const authenticatedUser = await onRegister(input.username, input.password, input.role);
        loginLocalAccount(authenticatedUser.role, authenticatedUser.username, "");
      } else {
        const authenticatedUser = await onLogin(input.username, input.password, input.role);
        loginLocalAccount(authenticatedUser.role, authenticatedUser.username, "");
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Account could not be verified.");
    } finally {
      setAuthBusy(false);
    }
  }

  // Start microphone capture, then submit the collected blob when recording stops.
  async function startRecording(context: RecordingContext = "practice") {
    setMessage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("This browser does not support microphone recording.");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks.current = [];
    recordingSignalRef.current = { peak: 0, hasSignal: false };
    const recorder = new MediaRecorder(stream);
    mediaRecorder.current = recorder;
    let monitorSignal: (() => void) | null = null;
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextCtor();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      let animationFrame = 0;
      monitorSignal = () => {
        analyser.getFloatTimeDomainData(samples);
        let peak = 0;
        for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
        recordingSignalRef.current.peak = Math.max(recordingSignalRef.current.peak, peak);
        if (peak > 0.01) recordingSignalRef.current.hasSignal = true;
        if (mediaRecorder.current?.state === "recording") {
          if (monitorSignal) animationFrame = window.requestAnimationFrame(monitorSignal);
        }
      };
      audioContextRef.current = audioContext;
      stream.getTracks()[0]?.addEventListener("ended", () => {
        if (animationFrame) window.cancelAnimationFrame(animationFrame);
        audioContext.close().catch(() => undefined);
        if (audioContextRef.current === audioContext) audioContextRef.current = null;
      });
    } catch {
      // Some browsers restrict audio analysis; the backend still validates silent uploads.
    }
    // MediaRecorder delivers audio in chunks until the user taps finish.
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunks.current.push(event.data);
    });
    recorder.addEventListener("stop", () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks.current, { type: recorder.mimeType || "audio/webm" });
      audioContextRef.current?.close().catch(() => undefined);
      audioContextRef.current = null;
      if (!recordingSignalRef.current.hasSignal) {
        setMessage("No voice was detected. Check that your microphone is not muted, then record again.");
        showToast("No voice detected.");
        return;
      }
      if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
      const recordingUrl = URL.createObjectURL(blob);
      recordingUrlRef.current = recordingUrl;
      setLastRecordingUrl(recordingUrl);
      void submitRecording(blob, recordingContextRef.current);
    });
    recordingContextRef.current = context;
    recorder.start();
    monitorSignal?.();
    setRecording(true);
  }

  // Stopping the recorder triggers the submit handler registered in startRecording.
  function stopRecording() {
    if (!mediaRecorder.current || mediaRecorder.current.state === "inactive") return;
    mediaRecorder.current.stop();
    setRecording(false);
  }

  // Create an attempt first, then replace it with the analyzed result from the API.
  async function submitRecording(blob: Blob, context: RecordingContext = "practice") {
    setBusy(true);
    let createdAttemptId = "";
    try {
      if (!user) {
        setAnalysis(fallbackAnalysis);
        setTeachingClipPlan(null);
        setSelectedClipSegmentIndex(0);
        if (context === "entryAssessment") {
          completeAssessmentItem(fallbackAssessmentResult(assessmentSession));
          showToast("This item is recorded. Continue to the next item.");
        } else if (context === "task") {
          completeTaskRecording(fallbackAnalysis, recordingUrlRef.current);
          showToast("This step is saved. Continue to the next step.");
        } else {
          showToast("Analysis complete.");
        }
        setMessage("");
        return;
      }

      const { attempt } = await createPracticeAttempt(targetText);
      createdAttemptId = attempt.id;
      setAttempts((current) => [attempt, ...current]);

      const payload = await analyzePracticeAttempt(attempt.id, blob);
      setAnalysis(payload.analysis);
      setSelectedSyllableId(payload.analysis.syllables[0]?.id || selectedSyllableId);
      if (context === "entryAssessment") {
        completeAssessmentItem(assessmentResultFromAnalysis(assessmentSession, payload.analysis));
        setTeachingClipPlan(null);
        setSelectedClipSegmentIndex(0);
      } else if (context === "task") {
        completeTaskRecording(payload.analysis, recordingUrlRef.current);
        setTeachingClipPlan(null);
        setSelectedClipSegmentIndex(0);
      } else {
        setTeachingClipPlan(buildTeachingClipPlan(payload.analysis, normalizeSyllables(payload.analysis.syllables), targetText));
        setSelectedClipSegmentIndex(0);
      }
      setAttempts((current) => [
        payload.attempt,
        ...current.filter((item) => item.id !== payload.attempt.id),
      ]);
      setMessage("");
      showToast(context === "entryAssessment" ? "This item is recorded. Continue to the next item." : "Analysis complete.");
    } catch (error) {
      // If analysis failed after creation, refresh attempts so pending state stays honest.
      if (createdAttemptId) {
        fetchPracticeAttempts()
          .then((payload) => setAttempts(payload.attempts))
          .catch(() => undefined);
      }
      setAnalysis(fallbackAnalysis);
      setTeachingClipPlan(null);
      setSelectedClipSegmentIndex(0);
      if (context === "entryAssessment") {
        completeAssessmentItem(fallbackAssessmentResult(assessmentSession));
        showToast("This item is recorded. Continue to the next item.");
      } else if (context === "task") {
        completeTaskRecording(fallbackAnalysis, recordingUrlRef.current);
        showToast("This step is saved. Continue to the next step.");
      }
      setMessage(error instanceof Error ? error.message : "Analysis failed. Check whether the API is configured.");
    } finally {
      setBusy(false);
    }
  }

  // Browser speech synthesis provides the quick reference playback for the target text.
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

  function replayRecording() {
    // Replay uses the last object URL created from MediaRecorder output.
    if (!lastRecordingUrl) return;
    const audio = new Audio(lastRecordingUrl);
    audio.play().catch(() => setMessage("This browser could not replay the last recording."));
  }

  function openTeachingClip() {
    // Generate a clip plan from the latest analysis when one is not already stored.
    const plan = teachingClipPlan || buildTeachingClipPlan(activeAnalysis, syllables, targetText);
    if (!plan) {
      showToast("This analysis did not find an item that needs a clip.");
      return;
    }
    setTeachingClipPlan(plan);
    setSelectedClipSegmentIndex(0);
    setStudentView("teachingClip");
    showToast("Generated personalized teaching clip.");
  }

  function startEntryAssessment() {
    // Entry assessment takes over the target text prompt one item at a time.
    const nextSession = defaultAssessmentSession();
    setAssessmentSession({ ...nextSession, active: true });
    setTargetText(entryAssessmentItems[0]?.prompt || targetText);
    setAnalysis(null);
    setTeachingClipPlan(null);
    setSelectedClipSegmentIndex(0);
    setStudentView("entryAssessment");
    showToast("Entry assessment started. Record each item one by one.");
  }

  function completeAssessmentItem(result: EntryAssessmentResult | null) {
    // Save the current item result and prepare the next assessment prompt.
    if (!result) return;
    const nextSession = nextAssessmentSession(assessmentSession, result);
    const nextItem = entryAssessmentItems[nextSession.currentIndex];
    setAssessmentSession(nextSession);
    if (nextItem) setTargetText(nextItem.prompt);
  }

  function completeEntryAssessment() {
    // Turn completed assessment items into a teacher-facing profile.
    const student = localTeacherStudents.find((item) => item.id === selectedStudentId) || localTeacherStudents[0];
    if (!student) {
      showToast("No learner account is selected for this assessment.");
      return;
    }
    const nextProfile = buildAssessmentProfileFromSession(student, assessmentSession, localAssessmentProfiles.length);
    setLocalAssessmentProfiles((current) => [...current, nextProfile].slice(-40));
    setAssessmentSession((current) => ({ ...current, active: false, completed: true }));
    setStudentView("practice");
    showToast("Entry assessment profile generated. Waiting for teacher confirmation.");
  }

  // Reset only the current practice feedback; account and attempt history stay intact.
  function resetPractice() {
    setAnalysis(null);
    setMessage("");
    setPracticeBackView("");
    setSelectedSyllableId("fan");
    setTeachingClipPlan(null);
    setSelectedClipSegmentIndex(0);
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    recordingUrlRef.current = "";
    setLastRecordingUrl("");
    showToast("Practice reset.");
  }

  function openStudentTask(taskId: string) {
    // Opening a task starts at the task overview.
    setSelectedTaskId(taskId);
    setActiveTaskExerciseId("");
    setActiveTaskItemIndex(0);
    setStudentView("taskDetail");
  }

  function openTaskStep(taskId: string, exerciseId: string) {
    // Opening a step starts at the first practice item.
    setSelectedTaskId(taskId);
    setActiveTaskExerciseId(exerciseId);
    setActiveTaskItemIndex(0);
    setStudentView("taskDetail");
  }

  function returnToTaskSteps() {
    setActiveTaskExerciseId("");
    setActiveTaskItemIndex(0);
    setStudentView("taskDetail");
  }

  function openTeacherReview(submissionId: string) {
    // Teacher review editor is keyed by the selected submission id.
    setSelectedReviewId(submissionId);
    setTeacherView("reviewEditor");
  }

  function completeTaskRecording(analysisResult: PronunciationAnalysis, recordingUrl: string) {
    // Save analysis and recording data into the active task step.
    const context = activeTaskRecordingRef.current;
    if (!context) return;
    const task = publishedTasks.find((item) => item.id === context.taskId);
    const exercise = task?.exerciseSet.find((item) => item.id === context.exerciseId);
    if (!task || !exercise) return;
    const practiceItems = taskPracticeItemsForExercise(exercise, task);
    const target = practiceItems[context.itemIndex] || exercise.targetText || task.practiceText;
    const itemProgress = {
      targetText: target,
      recordingUrl,
      aiScores: analysisResult.scores || defaultScores,
      aiSummary: analysisResult.summary || `Saved "${target}". Continue to the next item.`,
      completed: true,
    };

    setTaskStepProgress((current) => {
      const currentTask = current[task.id] || {};
      const currentStep = currentTask[exercise.id];
      const items = [...(currentStep?.items || [])];
      items[context.itemIndex] = itemProgress;
      const completedItems = items.filter((item) => item?.completed).length;
      return {
        ...current,
        [task.id]: {
          ...currentTask,
          [exercise.id]: {
            completed: completedItems >= Math.max(practiceItems.length, 1),
            completedAt: statusTime(),
            exerciseId: exercise.id,
            exerciseTitle: exercise.title,
            targetText: target,
            recordingUrl,
            aiScores: analysisResult.scores || defaultScores,
            aiSummary: analysisResult.summary || `Saved "${exercise.title}". Continue to the next step.`,
            totalItems: practiceItems.length || 1,
            completedItems,
            items,
          },
        },
      };
    });
    setActiveTaskItemIndex((current) => Math.min(current + 1, Math.max(practiceItems.length - 1, 0)));
    showToast("This step is saved. Continue to the next step.");
  }

  function recordTaskStep(taskId: string, exerciseId: string, itemIndex: number) {
    // Task recording reuses the same microphone flow as free practice.
    if (recording) {
      stopRecording();
      return;
    }
    const task = publishedTasks.find((item) => item.id === taskId);
    const exercise = task?.exerciseSet.find((item) => item.id === exerciseId);
    if (!task || !exercise) return;
    const practiceItems = taskPracticeItemsForExercise(exercise, task);
    const target = practiceItems[itemIndex] || exercise.targetText || task.practiceText;
    if (!target.trim()) {
      showToast("This practice pack does not have a recordable target sentence yet.");
      return;
    }
    activeTaskRecordingRef.current = { taskId, exerciseId, itemIndex };
    setSelectedTaskId(taskId);
    setActiveTaskExerciseId(exerciseId);
    setActiveTaskItemIndex(itemIndex);
    setTargetText(target);
    void startRecording("task").then(() => showToast("Recording. Read the practice pack target sentence."));
  }

  function replayTaskRecording(taskId: string, exerciseId: string, itemIndex: number) {
    // Prefer the item recording, then step recording, then latest recording.
    const step = taskStepProgress[taskId]?.[exerciseId];
    const recordingUrl = step?.items?.[itemIndex]?.recordingUrl || step?.recordingUrl || lastRecordingUrl;
    if (!recordingUrl) return;
    const audio = new Audio(recordingUrl);
    audio.play().catch(() => setMessage("This browser could not replay the last recording."));
  }

  function submitTaskToTeacher(taskId: string) {
    // Build a submission only after every task step has progress.
    const task = publishedTasks.find((item) => item.id === taskId);
    if (!task) return;
    const submission = buildTaskSubmission(task, taskStepProgress[task.id] || {}, scores, taskSubmissions.length);
    if (!submission) {
      showToast("Complete all task steps first.");
      return;
    }
    setTaskSubmissions((current) => [
      ...current.filter((item) => item.taskId !== task.id),
      submission,
    ]);
    setSelectedReviewId(submission.id);
    showToast("Task submitted to teacher.");
  }

  function saveTeacherReview(submissionId: string, teacherScore: number, feedback: string) {
    // Store teacher feedback locally so the learner screen can show it.
    setTaskSubmissions((current) =>
      current.map((submission) =>
        submission.id === submissionId
          ? {
              ...submission,
              status: "Teacher Reviewed",
              reviewedAt: statusTime(),
              teacherScore,
              teacherFeedback: feedback || "This is improving. Keep practicing with the teacher's suggestion.",
            }
          : submission,
      ),
    );
    setTeacherView("reviews");
    showToast("Teacher feedback saved. The learner can see it.");
  }

  async function publishTask(task: StudentTaskPackage | null) {
    // Publishing sends the edited practice pack to the backend.
    if (!task) return;
    if (!task.targetStudentId) {
      showToast("Choose a learner account before publishing.");
      return;
    }
    try {
      const payload = await createTask({
        studentId: task.targetStudentId,
        title: task.title,
        goal: task.goal,
        targetText: task.practiceText,
        suggestedDue: task.suggestedDue,
        requiredSubmissions: task.requiredSubmissions,
        practiceText: task.practiceText,
        focusTag: task.focusTag,
        teacherNote: task.teacherNote,
        reviewTags: task.reviewTags || [],
        exerciseSet: task.exerciseSet,
      });
      const savedTask = apiTaskToPackage(payload.task);
      setPublishedTasks((current) => [
        ...current.filter((item) => item.targetStudentId !== savedTask.targetStudentId),
        savedTask,
      ]);
      setTeacherView("tasks");
      showToast("Practice task published to the learner account.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Task could not be published.");
    }
  }

  function confirmAssessmentProfile(profileId: string) {
    // Confirmation prevents the same assessment profile from being republished.
    setLocalAssessmentProfiles((current) =>
      current.map((profile) => profile.id === profileId ? { ...profile, status: "Teacher Confirmed" } : profile),
    );
  }

  function editStudentSummary(studentId: string) {
    setEditingStudentSummaryId(studentId);
    showToast("Stage note is ready to edit.");
  }

  function saveStudentSummary(studentId: string, summary: string) {
    const nextSummary = summary.trim();
    if (!nextSummary) return;
    setLocalTeacherStudents((current) =>
      current.map((student) => student.id === studentId ? { ...student, assessmentSummary: nextSummary } : student),
    );
    setEditingStudentSummaryId("");
    showToast("Learning profile note saved.");
  }

  function navigateTeacher(view: TeacherView, filter?: TeacherStudentFilter) {
    // Teacher navigation can also set the learner list filter.
    setTeacherView(view);
    if (filter) setTeacherStudentFilter(filter);
  }

  function navigateStudent(view: StudentView) {
    // Leaving practice clears the special back target unless practice is selected.
    if (view === "practice") setPracticeBackView("");
    setStudentView(view);
  }

  if (!authReady) {
    return <LoadingShell />;
  }

  if (!user) {
    return (
      <ResponsiveShell>
        <main
          id="app"
          className="h-full overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-color:#c7c1b8_transparent] [scrollbar-width:thin]"
          tabIndex={-1}
        >
          <LoginScreen
            role={role === "teacher" ? "teacher" : "student"}
            busy={authBusy}
            message={authMessage}
            onRoleChange={setRole}
            onSubmit={submitLoginGate}
          />
        </main>
      </ResponsiveShell>
    );
  }

  // Route the legacy single-page experience based on role and current tab.
  let screen: React.ReactNode;
  if (role === "teacher") {
    if (teacherView === "account") {
      screen = (
        <AccountScreen
          role={role}
          user={user}
          attempts={attempts}
          practiceStreak={streak}
          publishedTasks={publishedTasks}
          chatThreads={localChatThreads}
          avatarDataUrl={accountAvatar}
          localAccount={localAccount}
          onLogout={logoutLocalAccount}
          onAvatarChange={setAccountAvatar}
        />
      );
    } else if (teacherView === "chat") {
      screen = (
        <ChatScreen
          teacher
          user={user}
          chatUsers={chatUsers}
          chatBusy={chatBusy}
          chatError={chatError}
          accountDisplayName={accountDisplayName}
          threads={localChatThreads}
          onThreadsChange={setLocalChatThreads}
          avatarDataUrl={accountAvatar}
        />
      );
    } else if (teacherView === "reviewEditor") {
      screen = (
        <TeacherReviewEditorScreen
          submission={taskSubmissions.find((submission) => submission.id === selectedReviewId)}
          onBack={() => setTeacherView("reviews")}
          onSaveReview={saveTeacherReview}
        />
      );
    } else {
      screen = (
        <TeacherScreen
          view={teacherView}
          selectedStudentId={selectedStudentId}
          taskEditorStudentId={taskEditorStudentId}
          studentFilter={teacherStudentFilter}
          students={localTeacherStudents}
          editingStudentSummaryId={editingStudentSummaryId}
          publishedTasks={publishedTasks}
          taskSubmissions={taskSubmissions}
          onSelectStudent={setSelectedStudentId}
          onTaskEditorStudent={setTaskEditorStudentId}
          onStudentFilter={setTeacherStudentFilter}
          onTeacherView={navigateTeacher}
          onOpenReview={openTeacherReview}
          assessmentProfiles={localAssessmentProfiles}
          onPublishTask={publishTask}
          onConfirmAssessment={confirmAssessmentProfile}
          onEditStudentSummary={editStudentSummary}
          onSaveStudentSummary={saveStudentSummary}
        />
      );
    }
  } else if (studentView === "account") {
    screen = (
      <AccountScreen
        role={role}
        user={user}
        attempts={attempts}
        practiceStreak={streak}
        publishedTasks={publishedTasks}
        chatThreads={localChatThreads}
        avatarDataUrl={accountAvatar}
        localAccount={localAccount}
        onLogout={logoutLocalAccount}
        onAvatarChange={setAccountAvatar}
      />
    );
  } else if (studentView === "detail") {
    screen = (
      <DetailScreen
        syllable={selectedSyllable}
        onBack={() => navigateStudent("practice")}
        onPlay={playReference}
      />
    );
  } else if (studentView === "progress") {
    screen = (
      <ProgressScreen
        attempts={attempts}
        streak={streak}
        onBack={() => navigateStudent("practice")}
        onOpenToneDrill={(tone) => {
          setSelectedToneDrill(tone);
          setStudentView("toneDrill");
        }}
      />
    );
  } else if (studentView === "tasks") {
    screen = (
      <StudentTasksScreen
        tasks={publishedTasks}
        submissions={taskSubmissions}
        progress={taskStepProgress}
        streak={streak}
        onPractice={() => navigateStudent("practice")}
        onOpenTask={openStudentTask}
      />
    );
  } else if (studentView === "taskDetail") {
    screen = (
      <StudentTaskDetailScreen
        scores={scores}
        tasks={publishedTasks}
        submissions={taskSubmissions}
        progress={taskStepProgress}
        selectedTaskId={selectedTaskId}
        activeExerciseId={activeTaskExerciseId}
        activeItemIndex={activeTaskItemIndex}
        recording={recording}
        busy={busy}
        streak={streak}
        onBackToList={() => setStudentView("tasks")}
        onPractice={() => navigateStudent("practice")}
        onOpenStep={openTaskStep}
        onBackToSteps={returnToTaskSteps}
        onTaskItem={setActiveTaskItemIndex}
        onRecordStep={recordTaskStep}
        onReplayStep={replayTaskRecording}
        onSubmitTask={submitTaskToTeacher}
      />
    );
  } else if (studentView === "chat") {
    screen = (
      <ChatScreen
        teacher={false}
        user={user}
        chatUsers={chatUsers}
        chatBusy={chatBusy}
        chatError={chatError}
        accountDisplayName={accountDisplayName}
        threads={localChatThreads}
        onThreadsChange={setLocalChatThreads}
        avatarDataUrl={accountAvatar}
        streak={streak}
      />
    );
  } else if (studentView === "entryAssessment") {
    screen = (
      <EntryAssessmentScreen
        session={assessmentSession}
        recording={recording}
        busy={busy}
        streak={streak}
        onRecord={recording ? stopRecording : () => startRecording("entryAssessment")}
        onComplete={completeEntryAssessment}
      />
    );
  } else if (studentView === "toneDrill") {
    screen = (
      <ToneDrillScreen
        tone={selectedToneDrill}
        onBack={() => setStudentView("progress")}
        onChooseWord={(word) => {
          setTargetText(word);
          setPracticeBackView("toneDrill");
          setStudentView("practice");
        }}
      />
    );
  } else if (studentView === "teachingClip") {
    screen = (
      <TeachingClipScreen
        plan={teachingClipPlan}
        selectedIndex={selectedClipSegmentIndex}
        onBack={() => navigateStudent("practice")}
        onPrevious={() => setSelectedClipSegmentIndex((current) => Math.max(0, current - 1))}
        onNext={() => setSelectedClipSegmentIndex((current) => Math.min((teachingClipPlan?.segments.length || 1) - 1, current + 1))}
        onSetText={(text) => {
          setTargetText(text);
          setStudentView("practice");
        }}
      />
    );
  } else {
    screen = (
      <PracticeScreen
        targetText={targetText}
        pinyin={pinyin}
        message={message}
        busy={busy}
        recording={recording}
        analysis={activeAnalysis}
        scores={scores}
        syllables={syllables}
        streak={streak}
        showEntryAssessment={Boolean(user) && !hasAssessmentProfile}
        practiceBackView={practiceBackView}
        hasRecording={Boolean(lastRecordingUrl)}
        onTextChange={setTargetText}
        onBackToToneBank={() => setStudentView("toneDrill")}
        onRecord={recording ? stopRecording : startRecording}
        onPlay={playReference}
        onReplay={replayRecording}
        onReset={resetPractice}
        onOpenProgress={() => setStudentView("progress")}
        onOpenAssessment={startEntryAssessment}
        onOpenTeachingClip={openTeachingClip}
        onSelectSyllable={(id) => {
          setSelectedSyllableId(id);
          setStudentView("detail");
        }}
      />
    );
  }

  return (
    // The responsive shell remains constant while the routed screen and nav change inside it.
    <ResponsiveShell>
      <main
        id="app"
        className={cn(
          "h-full overflow-x-hidden overflow-y-auto overscroll-contain pb-[92px] [scrollbar-color:#c7c1b8_transparent] [scrollbar-width:thin] lg:pb-0",
          "lg:ml-[176px]",
        )}
        tabIndex={-1}
      >
        {screen}
      </main>
      <AppNav
        role={role}
        studentView={studentView}
        teacherView={teacherView}
        onStudentView={navigateStudent}
        onTeacherView={setTeacherView}
      />
      <div id="toast" className={cn(toastClass, toast && toastVisibleClass)} role="status" aria-live="polite">
        {toast}
      </div>
    </ResponsiveShell>
  );
}

// Header is reused by practice and progress screens with small mode differences.
function BrandHeader({
  progress = false,
  streak,
  onProgress,
}: {
  progress?: boolean;
  streak: number;
  onProgress?: () => void;
}) {
  return (
    <header className={cn(appHeaderBaseClass, progress ? "min-h-[132px] lg:min-h-[144px]" : "min-h-[144px] lg:min-h-[152px]")}>
      <div className="mb-4 flex items-center justify-between gap-4 text-xs font-bold tracking-[0.025em] text-[rgba(255,255,255,0.78)]">
        <span>{statusTime()}</span>
        <span className="text-right">Mandarin pronunciation practice</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-semibold tracking-normal lg:text-[34px]">
          <span className="font-(family-name:--serif) text-[var(--red)]">VoiceSight</span> · {progress ? "My Progress" : "See My Voice"}
        </h1>
        {progress ? (
          <button className="min-h-10 rounded-full border border-[rgba(255,255,255,0.2)] px-4 py-2 text-xs font-bold text-[rgba(255,255,255,0.78)] shadow-[0_8px_18px_rgba(0,0,0,0.12)] transition-[transform,background-color,border-color,box-shadow] duration-[180ms] hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.32)] hover:bg-[rgba(255,255,255,0.05)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.16)] active:translate-y-px" type="button">
            Recent Practice
          </button>
        ) : (
          <button className="min-h-10 rounded-full px-4 py-2 text-xs font-bold text-[rgba(255,255,255,0.78)] transition-[transform,background-color,color] duration-[180ms] hover:-translate-y-0.5 hover:bg-[rgba(255,255,255,0.05)] active:translate-y-px" type="button" onClick={onProgress}>
            Streak {streak} days · Progress
          </button>
        )}
      </div>
    </header>
  );
}

interface PracticeScreenProps {
  targetText: string;
  pinyin: string;
  message: string;
  busy: boolean;
  recording: boolean;
  analysis: PronunciationAnalysis;
  scores: ScoreSet;
  syllables: LegacySyllable[];
  streak: number;
  showEntryAssessment: boolean;
  practiceBackView: "" | "toneDrill";
  hasRecording: boolean;
  onTextChange: (text: string) => void;
  onBackToToneBank: () => void;
  onRecord: () => void;
  onPlay: () => void;
  onReplay: () => void;
  onReset: () => void;
  onOpenProgress: () => void;
  onOpenAssessment: () => void;
  onOpenTeachingClip: () => void;
  onSelectSyllable: (id: string) => void;
}

// Main learner workspace for recording, reviewing scores, and opening syllable detail.
function PracticeScreen({
  targetText,
  pinyin,
  message,
  busy,
  recording,
  analysis,
  scores,
  syllables,
  streak,
  showEntryAssessment,
  practiceBackView,
  hasRecording,
  onTextChange,
  onBackToToneBank,
  onRecord,
  onPlay,
  onReplay,
  onReset,
  onOpenProgress,
  onOpenAssessment,
  onOpenTeachingClip,
  onSelectSyllable,
}: PracticeScreenProps) {
  // Copy and focus data are derived from the current recording and analysis state.
  const hasAnalysis = analysis !== fallbackAnalysis;
  const hasOverallScore = Number.isFinite(scores.overall) && hasAnalysis;
  const recordCopy = busy
    ? "Analyzing..."
    : recording
      ? "Recording... Tap to Finish"
      : hasAnalysis
        ? "Analysis Complete · Practice Again"
        : "Start Recording";
  const statusCopy = busy ? "Analyzing Pronunciation" : analysis === fallbackAnalysis ? "Waiting for Recording" : "Analysis Complete";
  const focusSyllable = getFocusSyllable(syllables);
  const recordButtonColor = recording
    ? "animate-pulse bg-[var(--red)]"
    : busy || hasAnalysis
      ? "bg-[var(--green)]"
      : "bg-[var(--red)]";
  const recordState = recording ? "recording" : hasAnalysis || busy ? "complete" : "idle";

  return (
    <section className={screenClass} data-screen="practice">
      <BrandHeader streak={streak} onProgress={onOpenProgress} />
      <div className={cn(contentClass, "lg:grid-cols-[minmax(330px,0.95fr)_minmax(360px,1.05fr)] lg:items-start")}>
        {showEntryAssessment && (
          <section className={cn(panelClass, "grid gap-[11px] border-[rgba(239,190,98,0.42)] bg-[#fffaf0] lg:col-span-2 lg:grid-cols-[1fr_auto] lg:items-center")} aria-labelledby="assessment-entry-title">
            <div className="grid grid-cols-[1fr_auto] items-start gap-2.5">
              <div>
                <span className={modelKickerClass}>Entry Assessment</span>
                <h2 className="mt-0 mb-[5px] text-base" id="assessment-entry-title">Create Your Starting Pronunciation Profile</h2>
                <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">Complete a short set of initial, final, tone, and sentence checks. The teacher can then confirm your first practice plan.</p>
              </div>
              <span className={statusPillClass}>Ready</span>
            </div>
            <button className="w-full rounded-[13px] bg-[var(--amber)] text-[13px] font-extrabold text-white" type="button" onClick={onOpenAssessment}>
              Start Entry Assessment
            </button>
          </section>
        )}

        {practiceBackView === "toneDrill" && (
          <button className="justify-self-start rounded-full border border-[rgba(53,84,110,0.12)] bg-[var(--surface)] px-3 py-2 text-xs font-extrabold text-[var(--navy)] lg:col-span-2" type="button" onClick={onBackToToneBank}>
            Back to Tone Bank
          </button>
        )}

        <section className="rounded-[20px] bg-[var(--navy)] px-4 pt-5 pb-[18px] text-center text-white lg:grid lg:min-h-[245px] lg:content-center lg:px-8 lg:py-8" aria-labelledby="sentence-title">
          <label className="mb-2.5 block text-xs text-[rgba(255,255,255,0.45)]" htmlFor="target-text">
            Custom Practice
          </label>
          <input
            className="block w-full border-0 bg-transparent text-center font-(family-name:--serif) text-[37px] leading-[1.25] font-normal tracking-[0.08em] text-white placeholder:text-[rgba(255,255,255,0.34)] focus:outline-0 lg:text-[56px]"
            id="target-text"
            value={targetText}
            onChange={(event) => onTextChange(event.target.value)}
            autoComplete="off"
            inputMode="text"
            lang="zh-CN"
          />
          <p className="mt-2 mb-0 text-sm tracking-[0.22em] text-[rgba(255,255,255,0.48)]">{pinyin}</p>
        </section>

        <section className={cn(modelCardClass, message ? "border-[rgba(207,75,49,0.24)] bg-[var(--red-soft)]" : "border-[rgba(32,154,120,0.26)] bg-[var(--green-soft)]")} aria-label="Pronunciation feedback status">
          <div>
            <span className={modelKickerClass}>Pronunciation Feedback</span>
            <strong className={modelCardTitleClass}>{statusCopy}</strong>
            <span className={modelCardLabelClass}>{message || `System heard: ${analysis.heardText}`}</span>
          </div>
          <span className={message ? focusStatusPillClass : statusPillClass}>{analysis === fallbackAnalysis ? "Ready" : "Complete"}</span>
        </section>

        <div className="grid grid-cols-[1fr_52px_52px_52px] gap-1.5" aria-label="Practice actions">
          <button
            className={`relative rounded-[14px] px-[18px] text-left font-bold text-white transition-[transform,background-color,border-color] duration-150 active:translate-y-px active:scale-[0.99] ${recordButtonColor}`}
            type="button"
            data-state={recordState}
            onClick={onRecord}
            disabled={busy || !targetText.trim()}
          >
            <span className={`mr-2 inline-block size-2 rounded-full border-2 border-current align-[1px] ${recording ? "bg-current" : ""}`}></span>
            {recordCopy}
          </button>
          <button className="rounded-[14px] border border-[#e6e1d8] bg-[#efede7] px-[5px] text-xs font-bold transition-[transform,background-color,border-color] duration-150 active:translate-y-px active:scale-[0.99]" type="button" onClick={onPlay}>
            Play
          </button>
          <button className="rounded-[14px] border border-[#e6e1d8] bg-[#efede7] px-[5px] text-xs font-bold transition-[transform,background-color,border-color] duration-150 active:translate-y-px active:scale-[0.99]" type="button" onClick={onReplay} disabled={!hasRecording}>
            Replay
          </button>
          <button className="rounded-[14px] border border-[#e6e1d8] bg-[#efede7] px-[5px] text-xs font-bold transition-[transform,background-color,border-color] duration-150 active:translate-y-px active:scale-[0.99]" type="button" onClick={onReset}>
            Reset
          </button>
        </div>

        <section className="lg:self-stretch" aria-label="Pronunciation score">
          <div className="mb-[7px] grid grid-cols-[1fr_auto] items-end gap-3">
            <div>
              <span className={modelKickerClass}>Current Score</span>
              <strong className="mt-0.5 block text-lg">{hasOverallScore ? `${Math.round(scores.overall)} ` : "Generated After Recording"}</strong>
            </div>
          <span className="block text-[11px] font-bold text-[var(--muted)]">{hasAnalysis && focusSyllable ? `Focus: ${focusSyllable.character}` : "Tone · Clarity · Rhythm"}</span>
          </div>
          <div className="grid grid-cols-4 overflow-hidden rounded-[15px] border border-[var(--line)] bg-[var(--surface)] lg:h-[112px]">
            <Score label="Overall" value={scores.overall} />
            <Score label="Tone" value={scores.tone} />
            <Score label="Clarity" value={scores.clarity} />
            <Score label="Rhythm" value={scores.rhythm} />
          </div>
        </section>

        <PinyinDiagnosisCard
          analysis={analysis}
          hasAnalysis={hasAnalysis}
          message={message}
          syllables={syllables}
          onTextChange={onTextChange}
          onOpenTeachingClip={onOpenTeachingClip}
        />

        <section aria-labelledby="feedback-title">
          <p className={sectionLabelClass} id="feedback-title">
            Syllable Feedback
          </p>
          <div className="grid gap-2 lg:grid-cols-2">
            {syllables.map((item) => (
              <button
                className={`grid w-full grid-cols-[1fr_auto] rounded-[14px] border bg-[var(--surface)] px-3.5 py-3 text-left transition-transform duration-150 active:translate-y-px active:scale-[0.99] ${
                  item.level === "focus"
                    ? "border-[#ef8b73]"
                    : item.level === "warn"
                      ? "border-[#e8b34e]"
                      : "border-[var(--green)]"
                }`}
                type="button"
                key={item.id}
                onClick={() => onSelectSyllable(item.id)}
              >
                <span>
                  <strong className="block font-(family-name:--serif) text-[30px] leading-none">{item.character}</strong>
                  <span className="mt-[5px] block text-[11px] text-[var(--muted)]">
                    {item.pinyin} · {item.tone} · {Math.round(item.score)}
                  </span>
                  <span className="mt-1.5 block text-[11px] text-[var(--muted)]">{item.feedback}</span>
                </span>
                <span className={syllableStatusPillClass(item.level)}>{item.status}</span>
              </button>
            ))}
          </div>
        </section>

        <button className="rounded-[14px] border border-[#efbe62] bg-[#fffaf0] p-3.5 text-xs leading-[1.6] text-[#8f6316] lg:col-span-2" type="button">
          Tap a syllable card to view mouth-shape guidance, tongue-position cues, tone curves, and detailed practice advice.
        </button>
      </div>
    </section>
  );
}

function PinyinDiagnosisCard({
  analysis,
  hasAnalysis,
  message,
  syllables,
  onTextChange,
  onOpenTeachingClip,
}: {
  analysis: PronunciationAnalysis;
  hasAnalysis: boolean;
  message: string;
  syllables: LegacySyllable[];
  onTextChange: (text: string) => void;
  onOpenTeachingClip: () => void;
}) {
  const diagnosis = analysis.pinyinDiagnosis;
  const issues = diagnosis?.issues || [];

  if (!diagnosis) {
    return (
      <section className={diagnosisCardClass} aria-label="Pinyin Diagnosis">
        <span className={modelKickerClass}>Pinyin Diagnosis</span>
        <strong className={diagnosisTitleClass}>{hasAnalysis ? "Analysis Result" : "Possible pronunciation issues appear after recording"}</strong>
        <p className={diagnosisCopyClass}>
          {message || (hasAnalysis
            ? analysis.summary
            : "The system uses your recording to identify initials, finals, or tones that may affect intelligibility.")}
        </p>
      </section>
    );
  }

  return (
    <section className={diagnosisCardClass} aria-label="Pinyin Diagnosis">
      <span className={modelKickerClass}>Pinyin Diagnosis</span>
      <strong className={diagnosisTitleClass}>{issues.length ? `Found ${issues.length} sound(s) to review` : diagnosis.summary}</strong>
      <p className={diagnosisCopyClass}>
        Target: {(diagnosis.targetPinyin || []).join(" ")}　Heard: {(diagnosis.heardPinyin || []).join(" ") || "Not heard clearly"}
      </p>
      {issues.length ? (
        <>
          <button className="rounded-[14px] border border-[rgba(32,154,120,0.22)] bg-[var(--green-soft)] px-3 py-2.5 text-xs font-extrabold text-[var(--green)]" type="button" onClick={onOpenTeachingClip}>
            Generate Personalized Teaching Clip
          </button>
          <div className="grid gap-2">
            {issues.map((issue, index) => {
              const summary = diagnosisIssueSummary(issue, syllables);
              const detailLines = diagnosisDetailLines(issue);
              return (
                <details className="rounded-[14px] border border-[var(--line)] bg-[#fbfaf7] p-3" key={`${issue.index ?? index}-${issue.type || "issue"}`}>
                  <summary className="grid cursor-pointer grid-cols-[auto_1fr] items-center gap-2 text-left">
                    <span className="font-(family-name:--serif) text-[30px] leading-none text-[var(--red)]">{summary.character}</span>
                    <span>
                      <strong className="block text-[13px] text-[var(--ink)]">{summary.shortIssue}</strong>
                      <small className="block text-[11px] text-[var(--muted)]">{summary.label}</small>
                    </span>
                  </summary>
                  <div className="mt-2 grid gap-2">
                    {detailLines.map((line) => (
                      <p className="m-0 text-[11px] leading-[1.55] text-[var(--muted)]" key={line}>{line}</p>
                    ))}
                    {issue.practice?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {issue.practice.map((word) => (
                          <button className={practiceItemPillClass} type="button" key={word} onClick={() => onTextChange(word)}>
                            {word}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </details>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}

function PronunciationVideo({
  src,
  poster,
  label,
}: {
  src: string;
  poster: string;
  label: string;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setPlaying(false);
    setFailed(false);
  }, [src]);

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video || failed) return;
    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch {
      setFailed(true);
      setPlaying(false);
    }
  }

  return (
    <div className="relative w-full max-w-full overflow-hidden rounded-[14px] bg-[#111]">
      <video
        className="block aspect-video max-h-[min(62vh,520px)] w-full max-w-full bg-[#111] object-contain"
        ref={videoRef}
        controls
        playsInline
        preload="metadata"
        poster={poster}
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          setFailed(true);
          setPlaying(false);
        }}
      >
        <source src={src} type="video/mp4" />
      </video>
      {!playing && !failed ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <button
            className="pointer-events-auto grid size-14 place-items-center rounded-full bg-[rgba(207,75,49,0.92)] shadow-[0_14px_34px_rgba(25,26,47,0.26)] transition-[transform,box-shadow,background-color] duration-[180ms] hover:scale-[1.04] hover:bg-[var(--red)] active:scale-[0.98]"
            type="button"
            onClick={togglePlayback}
            aria-label={`Play ${label}`}
          >
            <span className="ml-1 block h-0 w-0 border-y-[10px] border-y-transparent border-l-[16px] border-l-white" aria-hidden="true"></span>
          </button>
        </div>
      ) : null}
      {failed ? (
        <p className="absolute right-3 bottom-3 left-3 m-0 rounded-xl bg-[rgba(25,26,47,0.9)] px-3 py-2 text-xs leading-[1.5] text-white">
          This browser could not play this pronunciation clip.
        </p>
      ) : null}
    </div>
  );
}

// Syllable detail screen combines reference media, visual tone curves, and coaching text.
function DetailScreen({
  syllable,
  onBack,
  onPlay,
}: {
  syllable: LegacySyllable;
  onBack: () => void;
  onPlay: () => void;
}) {
  // Tone curves are converted to SVG points before render.
  const targetPoints = tonePoints(syllable.targetTone);
  const currentPoints = tonePoints(syllable.currentTone);

  return (
    <section className={screenClass} data-screen="detail">
      <header className={cn(appHeaderBaseClass, "min-h-[174px]")}>
        <div className={statusRowClass}>
          <span>{statusTime()}</span>
          <span>Syllable Detail</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <button className="min-h-9 py-[5px] pr-0 pl-3 text-xs text-[rgba(255,255,255,0.72)]" type="button" onClick={onBack}>
              Back to Practice
            </button>
            <h1 className="m-0 text-xl text-white">Detailed Practice</h1>
            <p className="mt-[5px] mb-0 text-xs text-[rgba(255,255,255,0.48)]">
              {syllable.pinyin} · {syllable.tone} · Current {Math.round(syllable.score)}
            </p>
          </div>
          <div className="font-(family-name:--serif) text-[64px] leading-none text-[var(--red)]" aria-hidden="true">
            {syllable.character}
          </div>
        </div>
      </header>

      <div className={contentClass}>
        <section className={cn(panelClass, "grid gap-2 border-[rgba(31,111,97,0.24)] shadow-[0_12px_28px_rgba(31,111,97,0.08)]")} aria-labelledby="detail-teaching-video-title">
          <span className={modelKickerClass}>Teaching Video</span>
          <h2 className="m-0 text-lg" id="detail-teaching-video-title">Teaching Video</h2>
          <p className="m-0 text-xs leading-[1.55] text-[var(--muted)]">{syllable.character} Personalized Teaching Video</p>
          <div className="flex gap-2 overflow-x-auto px-0 pt-0.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Choose a character in the sentence">
            {defaultSyllables.map((item) => (
              <button
                type="button"
                className={`grid min-h-[54px] min-w-14 flex-none place-items-center gap-0.5 rounded-2xl border px-3 py-1.5 ${
                  item.id === syllable.id
                    ? "border-[rgba(32,154,120,0.45)] bg-[var(--green-soft)] text-[var(--green)]"
                    : "border-[var(--line)] bg-white text-[var(--ink)]"
                }`}
                aria-pressed={item.id === syllable.id}
                key={item.id}
              >
                <strong className="font-(family-name:--serif) text-[22px] leading-none">{item.character}</strong>
                <span className={`text-[10px] font-extrabold leading-none ${item.id === syllable.id ? "text-[var(--green)]" : "text-[var(--muted)]"}`}>{item.pinyin}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[11px] font-bold text-[var(--muted)]">
            <span>1 / 1</span>
          </div>
          <div className="h-[7px] overflow-hidden rounded-full bg-[#eceae6]" aria-hidden="true">
            <span className="block h-full w-full rounded-[inherit] bg-[var(--red)]"></span>
          </div>
          <h3 className="m-0 text-[15px]">{syllable.character} / {syllable.pinyin}</h3>
          <p className="m-0 text-xs leading-[1.55] text-[var(--muted)]">{syllable.mouthCue}</p>
          <div className="grid gap-2.5">
            <div className="overflow-hidden rounded-[14px] border border-[var(--line)] bg-[#fffaf4]">
              <p className="m-0 px-3 py-[11px] text-[11px] font-semibold text-[var(--muted)]">Pronunciation Demo</p>
              <PronunciationVideo
                src={clipSourceFor(syllable)}
                poster="/assets/mouth-reference.png"
                label={`${syllable.character} pronunciation demo`}
              />
              <p className="m-0 text-xs leading-[1.55] text-[var(--muted)]">{syllable.tongueCue}</p>
            </div>
          </div>
        </section>

        <ArticulationReference syllable={syllable} />

        <section className={panelClass} aria-labelledby="tone-title">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="m-0 text-xs font-semibold text-[var(--muted)]" id="tone-title">Tone Comparison · Tone {syllable.tone.replace("T", "")}</h2>
            <div className="flex gap-2.5 text-[10px] text-[var(--muted)]" aria-hidden="true">
              <span className="before:mr-1 before:inline-block before:h-[3px] before:w-3.5 before:rounded-full before:bg-[var(--green)] before:align-[3px] before:content-['']">Target</span>
              <span className="before:mr-1 before:inline-block before:h-[3px] before:w-3.5 before:rounded-full before:bg-[var(--red)] before:align-[3px] before:content-['']">Yours</span>
            </div>
          </div>
          <svg className="block h-[124px] w-full" viewBox="0 0 320 124" role="img" aria-label="Target and current tone contour comparison">
            <polyline points={targetPoints} fill="none" stroke="#209a78" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={currentPoints} fill="none" stroke="#cf4b31" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </section>

        <section className={cn(panelClass, "grid gap-[5px]")} aria-label="Syllable Analysis">
          <strong className="text-[13px]">Syllable Summary</strong>
          <span className="text-xs leading-[1.55] text-[var(--muted)]">{syllable.feedback}</span>
          <span className="border-t border-[var(--line)] pt-[7px] text-xs leading-[1.55] text-[var(--muted)]">{syllable.toneCue}</span>
        </section>

        <button className="w-full rounded-[13px] bg-[var(--navy)] font-bold text-white" type="button" onClick={onPlay}>
          Replay Standard Pronunciation
        </button>
      </div>
    </section>
  );
}

// Progress view summarizes recent attempts without changing practice data.
function ProgressScreen({
  attempts,
  streak,
  onBack,
  onOpenToneDrill,
}: {
  attempts: PracticeAttempt[];
  streak: number;
  onBack: () => void;
  onOpenToneDrill: (tone: string) => void;
}) {
  const chartScores = progressChartScores(attempts);
  const chartLabels = progressChartLabels(attempts, chartScores.length);
  const latestScore = [...chartScores].reverse().find((score) => score > 0) || 0;
  const days = progressCalendarDays(attempts);

  return (
    <section className={screenClass} data-screen="progress">
      <BrandHeader progress streak={streak} />
      <div className={cn(contentClass, "lg:grid-cols-[minmax(420px,1.2fr)_minmax(320px,0.8fr)] lg:items-start")}>
        <section className="lg:col-span-2" aria-labelledby="trend-title">
          <p className={sectionLabelClass} id="trend-title">
            Overall Score Trend
          </p>
          <div className={cn(panelClass, "smv-fade-in p-4 pt-3 transition-[transform,box-shadow] duration-[180ms] hover:-translate-y-0.5 hover:shadow-[0_18px_52px_rgba(25,26,47,0.08)] lg:p-6 lg:pt-5")}>
            <ProgressTrendChart scores={chartScores} labels={chartLabels} latestScore={latestScore} />
          </div>
        </section>

        <section aria-labelledby="calendar-title">
          <p className={sectionLabelClass} id="calendar-title">
            Practice Calendar
          </p>
          <div className={cn(panelClass, "smv-fade-in grid grid-cols-7 gap-2 p-3 lg:gap-2 lg:p-4")}>
            {days.map((day) => {
              const stateLabel = day.today ? "Today" : day.practiced ? "Practiced" : "No Practice";
              return (
                <button
                  className={`grid min-h-[64px] content-center gap-1 rounded-[14px] border px-1.5 py-2 text-center transition-[transform,box-shadow,border-color,background-color] duration-[180ms] hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(25,26,47,0.08)] active:translate-y-px lg:min-h-[76px] ${
                    day.today
                      ? "border-[rgba(207,75,49,0.42)] bg-[var(--red-soft)] shadow-[inset_0_0_0_2px_rgba(207,75,49,0.14)]"
                      : day.practiced
                        ? "border-[rgba(32,154,120,0.24)] bg-[var(--green-soft)]"
                        : "border-[rgba(222,216,205,0.54)] bg-[#fbfaf7]"
                  }`}
                  type="button"
                  key={day.date}
                  aria-pressed={day.today}
                >
                  <strong className="text-[10px] leading-none text-[var(--ink)]">{day.label}</strong>
                  <span className={`text-[9px] leading-[1.15] ${day.today ? "font-extrabold text-[var(--red)]" : "text-[var(--muted)]"}`}>{stateLabel}</span>
                  {day.today ? <span className="mx-auto mt-0.5 block size-1.5 rounded-full bg-[var(--red)]" aria-hidden="true"></span> : null}
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="words-title">
          <p className={sectionLabelClass} id="words-title">
            Daily Practice Words
          </p>
          <div className="grid gap-2">
            {attempts.length ? (
              attempts.slice(0, 6).map((attempt) => {
                const score = attemptScore(attempt);
                return (
                  <button className="smv-fade-in w-full rounded-[16px] border border-[rgba(53,84,110,0.1)] bg-[var(--surface)] px-4 py-3.5 text-left shadow-[0_10px_28px_rgba(25,26,47,0.045)] transition-[transform,box-shadow,border-color] duration-[180ms] hover:-translate-y-0.5 hover:border-[rgba(207,75,49,0.18)] hover:shadow-[0_16px_38px_rgba(25,26,47,0.08)] active:translate-y-px" type="button" key={attempt.id}>
                    <span className="flex items-center justify-between gap-3">
                      <strong className="font-(family-name:--serif) text-[24px] leading-none text-[var(--ink)]">{attempt.targetText || attempt.text}</strong>
                      <span className="text-[10px] font-bold text-[var(--muted)]">
                        {attempt.status === "complete"
                          ? `${Math.round(score)} · ${statusFromScore(score)}`
                          : attempt.status === "failed"
                            ? "Analysis Failed"
                            : "Analysis Pending"}
                      </span>
                    </span>
                    <span className="mt-3 block h-2 overflow-hidden rounded-full bg-[#ebe5dc]" aria-hidden="true">
                      <span className={cn("block h-full rounded-[inherit] bg-[linear-gradient(90deg,#e99656,#cf4b31)] shadow-[0_0_12px_rgba(207,75,49,0.2)] transition-[width] duration-200", progressWidthClass(score))}></span>
                    </span>
                  </button>
                );
              })
            ) : (
              <p className={cn(panelClass, "smv-fade-in m-0 text-xs leading-[1.65] text-[var(--muted)]")}>No custom practice record for this day.</p>
            )}
          </div>
        </section>

        <section aria-labelledby="tones-title">
          <p className={sectionLabelClass} id="tones-title">
            Tone Drills
          </p>
          <div className={cn(panelClass, "smv-fade-in grid gap-2")}>
            {Object.values(toneDrills).map((item) => (
              <button className="block w-full rounded-[14px] px-2 py-3 text-left transition-[transform,background-color] duration-[180ms] hover:-translate-y-0.5 hover:bg-[rgba(207,75,49,0.045)] active:translate-y-px" type="button" key={item.tone} onClick={() => onOpenToneDrill(item.tone)}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-extrabold text-[var(--red)]">{item.label}</span>
                  <span className="text-[11px] font-bold text-[var(--muted)]">No practice data yet</span>
                </div>
                <div className="mt-2.5 block h-2 overflow-hidden rounded-full bg-[#ebe5dc]" aria-hidden="true">
                  <div className={cn("block h-full rounded-[inherit] bg-[linear-gradient(90deg,#e99656,#cf4b31)] transition-[width] duration-200", progressWidthClass(0))}></div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <button className="w-full rounded-[15px] bg-[var(--navy)] px-5 py-3 font-bold text-white shadow-[0_12px_28px_rgba(25,26,47,0.16)] transition-[transform,box-shadow,background-color] duration-[180ms] hover:-translate-y-0.5 hover:bg-[var(--navy-soft)] hover:shadow-[0_16px_34px_rgba(25,26,47,0.2)] active:translate-y-px lg:col-span-2 lg:max-w-[320px] lg:justify-self-end" type="button" onClick={onBack}>
          Back to Practice Today
        </button>
      </div>
    </section>
  );
}

function EntryAssessmentScreen({
  session,
  recording,
  busy,
  streak,
  onRecord,
  onComplete,
}: {
  session: EntryAssessmentSession;
  recording: boolean;
  busy: boolean;
  streak: number;
  onRecord: () => void;
  onComplete: () => void;
}) {
  const currentIndex = Math.min(session.currentIndex || 0, entryAssessmentItems.length - 1);
  const currentItem = entryAssessmentItems[currentIndex] || entryAssessmentItems[0];
  const results = session.results;
  const completed = results.length >= entryAssessmentItems.length;
  const progress = Math.round((results.length / entryAssessmentItems.length) * 100);
  const buttonCopy = completed
    ? "Submit Assessment to Teacher"
    : busy
      ? "Analyzing..."
      : recording
        ? "Finish This Recording"
        : "Start This Recording";

  return (
    <section className={screenClass} data-screen="entry-assessment">
      <BrandHeader streak={streak} />
      <div className={contentClass}>
        <section className={cn(panelClass, "grid gap-[11px] border-[rgba(239,190,98,0.42)] bg-[#fffaf0]")}>
          <div className="grid grid-cols-[1fr_auto] items-start gap-2.5">
            <div>
              <span className={modelKickerClass}>Entry Assessment</span>
              <h2 className="mt-0 mb-[5px] text-base">{completed ? "Assessment Complete" : currentItem.title}</h2>
              <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">
                {completed
                  ? "Assessment results are ready. Submit them so your teacher can confirm the first practice plan."
                  : `Please read: ${currentItem.prompt} (${currentItem.pinyin})`}
              </p>
            </div>
            <span className={statusPillClass}>
              {results.length}/{entryAssessmentItems.length}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[rgba(53,84,110,0.1)]" aria-hidden="true">
            <span className={cn("block h-full rounded-[inherit] bg-[var(--amber)]", progressWidthClass(progress))}></span>
          </div>
          {completed ? (
            <div className="grid gap-1 rounded-xl bg-white px-[11px] py-2.5">
              <strong className="text-xs text-[var(--amber)]">Ready to Submit</strong>
              <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">The system will use {results.length} result(s) to create a starting pronunciation profile. Your teacher can confirm it and publish a practice pack.</p>
            </div>
          ) : (
            <div className="grid gap-[5px] rounded-xl border border-[rgba(53,84,110,0.12)] bg-white p-[11px]">
              <span className={modelKickerClass}>{currentItem.type}</span>
              <strong className="text-[13px] text-[var(--ink)]">{currentItem.prompt}</strong>
              <p className="m-0 text-xs leading-[1.55] text-[var(--muted)]">Focus: {currentItem.focus}</p>
            </div>
          )}
          <button className="w-full rounded-[13px] bg-[var(--amber)] text-[13px] font-extrabold text-white" type="button" onClick={completed ? onComplete : onRecord} disabled={busy}>
            {buttonCopy}
          </button>
        </section>

        <section className={cn(panelClass, "grid gap-[9px]")}>
          <span className={modelKickerClass}>Completed Items</span>
          {results.length ? (
            results.map((result) => (
              <article className="grid gap-[5px] rounded-xl border border-[rgba(53,84,110,0.12)] bg-white p-[11px]" key={result.id}>
                <strong className="text-[13px] text-[var(--ink)]">
                  {result.prompt} · {result.score}
                </strong>
                <span className="m-0 text-xs leading-[1.55] text-[var(--muted)]">{result.title}</span>
                <p className="m-0 text-xs leading-[1.55] text-[var(--muted)]">{result.note}</p>
              </article>
            ))
          ) : (
            <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">No completed items yet.</p>
          )}
        </section>
      </div>
    </section>
  );
}

function ToneDrillScreen({
  tone,
  onBack,
  onChooseWord,
}: {
  tone: string;
  onBack: () => void;
  onChooseWord: (word: string) => void;
}) {
  const drill = toneDrills[tone] || toneDrills["3"];

  return (
    <section className={screenClass} data-screen="tone-drill">
      <header className={cn(appHeaderBaseClass, "min-h-[220px] pt-9")}>
        <div className={statusRowClass}>
          <span>{statusTime()}</span>
          <span>Tone Drill</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-end gap-[18px]">
          <div>
            <button className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.05)] py-0 pr-[11px] pl-2 text-xs font-bold text-[rgba(255,255,255,0.72)]" type="button" onClick={onBack} aria-label="Back to Progress">
              <span className="-translate-y-px text-[22px] leading-none text-[var(--red)]" aria-hidden="true">‹</span>
              <span>Progress</span>
            </button>
            <h1 className="mt-[18px] mb-1.5 text-[28px] leading-none text-white">{drill.label}</h1>
            <p className="m-0 max-w-[250px] text-[13px] leading-[1.55] text-[rgba(255,255,255,0.48)]">{drill.description}</p>
          </div>
          <div className="font-(family-name:--serif) text-[88px] leading-[0.9] text-[var(--red)]" aria-hidden="true">
            {drill.tone}
          </div>
        </div>
      </header>
      <div className={contentClass}>
        <section className={cn(panelClass, "grid gap-[9px] rounded-[18px] p-[18px]")}>
          <span className={modelKickerClass}>Auto Question Bank</span>
          <strong className="text-[17px]">Choose a character to start a focused practice drill</strong>
          <p className="m-0 text-[13px] leading-[1.7] text-[var(--muted)]">These characters share the same tone. Select one to switch to practice, hear the standard audio, record, and review the tone contour.</p>
        </section>
        <div className="grid grid-cols-3 gap-2.5">
          {drill.words.map((word) => (
            <button className="min-h-[84px] rounded-2xl border border-[var(--line)] bg-[var(--surface)] font-(family-name:--serif) text-4xl text-[var(--ink)] shadow-[inset_0_-1px_rgba(207,200,189,0.2)] active:bg-[var(--green-soft)]" type="button" key={word} onClick={() => onChooseWord(word)}>
              {word}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function TeachingClipScreen({
  plan,
  selectedIndex,
  onBack,
  onPrevious,
  onNext,
  onSetText,
}: {
  plan: TeachingClipPlan | null;
  selectedIndex: number;
  onBack: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSetText: (text: string) => void;
}) {
  if (!plan) {
    return (
      <section className={screenClass} data-screen="teaching-clip">
        <header className={cn(appHeaderBaseClass, "min-h-[190px]")}>
          <div className={statusRowClass}>
            <span>{statusTime()}</span>
            <span>Teaching Clip</span>
          </div>
          <div>
            <button className="min-h-9 py-[5px] pr-0 pl-3 text-xs text-[rgba(255,255,255,0.72)]" type="button" onClick={onBack}>
              Back to Practice
            </button>
            <h1 className="m-0 text-xl text-white">No Teaching Clip Yet</h1>
            <p className="mt-[5px] mb-0 text-xs text-[rgba(255,255,255,0.48)]">Generated after one analysis.</p>
          </div>
        </header>
      </section>
    );
  }

  const index = Math.min(selectedIndex, Math.max(plan.segments.length - 1, 0));
  const segment = plan.segments[index] || plan.segments[0];
  const progressWidth = plan.segments.length ? ((index + 1) / plan.segments.length) * 100 : 0;

  return (
    <section className={screenClass} data-screen="teaching-clip">
      <header className={cn(appHeaderBaseClass, "min-h-[190px]")}>
        <div className={statusRowClass}>
          <span>{statusTime()}</span>
          <span>Personalized Teaching Clip</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <button className="min-h-9 py-[5px] pr-0 pl-3 text-xs text-[rgba(255,255,255,0.72)]" type="button" onClick={onBack}>
              Back to Practice
            </button>
            <h1 className="m-0 text-xl text-white">{plan.title}</h1>
            <p className="mt-[5px] mb-0 text-xs text-[rgba(255,255,255,0.48)]">Target sentence: {plan.targetText}</p>
          </div>
          <div className="font-(family-name:--serif) text-[64px] leading-none text-[var(--red)]" aria-hidden="true">
            {plan.targetSyllable.character}
          </div>
        </div>
      </header>
      <div className={contentClass}>
        <section className={cn(panelClass, "grid gap-[7px]")}>
          <span className={modelKickerClass}>Current Focus</span>
          <strong className="text-[15px]">{plan.focusIssue?.title || plan.focusIssue?.focus || segment.syllable.focus}</strong>
          <p className="m-0 text-xs leading-[1.55] text-[var(--muted)]">{plan.focusIssue?.summary || segment.syllable.feedback}</p>
        </section>

        <section className={cn(panelClass, "grid gap-2")} aria-labelledby="clip-segment-title">
          <div className="flex justify-between text-[11px] font-bold text-[var(--muted)]">
            <span>{index + 1} / {plan.segments.length}</span>
          </div>
          <div className="h-[7px] overflow-hidden rounded-full bg-[#eceae6]" aria-hidden="true">
            <span className={`block h-full rounded-[inherit] bg-[var(--red)] ${progressWidthClass(progressWidth)}`}></span>
          </div>
          <h2 className="m-0 text-lg" id="clip-segment-title">
            {segment.title}
          </h2>
          <p className="m-0 text-xs leading-[1.55] text-[var(--muted)]">{segment.guidanceText}</p>
          <PronunciationVideo
            src={segment.clipUrl || clipSourceFor(segment.syllable, segment.clipType)}
            poster="/assets/mouth-reference.png"
            label={segment.videoTitle}
          />
          <p className="m-0 text-xs leading-[1.55] text-[var(--muted)]">{segment.videoTitle}</p>
          <div className="flex flex-wrap gap-1.5">
            {segment.practiceWords.map((word) => (
              <button className={practiceItemPillClass} type="button" key={word} onClick={() => onSetText(word)}>
                {word}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2" aria-label="Teaching Clip Controls">
          <button className="rounded-[13px] bg-[#efede7] text-[13px] font-extrabold text-[var(--muted)] disabled:cursor-default" type="button" onClick={onPrevious} disabled={index <= 0}>Previous</button>
          <button className="rounded-[13px] bg-[#efede7] text-[13px] font-extrabold text-[var(--muted)] disabled:cursor-default" type="button" onClick={onNext} disabled={index >= plan.segments.length - 1}>Next</button>
        </div>
      </div>
    </section>
  );
}

// Student task screen shows the current assigned practice prompt.
function StudentTasksScreen({
  tasks,
  submissions,
  progress,
  streak,
  onPractice,
  onOpenTask,
}: {
  tasks: StudentTaskPackage[];
  submissions: TaskSubmission[];
  progress: TaskProgressState;
  streak: number;
  onPractice: () => void;
  onOpenTask: (taskId: string) => void;
}) {
  return (
    <section className={screenClass} data-screen="tasks">
      <BrandHeader streak={streak} />
      <div className={cn(contentBaseClass, "gap-[13px]")}>
        {tasks.length ? (
          <div className="grid gap-3" aria-label="Practice pack list">
            {tasks.map((task) => (
              <StudentTaskPackageCard task={task} submissions={submissions} progress={progress[task.id] || {}} onOpenTask={onOpenTask} key={task.id} />
            ))}
          </div>
        ) : (
          <section className={cn(panelClass, "grid min-h-[220px] content-center gap-[11px] border-[rgba(32,154,120,0.28)] bg-[#f6fffb]")}>
            <span className={modelKickerClass}>Tasks</span>
            <h2>No Practice Packs</h2>
            <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">When your teacher publishes a practice pack, it will appear here. You can use custom practice for now.</p>
            <button className={secondaryTeacherButtonClass} type="button" onClick={onPractice}>
              Go to Custom Practice
            </button>
          </section>
        )}
      </div>
    </section>
  );
}

function StudentTaskPackageCard({
  task,
  submissions,
  progress,
  onOpenTask,
}: {
  task: StudentTaskPackage;
  submissions: TaskSubmission[];
  progress: Record<string, TaskStepProgress>;
  onOpenTask: (taskId: string) => void;
}) {
  const hasSubmission = submissions.some((submission) => submission.taskId === task.id);
  const completedCount = hasSubmission ? task.exerciseSet.length : task.exerciseSet.filter((exercise) => progress[exercise.id]?.completed).length;
  const packageLevel = hasSubmission ? "pending" : "todo";
  const packageLabel = packageLevel === "pending" ? "Waiting for Teacher Feedback" : "To Do";

  return (
    <button
      className={`${panelFrameClass} grid w-full gap-2.5 rounded-[18px] p-5 text-left text-[var(--ink)] ${
        packageLevel === "pending" ? "border-[rgba(214,126,0,0.34)]" : "border-[rgba(215,71,47,0.24)]"
      }`}
      type="button"
      onClick={() => onOpenTask(task.id)}
    >
      <div className="flex items-center justify-between gap-2.5">
        <span className={modelKickerClass}>Practice Pack</span>
        <span className={statusPillClass}>{packageLabel}</span>
      </div>
      <h2 className="m-0 text-[22px] leading-[1.25]">{task.title}</h2>
      <p className="m-0 leading-[1.55] text-[var(--muted)]">{task.goal}</p>
      <div className={teacherTaskMetaClass}>
        <span className={teacherTaskMetaItemClass}>{task.suggestedDue}</span>
        <span className={teacherTaskMetaItemClass}>
          {completedCount}/{task.exerciseSet.length} Step
        </span>
        <span className={teacherTaskMetaItemClass}>Submit {task.requiredSubmissions} recording(s)</span>
      </div>
    </button>
  );
}

function StudentTaskDetailScreen({
  scores,
  tasks,
  submissions,
  progress,
  selectedTaskId,
  activeExerciseId,
  activeItemIndex,
  recording,
  busy,
  streak,
  onBackToList,
  onPractice,
  onOpenStep,
  onBackToSteps,
  onTaskItem,
  onRecordStep,
  onReplayStep,
  onSubmitTask,
}: {
  scores: ScoreSet;
  tasks: StudentTaskPackage[];
  submissions: TaskSubmission[];
  progress: TaskProgressState;
  selectedTaskId: string;
  activeExerciseId: string;
  activeItemIndex: number;
  recording: boolean;
  busy: boolean;
  streak: number;
  onBackToList: () => void;
  onPractice: () => void;
  onOpenStep: (taskId: string, exerciseId: string) => void;
  onBackToSteps: () => void;
  onTaskItem: (index: number) => void;
  onRecordStep: (taskId: string, exerciseId: string, itemIndex: number) => void;
  onReplayStep: (taskId: string, exerciseId: string, itemIndex: number) => void;
  onSubmitTask: (taskId: string) => void;
}) {
  const task = tasks.find((item) => item.id === selectedTaskId) || tasks[0];

  return (
    <section className={screenClass} data-screen="task-detail">
      <BrandHeader streak={streak} />
      <div className={cn(contentBaseClass, "gap-[13px]")}>
        {task ? (
          <StudentTaskContent
            task={task}
            scores={scores}
            submissions={submissions}
            progress={progress[task.id] || {}}
            activeExerciseId={activeExerciseId}
            activeItemIndex={activeItemIndex}
            recording={recording}
            busy={busy}
            onBackToList={onBackToList}
            onPractice={onPractice}
            onOpenStep={onOpenStep}
            onBackToSteps={onBackToSteps}
            onTaskItem={onTaskItem}
            onRecordStep={onRecordStep}
            onReplayStep={onReplayStep}
            onSubmitTask={onSubmitTask}
          />
        ) : (
          <section className={cn(panelClass, "grid min-h-[220px] content-center gap-[11px] border-[rgba(32,154,120,0.28)] bg-[#f6fffb]")}>
            <span className={modelKickerClass}>Tasks</span>
            <h2>No Practice Pack Yet</h2>
            <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">When your teacher publishes a practice pack, today's work, submissions, and teacher feedback will appear here.</p>
            <button className={secondaryTeacherButtonClass} type="button" onClick={onPractice}>
              Go to Free Practice
            </button>
          </section>
        )}
      </div>
    </section>
  );
}

function StudentTaskContent({
  task,
  scores,
  submissions,
  progress,
  activeExerciseId,
  activeItemIndex,
  recording,
  busy,
  onBackToList,
  onPractice,
  onOpenStep,
  onBackToSteps,
  onTaskItem,
  onRecordStep,
  onReplayStep,
  onSubmitTask,
}: {
  task: StudentTaskPackage;
  scores: ScoreSet;
  submissions: TaskSubmission[];
  progress: Record<string, TaskStepProgress>;
  activeExerciseId: string;
  activeItemIndex: number;
  recording: boolean;
  busy: boolean;
  onBackToList: () => void;
  onPractice: () => void;
  onOpenStep: (taskId: string, exerciseId: string) => void;
  onBackToSteps: () => void;
  onTaskItem: (index: number) => void;
  onRecordStep: (taskId: string, exerciseId: string, itemIndex: number) => void;
  onReplayStep: (taskId: string, exerciseId: string, itemIndex: number) => void;
  onSubmitTask: (taskId: string) => void;
}) {
  const submission = submissions.find((item) => item.taskId === task.id);
  const activeExercise = task.exerciseSet.find((exercise) => exercise.id === activeExerciseId);
  const completedCount = submission ? task.exerciseSet.length : task.exerciseSet.filter((exercise) => progress[exercise.id]?.completed).length;
  const allStepsCompleted = completedCount >= task.exerciseSet.length;

  if (activeExercise) {
    const practiceItems = activeExercise.practiceItems.length ? activeExercise.practiceItems : [activeExercise.targetText || task.practiceText];
    const safeItemIndex = Math.min(Math.max(activeItemIndex, 0), Math.max(practiceItems.length - 1, 0));
    const activeItemText = practiceItems[safeItemIndex] || activeExercise.targetText || task.practiceText;
    const stepProgress = progress[activeExercise.id];
    const completedItem = stepProgress?.items?.[safeItemIndex];
    const allItemsDone = practiceItems.length > 0 && practiceItems.every((_, index) => stepProgress?.items?.[index]?.completed);
    const recordCopy = busy
      ? "Analyzing and Submitting..."
      : recording
        ? "Finish Recording and Submit"
        : completedItem
          ? "Record Again and Submit"
          : "Start Recording and Submit";
    return (
      <section className={cn(panelClass, "grid gap-3 border-[rgba(32,154,120,0.24)] [background:linear-gradient(135deg,rgba(32,154,120,0.1),transparent_52%),#fff]")}>
        <button className={`${secondaryTeacherButtonClass} justify-self-start`} type="button" onClick={onBackToSteps}>
          Back to Tasks
        </button>
        <span className={modelKickerClass}>Step {task.exerciseSet.findIndex((exercise) => exercise.id === activeExercise.id) + 1}</span>
        <div className="grid grid-cols-[1fr_auto] items-start gap-2.5">
          <div>
            <h2 className="mt-0 mb-[5px] text-base">{activeExercise.title}</h2>
            <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">{activeExercise.instruction}</p>
          </div>
          <span className={statusPillClass}>{stepProgress?.completed ? "Saved" : "In Progress"}</span>
        </div>
        <div className="grid gap-[5px] rounded-[13px] border border-[rgba(53,84,110,0.1)] bg-[#f8f7f3] p-3">
          <span className="text-[11px] font-black text-[var(--green)]">{activeExercise.type}</span>
          <strong className="text-2xl leading-[1.25] text-[var(--ink)]">{activeItemText}</strong>
          <p className="m-0 text-xs leading-[1.55] text-[var(--muted)]">
            Item {safeItemIndex + 1}/{practiceItems.length || 1}. {activeExercise.requiresSubmission
              ? "These recordings will be included in the final submission to your teacher."
              : "Record and save each item separately."}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {practiceItems.map((item, index) => (
              <button
                className={`min-h-[30px] rounded-full border px-3 text-xs font-black ${
                  index === safeItemIndex
                    ? "border-[var(--green)] bg-white text-[var(--green)]"
                    : stepProgress?.items?.[index]?.completed
                      ? "border-[rgba(32,154,120,0.25)] bg-[var(--green-soft)] text-[var(--green)]"
                      : "border-transparent bg-[var(--green-soft)] text-[var(--green)]"
                }`}
                type="button"
                key={item}
                onClick={() => onTaskItem(index)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2.5 rounded-[14px] border border-[rgba(32,154,120,0.18)] bg-white p-3">
          <span className={modelKickerClass}>Standard Audio and Recording</span>
          <p className="m-0 leading-[1.55] text-[var(--muted)]">Current item: {activeItemText}. Listen to the standard pronunciation, then record your practice. Feedback and visual cues will appear on this page.</p>
          <button className={secondaryTeacherButtonClass} type="button" onClick={onPractice}>
            Play Standard Pronunciation
          </button>
          <div className="grid grid-cols-[1fr_82px] gap-1.5" aria-label="Practice Pack Recording Actions">
            <button className="relative rounded-[14px] bg-[var(--red)] px-[18px] text-left font-bold text-white transition-[transform,background-color,border-color] duration-150 active:translate-y-px active:scale-[0.99] disabled:opacity-70" type="button" onClick={() => onRecordStep(task.id, activeExercise.id, safeItemIndex)} disabled={busy}>
              <span className="mr-2 inline-block size-2 rounded-full border-2 border-current align-[1px]"></span>{recordCopy}
            </button>
            <button className="rounded-[14px] border border-[#e6e1d8] bg-[#efede7] px-[5px] text-xs font-bold transition-[transform,background-color,border-color] duration-150 active:translate-y-px active:scale-[0.99]" type="button" onClick={() => onReplayStep(task.id, activeExercise.id, safeItemIndex)} disabled={!completedItem?.recordingUrl && !stepProgress?.recordingUrl}>
              Replay
            </button>
          </div>
        </div>
        <section className="grid gap-2.5 rounded-[14px] border border-[rgba(32,154,120,0.24)] bg-[#fbfffc] p-3" aria-label="Task Visual Feedback">
          <span className={modelKickerClass}>Visual Feedback</span>
          <p className="m-0 leading-[1.55] text-[var(--muted)]">{completedItem?.aiSummary || `After recording, the AI pinyin diagnosis and tone chart for ${activeItemText} will appear here.`}</p>
          <div className={teacherScoreStripClass} aria-label="Latest task score preview">
            <span className={teacherScorePillClass}>Tone {Math.round((completedItem?.aiScores || scores).tone)}</span>
            <span className={teacherScorePillClass}>Clarity {Math.round((completedItem?.aiScores || scores).clarity)}</span>
            <span className={teacherScorePillClass}>Rhythm {Math.round((completedItem?.aiScores || scores).rhythm)}</span>
          </div>
        </section>
        {allItemsDone && (
          <div className="grid gap-1 rounded-[13px] border border-[rgba(32,154,120,0.22)] bg-[var(--green-soft)] p-3">
            <span className={modelKickerClass}>Complete</span>
            <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">All {practiceItems.length || 1} item(s) are saved. Return to the task steps and continue.</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <>
      <section className={cn(panelClass, "grid gap-3 border-[rgba(32,154,120,0.24)] [background:linear-gradient(135deg,rgba(32,154,120,0.1),transparent_52%),#fff]")}>
        <span className={modelKickerClass}>Practice Pack</span>
        <div className="grid grid-cols-[1fr_auto] items-start gap-2.5">
          <div>
            <h2 className="mt-0 mb-[5px] text-base">{task.title}</h2>
            <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">{task.goal}</p>
          </div>
          <span className={statusPillClass}>{task.status}</span>
        </div>
        <div className={teacherTaskMetaClass}>
          <span className={teacherTaskMetaItemClass}>{task.suggestedDue}</span>
          <span className={teacherTaskMetaItemClass}>Completed {completedCount}/{task.exerciseSet.length} steps</span>
          <span className={teacherTaskMetaItemClass}>Requires {task.requiredSubmissions} recording(s)</span>
        </div>
        <div className="grid gap-2.5">
          {task.exerciseSet.map((exercise, index) => (
            <button
              className={`grid w-full grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-2xl border p-[13px] text-left text-[var(--ink)] ${
                progress[exercise.id]?.completed ? "border-[rgba(32,154,120,0.35)] bg-[var(--green-soft)]" : "border-[var(--line)] bg-white"
              }`}
              type="button"
              key={exercise.id}
              onClick={() => onOpenStep(task.id, exercise.id)}
            >
              <span className="grid size-[30px] place-items-center rounded-full bg-[var(--navy)] text-xs font-black text-white">{index + 1}</span>
              <span className="grid gap-1">
                <strong className="text-[15px]">{exercise.title}</strong>
                <small className="text-xs not-italic leading-[1.45] text-[var(--muted)]">{exercise.instruction}</small>
                <em className="text-xs not-italic leading-[1.45] text-[var(--muted)]">
                  {exercise.targetText || task.practiceText} · {exercise.requiredCount || 1} time(s)
                  {exercise.requiresSubmission ? " · Recording Submit" : ""}
                </em>
                <span className="mt-0.5 flex flex-wrap gap-1.5">
                  {exercise.practiceItems.map((item) => (
                    <span className="rounded-full bg-[var(--green-soft)] px-[7px] py-[3px] text-[10px] font-black text-[var(--green)]" key={item}>{item}</span>
                  ))}
                </span>
              </span>
              <b className="text-xs text-[var(--green)]">{progress[exercise.id]?.completed ? "Complete" : "Start"}</b>
            </button>
          ))}
        </div>
        <button className={primaryTeacherButtonClass} type="button" onClick={() => onSubmitTask(task.id)} disabled={!allStepsCompleted || Boolean(submission)}>
          {submission ? "Submitted to Teacher" : allStepsCompleted ? "Submit to Teacher" : "Complete All Steps to Submit"}
        </button>
      </section>

      <StudentTaskFeedback submission={submission} />

      <button className={secondaryTeacherButtonClass} type="button" onClick={onBackToList}>
        Back to Task List
      </button>
    </>
  );
}

function StudentTaskFeedback({ submission }: { submission?: TaskSubmission }) {
  // Feedback card switches from waiting state to teacher review state.
  const feedbackTitle = submission?.teacherFeedback
    ? `${submission.teacherScore ?? "--"} · Teacher Feedback`
    : "Teacher is reviewing";
  const feedbackBody = submission?.teacherFeedback
    || (submission
      ? "Your teacher has received the task recording. Feedback will appear here after review."
      : "Complete the tasks and submit them to receive teacher feedback here.");

  return (
    <section className={cn(panelClass, "grid gap-3 border-[rgba(210,122,0,0.24)] bg-[var(--amber-soft)]")}>
      <span className={modelKickerClass}>Task Feedback</span>
      <strong className="text-[15px] text-[var(--ink)]">{feedbackTitle}</strong>
      <p className="m-0 text-[13px] leading-[1.65] text-[var(--ink)]">{feedbackBody}</p>
      {submission && (
        <div className={teacherScoreStripClass} aria-label="AI First-Pass Scores">
          <span className={teacherScorePillClass}>Tone {submission.aiScores.tone}</span>
          <span className={teacherScorePillClass}>Clarity {submission.aiScores.clarity}</span>
          <span className={teacherScorePillClass}>Rhythm {submission.aiScores.rhythm}</span>
        </div>
      )}
      {submission && (
        <button className={secondaryTeacherButtonClass} type="button">
          Replay Submitted Recording
        </button>
      )}
    </section>
  );
}

// Teacher workspace chooses the dashboard section from the active teacher tab.
function TeacherScreen({
  view,
  selectedStudentId,
  taskEditorStudentId,
  studentFilter,
  students,
  editingStudentSummaryId,
  assessmentProfiles,
  publishedTasks,
  taskSubmissions,
  onSelectStudent,
  onTaskEditorStudent,
  onStudentFilter,
  onTeacherView,
  onOpenReview,
  onPublishTask,
  onConfirmAssessment,
  onEditStudentSummary,
  onSaveStudentSummary,
}: {
  view: TeacherView;
  selectedStudentId: string;
  taskEditorStudentId: string;
  studentFilter: TeacherStudentFilter;
  students: TeacherStudent[];
  editingStudentSummaryId: string;
  assessmentProfiles: AssessmentProfile[];
  publishedTasks: StudentTaskPackage[];
  taskSubmissions: TaskSubmission[];
  onSelectStudent: (studentId: string) => void;
  onTaskEditorStudent: (studentId: string) => void;
  onStudentFilter: (filter: TeacherStudentFilter) => void;
  onTeacherView: (view: TeacherView, filter?: TeacherStudentFilter) => void;
  onOpenReview: (submissionId: string) => void;
  onPublishTask: (task: StudentTaskPackage | null) => void;
  onConfirmAssessment: (profileId: string) => void;
  onEditStudentSummary: (studentId: string) => void;
  onSaveStudentSummary: (studentId: string, summary: string) => void;
}) {
  const selectedStudent = students.find((student) => student.id === selectedStudentId) || students[0];
  const editorStudent = students.find((student) => student.id === taskEditorStudentId) || selectedStudent;
  let body: React.ReactNode;

  // Each branch maps a nav tab to the matching teacher content panel.
  if (view === "students") {
    body = (
      <>
        <TeacherStudents
          students={students}
          selectedStudent={selectedStudent}
          filter={studentFilter}
          onFilter={onStudentFilter}
          onSelectStudent={onSelectStudent}
        />
        <TeacherProfile
          student={selectedStudent}
          editing={editingStudentSummaryId === selectedStudent?.id}
          onEdit={onEditStudentSummary}
          onSave={onSaveStudentSummary}
        />
      </>
    );
  } else if (view === "tasks") {
    body = <TeacherTasks student={selectedStudent} students={students} publishedTasks={publishedTasks} assessmentProfiles={assessmentProfiles} onSelectStudent={onSelectStudent} onTaskEditorStudent={onTaskEditorStudent} onTeacherView={onTeacherView} />;
  } else if (view === "taskPackageEditor") {
    body = <TaskPackageEditorScreen student={editorStudent} publishedTasks={publishedTasks} onBack={() => onTeacherView("tasks")} onPublishTask={onPublishTask} />;
  } else if (view === "assessmentEditor") {
    body = (
      <AssessmentTemplateEditorScreen
        student={selectedStudent}
        assessmentProfile={assessmentProfileForStudent(assessmentProfiles, selectedStudent)}
        onBack={() => onTeacherView("tasks")}
        onPublishTask={onPublishTask}
        onConfirmAssessment={onConfirmAssessment}
      />
    );
  } else if (view === "reviews") {
    body = <TeacherReviews submissions={taskSubmissions} onOpenReview={onOpenReview} />;
  } else {
    body = <TeacherHome students={students} publishedTasks={publishedTasks} submissions={taskSubmissions} onTeacherView={onTeacherView} />;
  }

  return (
    <section className={screenClass} data-screen="teacher">
      <TeacherHeader title="Mandarin Practice Management" subtitle={teacherViewLabel(view)} />
      <div className={cn(contentBaseClass, view === "students" ? "gap-4 lg:grid-cols-[minmax(320px,0.85fr)_minmax(360px,1.15fr)] lg:items-start" : "gap-4")}>{body}</div>
    </section>
  );
}

// Shared teacher header keeps teacher-only pages visually consistent.
function TeacherHeader({ title, subtitle, className = "" }: { title: string; subtitle: string; className?: string }) {
  return (
    <header className={cn(appHeaderBaseClass, className || "min-h-[178px]")}>
      <div className={statusRowClass}>
        <span>{statusTime()}</span>
        <span>Mandarin Practice Management</span>
      </div>
      <div className={brandRowClass}>
        <div>
          <h1 className={brandClass}>
            <span className={brandAccentClass}>VoiceSight</span> Teacher
          </h1>
          <p className="mt-[7px] mb-0 text-xs text-[rgba(255,255,255,0.54)]">
            {title} · {subtitle}
          </p>
        </div>
      </div>
    </header>
  );
}

// Teacher dashboard metrics follow the same published-task and submission state as the legacy web app.
function TeacherHome({
  students,
  publishedTasks,
  submissions,
  onTeacherView,
}: {
  students: TeacherStudent[];
  publishedTasks: StudentTaskPackage[];
  submissions: TaskSubmission[];
  onTeacherView: (view: TeacherView, filter?: TeacherStudentFilter) => void;
}) {
  const pending = submissions.filter((submission) => submission.status === "Needs Teacher Feedback").length;
  const needsAttention = students.filter(teacherDashboardNeedsAttention).length;
  const average = Math.round(
    students.reduce((sum, student) => sum + student.latestScore, 0) / Math.max(students.length, 1),
  );
  const studentCount = Math.max(students.length, 1);
  const completionRate = Math.round((new Set(submissions.map((submission) => submission.studentId)).size / studentCount) * 100);
  const taskCoverageRate = Math.round((publishedTasks.length / studentCount) * 100);
  const focusTags = commonTeacherFocusTags(students);

  return (
    <>
      <section aria-labelledby="teacher-home-title">
        <p className={sectionLabelClass} id="teacher-home-title">
          Today
        </p>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3">
          <button className="grid min-h-[82px] content-center gap-[5px] rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-[13px] text-left" type="button" onClick={() => onTeacherView("reviews")}>
            <strong className="text-3xl leading-none text-[var(--amber)]">{pending}</strong>
            <span className="text-[11px] font-bold text-[var(--muted)]">Recordings to Review</span>
          </button>
          <button className="grid min-h-[82px] content-center gap-[5px] rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-[13px] text-left" type="button" onClick={() => onTeacherView("students", "attention")}>
            <strong className={`text-3xl leading-none ${needsAttention ? "text-[var(--red)]" : "text-[var(--green)]"}`}>{needsAttention}</strong>
            <span className="text-[11px] font-bold text-[var(--muted)]">Needs Attention</span>
          </button>
          <button className="grid min-h-[82px] content-center gap-[5px] rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-[13px] text-left" type="button" onClick={() => onTeacherView("tasks")}>
            <strong className="text-3xl leading-none text-[var(--green)]">{publishedTasks.length}</strong>
            <span className="text-[11px] font-bold text-[var(--muted)]">Published Practice Tasks</span>
          </button>
        </div>
      </section>

      <section className={cn(panelClass, "grid gap-2.5")} aria-labelledby="teacher-class-progress-title">
        <div className={teacherReviewHeadingClass}>
          <div>
            <span className={modelKickerClass}>Class Overview</span>
            <strong className="block text-[var(--ink)]" id="teacher-class-progress-title">Practice Completion and Focus Overview</strong>
          </div>
          <span className={statusPillClass}>{students.length} learners</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <span className="grid gap-1 rounded-[11px] bg-[#f8f5ef] px-2 py-2.5 text-center text-[10px] font-extrabold text-[var(--muted)]">
            <strong className="text-[22px] leading-none text-[var(--navy)]">{completionRate}%</strong>Submission Coverage
          </span>
          <span className="grid gap-1 rounded-[11px] bg-[#f8f5ef] px-2 py-2.5 text-center text-[10px] font-extrabold text-[var(--muted)]">
            <strong className="text-[22px] leading-none text-[var(--navy)]">{taskCoverageRate}%</strong>Task Coverage
          </span>
          <span className="grid gap-1 rounded-[11px] bg-[#f8f5ef] px-2 py-2.5 text-center text-[10px] font-extrabold text-[var(--muted)]">
            <strong className="text-[22px] leading-none text-[var(--navy)]">{average}</strong>Average Assessment
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#f8f5ef]" aria-label="Class submission coverage rate">
          <span className={cn("block h-full rounded-[inherit] bg-[var(--green)]", progressWidthClass(completionRate))}></span>
        </div>
        <div className="grid gap-2">
          <span className="text-[11px] font-black text-[var(--muted)]">Common Focus Areas</span>
          <div className="flex flex-wrap gap-1.5">
            {focusTags.length ? (
              focusTags.map((item) => (
                <span className="rounded-full bg-[var(--amber-soft)] px-[9px] py-1.5 text-[11px] font-bold text-[var(--amber)]" key={item.tag}>
                  {item.tag} · {item.count}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-[var(--amber-soft)] px-[9px] py-1.5 text-[11px] font-bold text-[var(--amber)]">No common issue yet</span>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

// Learner list controls the selected student shown in the adjacent profile panel.
function TeacherStudents({
  students,
  selectedStudent,
  filter,
  onFilter,
  onSelectStudent,
}: {
  students: TeacherStudent[];
  selectedStudent?: TeacherStudent;
  filter: TeacherStudentFilter;
  onFilter: (filter: TeacherStudentFilter) => void;
  onSelectStudent: (studentId: string) => void;
}) {
  const visibleStudents = filter === "attention" ? students.filter((student) => teacherStudentAttentionReasons(student).length > 0) : students;
  return (
    <section aria-labelledby="teacher-students-title">
      <p className={sectionLabelClass} id="teacher-students-title">
        Learner Management
      </p>
      <div className="mt-[7px] grid gap-2" aria-label="Learner filters">
        <button className={teacherFilterButtonBaseClass} type="button" aria-current={filter === "all" ? "page" : undefined} onClick={() => onFilter("all")}>
          All Learners
        </button>
        <button className={teacherFilterButtonBaseClass} type="button" aria-current={filter === "attention" ? "page" : undefined} onClick={() => onFilter("attention")}>Needs Attention</button>
      </div>
      <div className="grid gap-2">
        {visibleStudents.length ? (
          visibleStudents.map((student) => {
            const attentionCopy = teacherStudentAttentionReasons(student).join(" / ");
            return (
              <button
                className={`grid w-full grid-cols-[1fr_auto] items-center gap-2.5 rounded-[14px] border p-[13px_14px] text-left ${
                  student.id === selectedStudent?.id
                    ? "border-[rgba(32,154,120,0.75)] bg-[var(--green-soft)] shadow-[inset_3px_0_var(--green)]"
                    : "border-[var(--line)] bg-[var(--surface)]"
                }`}
                type="button"
                key={student.id}
                onClick={() => onSelectStudent(student.id)}
              >
                <span>
                  <strong className="mb-1 block text-[15px]">{student.name}</strong>
                  <span className="block text-[11px] text-[var(--muted)]">
                    {student.stage} · {student.weeklyPracticeCount} sessions this week{attentionCopy ? ` · ${attentionCopy}` : ""}
                  </span>
                </span>
                <span className={statusPillClass}>{student.latestScore}</span>
              </button>
            );
          })
        ) : (
          <p className="m-0 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-3.5 text-xs leading-[1.6] text-[var(--muted)]">No learners currently need attention.</p>
        )}
      </div>
    </section>
  );
}

// Selected learner summary for quick teacher review.
function TeacherProfile({
  student,
  editing,
  onEdit,
  onSave,
}: {
  student?: TeacherStudent;
  editing: boolean;
  onEdit: (studentId: string) => void;
  onSave: (studentId: string, summary: string) => void;
}) {
  const [summaryDraft, setSummaryDraft] = React.useState(student?.assessmentSummary || "");

  React.useEffect(() => {
    setSummaryDraft(student?.assessmentSummary || "");
  }, [student?.id, student?.assessmentSummary, editing]);

  if (!student) return null;
  return (
    <section className={cn(panelClass, "grid gap-2.5")} aria-labelledby="teacher-report-title">
      <span className={modelKickerClass}>Learning Profile</span>
      <h2 className="m-0 text-[19px]" id="teacher-report-title">{student.name}</h2>
      <div className="grid grid-cols-3 gap-2">
        <span className="grid gap-1 rounded-[11px] bg-[#f8f5ef] px-2 py-2.5 text-center text-[10px] font-extrabold text-[var(--muted)]">
          <strong className="text-[22px] leading-none text-[var(--green)]">{student.latestScore}</strong>Latest Assessment
        </span>
        <span className="grid gap-1 rounded-[11px] bg-[#f8f5ef] px-2 py-2.5 text-center text-[10px] font-extrabold text-[var(--muted)]">
          <strong className="text-[22px] leading-none text-[var(--green)]">{student.weeklyPracticeCount}</strong>Weekly Sessions
        </span>
        <span className="grid gap-1 rounded-[11px] bg-[#f8f5ef] px-2 py-2.5 text-center text-[10px] font-extrabold text-[var(--muted)]">
          <strong className="text-[22px] leading-none text-[var(--green)]">{student.pendingSubmissions}</strong>Pending
        </span>
      </div>
      {editing ? (
        <form className="grid gap-2" onSubmit={(event) => event.preventDefault()}>
          <label className={templateFieldClass}>
            <span>Teacher Stage Note</span>
            <textarea className={`${templateInputClass} resize-y`} rows={3} value={summaryDraft} onChange={(event) => setSummaryDraft(event.target.value)} />
          </label>
          <button className={secondaryTeacherButtonClass} type="button" onClick={() => onSave(student.id, summaryDraft)}>
            Save Stage Note
          </button>
        </form>
      ) : (
        <div className="grid gap-2">
          <span className="text-xs font-black text-[var(--muted)]">Teacher Stage Note</span>
          <p className="m-0 rounded-[13px] border border-[var(--line)] bg-[#fbfaf7] p-[13px] text-xs font-extrabold leading-[1.6] text-[var(--ink)]">{student.assessmentSummary}</p>
          <button className={secondaryTeacherButtonClass} type="button" onClick={() => onEdit(student.id)}>
            Edit Note
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {student.focusTags.map((tag) => (
          <span className="rounded-full bg-[var(--amber-soft)] px-[9px] py-1.5 text-[11px] font-bold text-[var(--amber)]" key={tag}>{tag}</span>
        ))}
      </div>
    </section>
  );
}

// Teacher task builder preview uses the currently selected learner when available.
function TeacherTasks({
  student,
  students,
  publishedTasks,
  assessmentProfiles,
  onSelectStudent,
  onTaskEditorStudent,
  onTeacherView,
}: {
  student?: TeacherStudent;
  students: TeacherStudent[];
  publishedTasks: StudentTaskPackage[];
  assessmentProfiles: AssessmentProfile[];
  onSelectStudent: (studentId: string) => void;
  onTaskEditorStudent: (studentId: string) => void;
  onTeacherView: (view: TeacherView) => void;
}) {
  const assessmentProfile = assessmentProfileForStudent(assessmentProfiles, student);
  const [draftStudentId, setDraftStudentId] = React.useState(student?.id || "");
  const draftStudent = students.find((item) => item.id === draftStudentId) || student;
  const learnerTasks = publishedTasks.filter((task) => task.targetStudentId === draftStudent?.id);

  React.useEffect(() => {
    setDraftStudentId(student?.id || students[0]?.id || "");
  }, [student?.id, students]);

  function openTaskEditor() {
    if (!draftStudentId) return;
    onSelectStudent(draftStudentId);
    onTaskEditorStudent(draftStudentId);
    onTeacherView("taskPackageEditor");
  }

  return (
    <>
      <section className={cn(panelClass, "grid gap-2.5")} aria-label="Create Practice Task">
        <span className={modelKickerClass}>New Task</span>
        <strong className="text-[15px]">Create an Individual Practice Pack</strong>
        <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">Choose a learner, then edit a template using the question bank or custom steps.</p>
        <label className={templateFieldClass}>
          <span>Choose Learner</span>
          <select className={templateInputClass} value={draftStudentId} onChange={(event) => setDraftStudentId(event.target.value)} disabled={!students.length}>
            {!students.length ? <option value="">No learner accounts yet</option> : null}
            {students.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button className={primaryTeacherButtonClass} type="button" onClick={openTaskEditor} disabled={!draftStudentId}>
          Create Practice Task
        </button>
      </section>

      <section className={cn(panelClass, "grid gap-2.5")} aria-label="AI Assisted Tasks">
        <span className={modelKickerClass}>Task Center</span>
        <strong className="text-[15px]">{draftStudent ? "Published Practice Packs" : "No learner selected"}</strong>
        {learnerTasks.length ? (
          <div className="grid gap-2.5">
            {learnerTasks.map((task) => (
              <article className="grid gap-2 rounded-[14px] border border-[var(--line)] bg-[#fbfaf7] p-3.5" key={task.id}>
                <div className={teacherReviewHeadingClass}>
                  <div>
                    <strong className="block text-[var(--ink)]">{task.title}</strong>
                    <span className="mt-[3px] block text-[11px] text-[var(--muted)]">{task.goal}</span>
                  </div>
                  <span className={statusPillClass}>{task.status}</span>
                </div>
                <div className={teacherTaskMetaClass}>
                  <span className={teacherTaskMetaItemClass}>{task.exerciseSet.length} task steps</span>
                  <span className={teacherTaskMetaItemClass}>{task.suggestedDue}</span>
                  <span className={teacherTaskMetaItemClass}>Submit {task.requiredSubmissions} recording(s)</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="m-0 rounded-[14px] border border-[var(--line)] bg-[#fbfaf7] p-3.5 text-xs leading-[1.6] text-[var(--muted)]">
            No task has been published for this learner yet.
          </p>
        )}
      </section>

      <section className={cn(panelClass, "grid gap-2.5")} aria-labelledby="teacher-assessment-title">
        {assessmentProfile ? (
          <>
            <div className={teacherReviewHeadingClass}>
              <div>
                <span className={modelKickerClass}>Entry Assessment Profile</span>
                <strong className="block text-[var(--ink)]" id="teacher-assessment-title">
                  Entry Assessment · {assessmentProfile.status}
                </strong>
              </div>
              <span className={teacherReviewScoreClass}>{assessmentProfile.overallScore}</span>
            </div>
            <div className={teacherTaskMetaClass}>
              <span className={teacherTaskMetaItemClass}>{assessmentProfile.status}</span>
              <span className={teacherTaskMetaItemClass}>{assessmentProfile.issueTags.length} focus areas</span>
            </div>
            <button className={primaryTeacherButtonClass} type="button" onClick={() => onTeacherView("assessmentEditor")} disabled={assessmentProfile.status === "Teacher Confirmed"}>
              {assessmentProfile.status === "Teacher Confirmed" ? "Initial Task Published" : "Edit Practice Pack Template"}
            </button>
          </>
        ) : (
          <div>
            <span className={modelKickerClass}>Entry Assessment Profile</span>
            <strong className="block text-[var(--ink)]" id="teacher-assessment-title">No editable entry assessment profile yet</strong>
            <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">After the learner completes the entry assessment, the system creates a profile for the teacher to edit into a practice pack.</p>
          </div>
        )}
      </section>
    </>
  );
}

// Recording review panel shows the teacher feedback form for pending submissions.
function TeacherReviews({
  submissions,
  onOpenReview,
}: {
  submissions: TaskSubmission[];
  onOpenReview: (submissionId: string) => void;
}) {
  const pendingSubmissions = submissions.filter((submission) => submission.status === "Needs Teacher Feedback");

  return (
    <section className={cn(panelClass, "grid gap-2.5")} aria-labelledby="teacher-review-title">
      <div className={teacherReviewHeadingClass}>
        <div>
          <span className={modelKickerClass}>Review Center</span>
          <strong className="block text-[var(--ink)]" id="teacher-review-title">Learner Recordings Waiting for Feedback</strong>
        </div>
        <span className={statusPillClass}>{pendingSubmissions.length}</span>
      </div>
      {pendingSubmissions.length ? (
        <div className="grid gap-[9px]">
          {pendingSubmissions.map((submission) => (
            <TeacherSubmissionItem submission={submission} onOpenReview={onOpenReview} key={submission.id} />
          ))}
        </div>
      ) : (
        <p className="px-0 pt-2.5 pb-0.5">Recordings from teacher-assigned tasks will appear here. Add feedback after reviewing the AI first pass.</p>
      )}
    </section>
  );
}

function TeacherSubmissionItem({
  submission,
  onOpenReview,
}: {
  submission: TaskSubmission;
  onOpenReview: (submissionId: string) => void;
}) {
  return (
    <article className="grid gap-[9px] rounded-xl border border-[rgba(207,75,49,0.18)] bg-[#fffaf6] p-3">
      <div className={teacherReviewHeadingClass}>
        <span>
          <strong className="block text-[var(--ink)]">{submission.studentName}</strong>
          <span className="mt-[3px] block text-[11px] text-[var(--muted)]">{submission.taskTitle}</span>
        </span>
        <span className={teacherReviewScoreClass}>{submission.aiScores.overall}</span>
      </div>
      <button className={primaryTeacherButtonClass} type="button" onClick={() => onOpenReview(submission.id)}>
        Edit Feedback
      </button>
    </article>
  );
}

function TaskPackageEditorScreen({
  student,
  publishedTasks,
  onBack,
  onPublishTask,
}: {
  student?: TeacherStudent;
  publishedTasks: StudentTaskPackage[];
  onBack: () => void;
  onPublishTask: (task: StudentTaskPackage | null) => void;
}) {
  // Local draft state lets teachers edit before publishing to the backend.
  const task = recommendedTaskForStudent(student);
  const alreadyPublished = Boolean(student && publishedTasks.some((item) => item.targetStudentId === student.id));
  const [exerciseSet, setExerciseSet] = React.useState<StudentTaskStep[]>(() => task?.exerciseSet || []);
  const [taskTitle, setTaskTitle] = React.useState(task?.title || "");
  const [taskGoal, setTaskGoal] = React.useState(task?.goal || "");
  const [teacherNote, setTeacherNote] = React.useState(task?.teacherNote || "Complete each step slowly, then submit the final recording to your teacher.");

  React.useEffect(() => {
    // Reset editor fields when the selected learner changes.
    setExerciseSet(task?.exerciseSet || []);
    setTaskTitle(task?.title || "");
    setTaskGoal(task?.goal || "");
    setTeacherNote(task?.teacherNote || "Complete each step slowly, then submit the final recording to your teacher.");
  }, [task?.id]);

  function publishEditedTask() {
    // Convert the edited step list into a publishable task payload.
    if (!task) return;
    onPublishTask(taskDraftFromSteps(task, {
      title: taskTitle,
      goal: taskGoal,
      teacherNote,
      exerciseSet,
    }));
  }

  function addStep() {
    // Add a blank custom step at the end of the editor.
    setExerciseSet((current) => [...current, customTeacherStep(current.length)]);
  }

  function deleteStep(stepId: string) {
    setExerciseSet((current) => current.length <= 1 ? current : current.filter((step) => step.id !== stepId));
  }

  function updateStep(stepId: string, update: (step: StudentTaskStep) => StudentTaskStep) {
    setExerciseSet((current) => current.map((step) => step.id === stepId ? update(step) : step));
  }

  if (!student || !task) {
    return (
      <section className={cn(panelClass, "grid gap-2.5")}>
        <span className={modelKickerClass}>Practice Pack Review</span>
        <strong>No editable practice pack yet</strong>
        <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">Choose a learner first. The system will draft a practice pack from the learner profile.</p>
        <button className={secondaryTeacherButtonClass} type="button" onClick={onBack}>
          Back to Task Center
        </button>
      </section>
    );
  }

  return (
    <section className="grid gap-3.5" aria-labelledby="task-package-editor-title">
      <button className={`${secondaryTeacherButtonClass} w-auto min-w-[132px] justify-self-start`} type="button" onClick={onBack}>
        Back to Task Center
      </button>

      <section className={cn(panelClass, "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3")}>
        <div>
          <span className={modelKickerClass}>Practice Pack Review Template</span>
          <h2 className="mt-1 mb-0 text-[22px] text-[var(--ink)]" id="task-package-editor-title">Personalized Practice Task</h2>
          <p className="m-0 leading-[1.55] text-[var(--muted)]">The system only drafts the pack. Confirm the target, practice load, and learner-facing instructions before publishing.</p>
        </div>
        <span className={teacherReviewScoreClass}>{student.latestScore}</span>
      </section>

      <section className={assessmentSectionClass}>
        <div className={assessmentStepClass}>
          <span className={assessmentStepNumberClass}>1</span>
          <div>
            <strong className="m-0 text-lg text-[var(--ink)]">Confirm Practice Target</strong>
            <p className="mt-1 mb-0 leading-[1.55] text-[var(--muted)]">Set the exact practice focus you want this learner to work on.</p>
          </div>
        </div>
        <div className={teacherTagListClass}>
          {(task.reviewTags || student.focusTags).map((tag) => (
            <span className={teacherTagClass} key={tag}>{tag}</span>
          ))}
        </div>
        <label className={templateFieldClass}>
          <span>Task Title</span>
          <input className={templateInputClass} value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
        </label>
        <label className={templateFieldClass}>
          <span>Practice target shown on the learner task page</span>
          <textarea className={`${templateInputClass} resize-y`} rows={3} value={taskGoal} onChange={(event) => setTaskGoal(event.target.value)} />
        </label>
      </section>

      <section className={assessmentSectionClass}>
        <div className={assessmentStepClass}>
          <span className={assessmentStepNumberClass}>2</span>
          <div>
            <strong className="m-0 text-lg text-[var(--ink)]">Task Steps</strong>
            <p className="mt-1 mb-0 leading-[1.55] text-[var(--muted)]">Each step can use the question bank or custom items. Learners complete the steps one by one.</p>
          </div>
        </div>
        <div className="grid gap-3">
          {exerciseSet.map((exercise, index) => (
            <TeacherStepEditor
              exercise={exercise}
              index={index}
              canDelete={exerciseSet.length > 1}
              onDelete={() => deleteStep(exercise.id)}
              onSourceMode={(mode) => updateStep(exercise.id, (step) => ({ ...step, sourceMode: mode }))}
              onBankPackage={(packageId) => updateStep(exercise.id, (step) => stepFromQuestionBank(step, packageId))}
              onChange={(update) => updateStep(exercise.id, (step) => ({ ...step, ...update }))}
              key={exercise.id}
            />
          ))}
        </div>
        <button className="grid size-[52px] justify-self-end place-items-center rounded-full bg-[var(--green)] text-[28px] font-black text-white shadow-[0_12px_28px_rgba(32,154,120,0.28)]" type="button" onClick={addStep}>+</button>
      </section>

      <section className={assessmentSectionClass}>
        <div className={assessmentStepClass}>
          <span className={assessmentStepNumberClass}>3</span>
          <div>
            <strong className="m-0 text-lg text-[var(--ink)]">Instructions for the Learner</strong>
            <p className="mt-1 mb-0 leading-[1.55] text-[var(--muted)]">Explain why this practice matters, how to complete it, and what to notice first.</p>
          </div>
        </div>
        <label className={templateFieldClass}>
          <span>Learner Instructions</span>
          <textarea className={`${templateInputClass} resize-y`} rows={4} value={teacherNote} onChange={(event) => setTeacherNote(event.target.value)} />
        </label>
        <button className={primaryTeacherButtonClass} type="button" onClick={publishEditedTask}>
          {alreadyPublished ? "Save Changes and Republish" : "Submit to Learner"}
        </button>
      </section>
    </section>
  );
}

function AssessmentTemplateEditorScreen({
  student,
  assessmentProfile,
  onBack,
  onPublishTask,
  onConfirmAssessment,
}: {
  student?: TeacherStudent;
  assessmentProfile: AssessmentProfile | null;
  onBack: () => void;
  onPublishTask: (task: StudentTaskPackage | null) => void;
  onConfirmAssessment: (profileId: string) => void;
}) {
  // This editor turns assessment results into the learner's first assigned pack.
  const profile = assessmentProfile;
  const bankPackage = questionBankPackages[0];
  const repeatCount = (profile?.overallScore || student?.latestScore || 0) < 70 ? 5 : 3;
  const initialAssessmentExerciseSet: StudentTaskStep[] = [
    {
      id: "assessment-listen",
      type: "Demo",
      title: "Listen to Standard Pronunciation and Observe Movement",
      instruction: "Listen to the standard pronunciation and observe mouth shape, tongue position, and rhythm.",
      targetText: bankPackage.targetText,
      requiredCount: 2,
      requiresSubmission: false,
      sourceMode: "bank",
      bankPackageId: bankPackage.id,
      practiceItems: bankPackage.items,
    },
    {
      id: "assessment-focus",
      type: "Repeat",
      title: "Slow Repetition of Focus Sound",
      instruction: "Slow down the unstable focus sound from the assessment and keep the movement complete.",
      targetText: bankPackage.targetText,
      requiredCount: repeatCount,
      requiresSubmission: false,
      sourceMode: "bank",
      bankPackageId: bankPackage.id,
      practiceItems: bankPackage.items,
    },
    {
      id: "assessment-submit",
      type: "Submit",
      title: "Full Short-Sentence Recording Submission",
      instruction: "Read the full sentence, record, and submit. The teacher will review it in the review center.",
      targetText: bankPackage.targetText,
      requiredCount: 1,
      requiresSubmission: true,
      sourceMode: "bank",
      bankPackageId: bankPackage.id,
      practiceItems: bankPackage.items,
    },
  ];
  const [assessmentExerciseSet, setAssessmentExerciseSet] = React.useState<StudentTaskStep[]>(initialAssessmentExerciseSet);
  const [profileSummary, setProfileSummary] = React.useState(profile?.profileSummary || "");
  const [assessmentRecommendation, setAssessmentRecommendation] = React.useState(profile?.recommendation || "");
  const [assessmentTaskTitle, setAssessmentTaskTitle] = React.useState(profile ? "Entry Assessment Practice Pack" : "");
  const [assessmentTeacherNote, setAssessmentTeacherNote] = React.useState("Your teacher adjusted this practice pack based on your entry assessment. Today, do not rush. Slow down the target sound, say it completely, and your teacher will listen again after you record.");

  React.useEffect(() => {
    // Reset the assessment editor whenever a different profile is opened.
    setAssessmentExerciseSet(initialAssessmentExerciseSet);
    setProfileSummary(profile?.profileSummary || "");
    setAssessmentRecommendation(profile?.recommendation || "");
    setAssessmentTaskTitle(profile ? "Entry Assessment Practice Pack" : "");
    setAssessmentTeacherNote("Your teacher adjusted this practice pack based on your entry assessment. Today, do not rush. Slow down the target sound, say it completely, and your teacher will listen again after you record.");
  }, [profile?.id]);

  function publishAssessmentTask() {
    // Publish also marks the assessment profile as teacher-confirmed.
    const task = assessmentTaskForStudent(student, profile);
    if (!task) {
      onPublishTask(null);
      return;
    }
    if (profile) onConfirmAssessment(profile.id);
    onPublishTask(taskDraftFromSteps(
      {
        ...task,
        title: assessmentTaskTitle,
        goal: assessmentRecommendation,
        teacherNote: assessmentTeacherNote,
      },
      {
        title: assessmentTaskTitle,
        goal: assessmentRecommendation,
        teacherNote: assessmentTeacherNote,
        exerciseSet: assessmentExerciseSet,
      },
    ));
  }

  function addAssessmentStep() {
    setAssessmentExerciseSet((current) => [...current, customTeacherStep(current.length)]);
  }

  function deleteAssessmentStep(stepId: string) {
    setAssessmentExerciseSet((current) => current.length <= 1 ? current : current.filter((step) => step.id !== stepId));
  }

  function updateAssessmentStep(stepId: string, update: (step: StudentTaskStep) => StudentTaskStep) {
    setAssessmentExerciseSet((current) => current.map((step) => step.id === stepId ? update(step) : step));
  }

  if (!profile) {
    return (
      <section className={cn(panelClass, "grid gap-2.5")}>
        <span className={modelKickerClass}>Entry Assessment Practice Pack Template</span>
        <strong>No editable entry assessment profile yet</strong>
        <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">After the learner completes the entry assessment, the system creates a profile for the teacher to edit into a practice pack.</p>
        <button className={secondaryTeacherButtonClass} type="button" onClick={onBack}>
          Back to Task Center
        </button>
      </section>
    );
  }

  return (
    <section className="grid gap-3.5" aria-labelledby="assessment-editor-title">
      <button className={`${secondaryTeacherButtonClass} w-auto min-w-[132px] justify-self-start`} type="button" onClick={onBack}>
        Back to Task Center
      </button>

      <section className={cn(panelClass, "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3")}>
        <div>
          <span className={modelKickerClass}>Entry Assessment Practice Pack Template</span>
          <h2 className="mt-1 mb-0 text-[22px] text-[var(--ink)]" id="assessment-editor-title">Initial Practice Pack</h2>
          <p className="m-0 leading-[1.55] text-[var(--muted)]">AI has generated a draft. Edit it for the learner, then submit it to the learner.</p>
        </div>
        <span className={teacherReviewScoreClass}>{profile.overallScore}</span>
      </section>

      <section className={assessmentSectionClass}>
        <div className={assessmentStepClass}>
          <span className={assessmentStepNumberClass}>1</span>
          <div>
            <strong className="m-0 text-lg text-[var(--ink)]">Confirm Practice Target</strong>
            <p className="mt-1 mb-0 leading-[1.55] text-[var(--muted)]">Adjust the AI suggestion into the real practice focus for this learner.</p>
          </div>
        </div>
        <div className={teacherTagListClass}>
          {profile.issueTags.map((tag) => (
            <span className={teacherTagClass} key={tag}>{tag}</span>
          ))}
        </div>
        <label className={templateFieldClass}>
          <span>Assessment summary for the teacher</span>
          <textarea className={`${templateInputClass} resize-y`} rows={3} value={profileSummary} onChange={(event) => setProfileSummary(event.target.value)} />
        </label>
        <label className={templateFieldClass}>
          <span>Practice target shown on the learner task page</span>
          <textarea className={`${templateInputClass} resize-y`} rows={4} value={assessmentRecommendation} onChange={(event) => setAssessmentRecommendation(event.target.value)} />
        </label>
      </section>

      <section className={assessmentSectionClass}>
        <div className={assessmentStepClass}>
          <span className={assessmentStepNumberClass}>2</span>
          <div>
            <strong className="m-0 text-lg text-[var(--ink)]">Edit Tasks Published to the Learner</strong>
            <p className="mt-1 mb-0 leading-[1.55] text-[var(--muted)]">Adjust the task steps the learner needs to complete.</p>
          </div>
        </div>
        <label className={templateFieldClass}>
          <span>Task Title</span>
          <input className={templateInputClass} value={assessmentTaskTitle} onChange={(event) => setAssessmentTaskTitle(event.target.value)} />
        </label>
        <div className="grid gap-3">
          {assessmentExerciseSet.map((exercise, index) => (
            <TeacherStepEditor
              exercise={exercise}
              index={index}
              canDelete={assessmentExerciseSet.length > 1}
              onDelete={() => deleteAssessmentStep(exercise.id)}
              onSourceMode={(mode) => updateAssessmentStep(exercise.id, (step) => ({ ...step, sourceMode: mode }))}
              onBankPackage={(packageId) => updateAssessmentStep(exercise.id, (step) => stepFromQuestionBank(step, packageId))}
              onChange={(update) => updateAssessmentStep(exercise.id, (step) => ({ ...step, ...update }))}
              key={exercise.id}
            />
          ))}
        </div>
        <button className="grid size-[52px] justify-self-end place-items-center rounded-full bg-[var(--green)] text-[28px] font-black text-white shadow-[0_12px_28px_rgba(32,154,120,0.28)]" type="button" onClick={addAssessmentStep}>+</button>
      </section>

      <section className={assessmentSectionClass}>
        <div className={assessmentStepClass}>
          <span className={assessmentStepNumberClass}>3</span>
          <div>
            <strong className="m-0 text-lg text-[var(--ink)]">Instructions for the Learner</strong>
            <p className="mt-1 mb-0 leading-[1.55] text-[var(--muted)]">This text appears on the learner task page. Keep it short, specific, and encouraging.</p>
          </div>
        </div>
        <label className={templateFieldClass}>
          <span>Learner-facing instructions</span>
          <textarea
            className={`${templateInputClass} resize-y`}
            rows={4}
            value={assessmentTeacherNote}
            onChange={(event) => setAssessmentTeacherNote(event.target.value)}
          />
        </label>
        <button className={primaryTeacherButtonClass} type="button" onClick={publishAssessmentTask}>
          Submit to Learner
        </button>
      </section>
    </section>
  );
}

function TeacherStepEditor({
  exercise,
  index,
  canDelete,
  onDelete,
  onSourceMode,
  onBankPackage,
  onChange,
}: {
  exercise: StudentTaskStep;
  index: number;
  canDelete: boolean;
  onDelete: () => void;
  onSourceMode: (mode: "bank" | "custom") => void;
  onBankPackage: (packageId: string) => void;
  onChange: (update: Partial<StudentTaskStep>) => void;
}) {
  // Each step editor can use a question-bank pack or fully custom text.
  const mode = exercise.sourceMode === "custom" ? "custom" : "bank";
  const selectedBank = questionBankPackages.find((pack) => pack.id === exercise.bankPackageId) || questionBankPackages[0];
  const practiceItems = exercise.practiceItems.length ? exercise.practiceItems : selectedBank.items;

  return (
    <article className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[#fffdfa] p-[13px]" data-step-mode={mode}>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-[34px] place-items-center rounded-full bg-[var(--navy)] font-black text-white">{index + 1}</span>
          <strong className="text-[var(--ink)]">Task Step {index + 1}</strong>
        </div>
        <div className="inline-grid grid-cols-2 gap-1 rounded-full bg-[#f4f1eb] p-1" role="group" aria-label="Task content source">
          <button className={`rounded-full px-[9px] py-[7px] text-[11px] font-black ${mode === "bank" ? "bg-[var(--green)] text-white" : "bg-transparent text-[var(--muted)]"}`} type="button" onClick={() => onSourceMode("bank")}>Use Question Bank</button>
          <button className={`rounded-full px-[9px] py-[7px] text-[11px] font-black ${mode === "custom" ? "bg-[var(--green)] text-white" : "bg-transparent text-[var(--muted)]"}`} type="button" onClick={() => onSourceMode("custom")}>Custom</button>
        </div>
        <button className="rounded-full bg-[#fff0eb] px-2.5 py-[7px] text-[11px] font-black text-[#cf4b31] disabled:opacity-50" type="button" aria-label={`Delete Task Step ${index + 1}`} onClick={onDelete} disabled={!canDelete}>
          Delete
        </button>
      </div>
      <section className="grid gap-2.5 rounded-[14px] border border-[rgba(32,154,120,0.2)] bg-[var(--green-soft)] p-[11px] hidden:hidden" hidden={mode !== "bank"}>
        <label className={templateFieldClass}>
          <span>Choose Item Pack</span>
          <select className={templateInputClass} value={selectedBank.id} onChange={(event) => onBankPackage(event.target.value)}>
            {questionBankPackages.map((pack) => (
              <option value={pack.id} key={pack.id}>{pack.title}</option>
            ))}
          </select>
        </label>
        <div className="grid gap-1.5">
          <strong className="m-0">{selectedBank.title}</strong>
          <p className="m-0 text-xs leading-[1.55] text-[var(--muted)]">{selectedBank.description}</p>
          <span className={practiceItemListClass}>
            {selectedBank.items.map((item) => (
              <span className={practiceItemPillClass} key={item}>{item}</span>
            ))}
          </span>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-2.5">
        <label className={templateFieldClass}>
          <span>Step Type</span>
          <input className={templateInputClass} value={exercise.type || "Practice"} onChange={(event) => onChange({ type: event.target.value })} />
        </label>
        <label className={templateFieldClass}>
          <span>Practice Count</span>
          <input className={templateInputClass} type="number" min="1" value={exercise.requiredCount || 1} onChange={(event) => onChange({ requiredCount: countFromEditor(event.target.value) })} />
        </label>
      </div>
      <label className={templateFieldClass}>
        <span>Step name shown to the learner</span>
        <input className={templateInputClass} value={exercise.title} onChange={(event) => onChange({ title: event.target.value })} />
      </label>
      <label className={templateFieldClass}>
        <span>Practice items shown to the learner</span>
        <textarea
          className={`${templateInputClass} resize-y`}
          rows={3}
          value={practiceItems.join("\n")}
          onChange={(event) => {
            const nextItems = practiceItemsFromEditor(event.target.value);
            onChange({
              practiceItems: nextItems,
              targetText: nextItems[0] || exercise.targetText,
            });
          }}
        />
      </label>
      <label className={templateFieldClass}>
        <span>Step Instruction</span>
        <textarea className={`${templateInputClass} resize-y`} rows={2} value={exercise.instruction} onChange={(event) => onChange({ instruction: event.target.value })} />
      </label>
      <label className="flex items-start gap-[9px] text-xs font-extrabold leading-normal text-[var(--ink)]">
        <input className="mt-[3px]" type="checkbox" checked={exercise.requiresSubmission} onChange={(event) => onChange({ requiresSubmission: event.target.checked })} />
        <span>This step requires recording and will be submitted to the teacher</span>
      </label>
    </article>
  );
}

function TeacherReviewEditorScreen({
  submission,
  onBack,
  onSaveReview,
}: {
  submission?: TaskSubmission;
  onBack: () => void;
  onSaveReview: (submissionId: string, teacherScore: number, feedback: string) => void;
}) {
  // Review editor starts from the AI score but allows teacher correction.
  const [teacherScore, setTeacherScore] = React.useState(submission?.teacherScore ?? submission?.aiScores.overall ?? 0);
  const [feedback, setFeedback] = React.useState(submission?.teacherFeedback || "This is closer to the target than last time. Keep slowing down the focus sound. Your teacher can see your progress.");

  if (!submission) {
    return (
      <section className={screenClass} data-screen="teacher">
        <TeacherHeader title="Review Center" subtitle="Edit Feedback" />
        <div className={cn(contentBaseClass, "gap-4")}>
          <section className={cn(panelClass, "grid gap-2.5")}>
            <span className={modelKickerClass}>Review Center</span>
            <strong>Recording Not Found</strong>
            <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">This recording may already be reviewed or may no longer be in the feedback queue.</p>
            <button className={secondaryTeacherButtonClass} type="button" onClick={onBack}>
              Back to Review Center
            </button>
          </section>
        </div>
      </section>
    );
  }

  return (
    <section className={screenClass} data-screen="teacher">
      <TeacherHeader title="Review Center" subtitle="Edit Feedback" />
      <div className={cn(contentBaseClass, "gap-4")}>
        <section className={cn(panelClass, "grid gap-2.5")} aria-labelledby="teacher-review-editor-title">
          <button className={`${secondaryTeacherButtonClass} w-auto min-w-[132px] justify-self-start`} type="button" onClick={onBack}>
            Back to Review Center
          </button>
          <div className={teacherReviewHeadingClass}>
            <div>
              <span className={modelKickerClass}>Edit Feedback</span>
              <strong className="block text-[var(--ink)]" id="teacher-review-editor-title">{submission.studentName}</strong>
              <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">{submission.taskTitle}</p>
            </div>
            <span className={teacherReviewScoreClass}>{submission.aiScores.overall}</span>
          </div>
          <div className="grid gap-1.5 rounded-xl border border-[rgba(53,84,110,0.1)] bg-white p-[9px]">
            <p className="m-0 text-xs text-[var(--muted)]">This submission has no linked recording yet. Ask the learner to record again and submit.</p>
          </div>
          <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">{submission.aiSummary || "AI first-pass review is complete and waiting for teacher feedback."}</p>
          <div className={teacherTaskMetaClass}>
            <span className={teacherTaskMetaItemClass}>Item: {submission.exerciseTitle || "Short-Sentence Recording Submit"}</span>
            <span className={teacherTaskMetaItemClass}>Target: {submission.targetText}</span>
            <span className={teacherTaskMetaItemClass}>Heard: {submission.heardText || "To Confirm"}</span>
            <span className={teacherTaskMetaItemClass}>{submission.status}</span>
          </div>
          <div className={teacherScoreStripClass} aria-label="AI First-Pass Scores">
            <span className={teacherScorePillClass}>Tone {submission.aiScores.tone}</span>
            <span className={teacherScorePillClass}>Clarity {submission.aiScores.clarity}</span>
            <span className={teacherScorePillClass}>Rhythm {submission.aiScores.rhythm}</span>
          </div>
          <div className="grid gap-[9px] pt-0.5">
            <label className="grid gap-[5px] text-[11px] font-extrabold text-[var(--muted)]">
              <span>Teacher Score</span>
              <input className="w-full min-w-0 rounded-[11px] border border-[rgba(53,84,110,0.18)] bg-white px-[11px] py-2.5 text-[var(--ink)]" type="number" min="0" max="100" value={teacherScore} onChange={(event) => setTeacherScore(Number(event.target.value || 0))} />
            </label>
            <label className="grid gap-[5px] text-[11px] font-extrabold text-[var(--muted)]">
              <span>Feedback for Learner</span>
              <textarea className="w-full min-w-0 resize-y rounded-[11px] border border-[rgba(53,84,110,0.18)] bg-white px-[11px] py-2.5 leading-normal text-[var(--ink)]" rows={4} value={feedback} onChange={(event) => setFeedback(event.target.value)} />
            </label>
            <button className={primaryTeacherButtonClass} type="button" onClick={() => onSaveReview(submission.id, teacherScore, feedback)}>
              Save Review and Feedback
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

// Chat screen renders synced conversations for the signed-in account.
function ChatScreen({
  teacher,
  user,
  chatUsers,
  chatBusy,
  chatError,
  accountDisplayName,
  threads: allThreads,
  onThreadsChange,
  avatarDataUrl,
  streak,
}: {
  teacher: boolean;
  user: AuthUser;
  chatUsers: AuthUser[];
  chatBusy: boolean;
  chatError: string;
  accountDisplayName: string;
  threads: ChatThread[];
  onThreadsChange: React.Dispatch<React.SetStateAction<ChatThread[]>>;
  avatarDataUrl: string;
  streak?: number;
}) {
  // Chat derives visible threads from the signed-in participant id.
  const role = teacher ? "teacher" : "student";
  const participantId = user.id;
  const availableTeachers = chatUsers.filter((item) => item.role === "teacher" && item.id !== user.id);
  const availableStudents = chatUsers.filter((item) => item.role === "student" && item.id !== user.id);
  const threads = allThreads.filter((thread) => thread.memberIds.includes(participantId));
  const directThreads = threads.filter((thread) => thread.type !== "class");
  const classThreads = threads.filter((thread) => thread.type === "class");
  const [chatMode, setChatMode] = React.useState<"list" | "thread">("list");
  const [selectedThreadId, setSelectedThreadId] = React.useState(directThreads[0]?.id || threads[0]?.id || "");
  const selectedThread = threads.find((thread) => thread.id === selectedThreadId) || threads[0] || null;

  function openThread(threadId: string) {
    // Opening a thread marks visible unread messages as read locally.
    setSelectedThreadId(threadId);
    setChatMode("thread");
    onThreadsChange((current) =>
      current.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              messages: thread.messages.map((message) =>
                message.senderId === participantId || message.readBy.includes(participantId)
                  ? message
                  : { ...message, readBy: [...message.readBy, participantId] },
              ),
            }
          : thread,
      ),
    );
  }

  async function sendMessage(body: string) {
    // Send through the backend, then append the saved message to local state.
    const text = body.trim();
    if (!text || !selectedThread) return;
    try {
      const payload = await createChatMessage(selectedThread.id, text);
      const message = apiMessageToLegacy(payload.message);
      onThreadsChange((current) =>
        current.map((thread) =>
          thread.id === selectedThread.id
            ? {
                ...thread,
                lastMessage: text,
                messages: [...thread.messages, message].slice(-120),
              }
            : thread,
        ),
      );
      setSelectedThreadId(selectedThread.id);
      setChatMode("thread");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Message could not be sent.");
    }
  }

  function deleteThread(threadId: string) {
    // Deleting is local-only for now so it asks for confirmation first.
    const thread = allThreads.find((item) => item.id === threadId);
    if (!thread) return;
    const confirmed = window.confirm(`Delete "${thread.title}" ${thread.type === "class" ? "Group" : "Conversation"}? Chat history will be removed from the local demo data.`);
    if (!confirmed) return;
    onThreadsChange((current) => current.filter((item) => item.id !== threadId));
    if (selectedThreadId === threadId) {
      const nextThread = threads.find((item) => item.id !== threadId);
      setSelectedThreadId(nextThread?.id || "");
      setChatMode("list");
    }
  }

  async function createClassChat(title: string, memberIds: string[]) {
    // Teachers can create group chats with selected learners.
    if (!memberIds.length) return;
    try {
      const payload = await createChatThread({
        title: title.trim() || "New Class Group Chat",
        type: "class",
        memberIds,
      });
      const thread = apiThreadToLegacy(payload.thread);
      onThreadsChange((current) => [...current.filter((item) => item.id !== thread.id), thread]);
      setSelectedThreadId(thread.id);
      setChatMode("thread");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Group chat could not be created.");
    }
  }

  async function createDirectChat(studentId: string) {
    // Reuse an existing direct chat instead of creating duplicates.
    const student = availableStudents.find((item) => item.id === studentId) || availableStudents[0];
    if (!student) return;
    const existing = allThreads.find((thread) => thread.type === "direct" && thread.memberIds.includes(student.id));
    if (existing) {
      openThread(existing.id);
      return;
    }
    try {
      const payload = await createChatThread({
        title: student.name || student.username,
        type: "direct",
        memberIds: [student.id],
      });
      const thread = apiThreadToLegacy(payload.thread);
      onThreadsChange((current) => [...current.filter((item) => item.id !== thread.id), thread]);
      setSelectedThreadId(thread.id);
      setChatMode("thread");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Learner chat could not be created.");
    }
  }

  async function createStudentDirectChat(teacherId: string) {
    // Learners start direct conversations by choosing a teacher account.
    const teacherUser = availableTeachers.find((item) => item.id === teacherId) || availableTeachers[0];
    if (!teacherUser) return;
    const existing = allThreads.find((thread) => thread.type === "direct" && thread.memberIds.includes(teacherUser.id));
    if (existing) {
      openThread(existing.id);
      return;
    }
    try {
      const payload = await createChatThread({
        title: teacherUser.name || teacherUser.username,
        type: "direct",
        memberIds: [teacherUser.id],
      });
      const thread = apiThreadToLegacy(payload.thread);
      onThreadsChange((current) => [...current.filter((item) => item.id !== thread.id), thread]);
      setSelectedThreadId(thread.id);
      setChatMode("thread");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Teacher chat could not be created.");
    }
  }

  return (
    <section className={screenClass} data-screen="chat">
      {teacher ? <TeacherHeader title="Teacher Chat" subtitle="Messages" className="min-h-[146px]" /> : <BrandHeader streak={streak || 0} />}
      <div className={cn(contentClass, "px-3.5")}>
        {chatMode === "thread" && selectedThread ? (
          <ChatThreadWindow
            thread={selectedThread}
            participantId={participantId}
            role={role}
            onBack={() => setChatMode("list")}
            onSendMessage={sendMessage}
            onDeleteThread={deleteThread}
            avatarDataUrl={avatarDataUrl}
          />
        ) : (
          <section className="grid gap-3.5 overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-3.5">
            <ChatThreadGroup title="Teacher Chat" threads={directThreads} participantId={participantId} role={role} onOpenThread={openThread} onDeleteThread={deleteThread} />
            <ChatThreadGroup title="Class Group" threads={classThreads} participantId={participantId} role={role} onOpenThread={openThread} onDeleteThread={deleteThread} />
            {chatBusy ? <p className="m-0 py-3 text-center text-xs font-bold leading-[1.6] text-[var(--muted)]">Loading conversations...</p> : null}
            {chatError ? <p className="m-0 rounded-xl bg-[var(--red-soft)] px-3 py-2 text-xs font-bold leading-[1.5] text-[var(--red)]">{chatError}</p> : null}
            {!chatBusy && !threads.length ? <p className="m-0 py-3 text-center text-xs font-bold leading-[1.6] text-[var(--muted)]">No conversations yet.</p> : null}
            {teacher ? (
              <TeacherChatTools students={availableStudents} onCreateClassChat={createClassChat} onCreateDirectChat={createDirectChat} />
            ) : (
              <StudentChatTools teachers={availableTeachers} onCreateStudentDirectChat={createStudentDirectChat} />
            )}
          </section>
        )}
      </div>
    </section>
  );
}

function ChatThreadGroup({
  title,
  threads,
  participantId,
  role,
  onOpenThread,
  onDeleteThread,
}: {
  title: string;
  threads: ChatThread[];
  participantId: string;
  role: "student" | "teacher";
  onOpenThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
}) {
  // Group renders either direct conversations or class conversations.
  if (!threads.length) return null;
  return (
    <div className="grid gap-[7px]">
      <p className={sectionLabelClass}>{title}</p>
      <div className="grid overflow-hidden rounded-[14px] border border-[rgba(53,84,110,0.11)] bg-white">
        {threads.map((thread) => {
          const displayTitle = chatThreadDisplayTitle(thread, role);
          const lastMessage = thread.messages.at(-1);
          return (
            <div className="group relative grid overflow-x-auto overflow-y-hidden bg-white [scrollbar-width:none] [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:hidden [&+&]:border-t [&+&]:border-[rgba(53,84,110,0.1)]" key={thread.id}>
              <div className="absolute inset-y-0 right-0 grid w-[148px] grid-cols-[74px_74px] items-stretch justify-end bg-white" aria-label={`${displayTitle} conversation actions`}>
                <button className="min-h-[76px] min-w-[74px] rounded-none border-l border-[rgba(53,84,110,0.08)] bg-[var(--red)] text-xs font-black text-white active:bg-[#a83b25]" type="button" onClick={() => onDeleteThread(thread.id)}>Delete</button>
              </div>
              <button className="relative z-[1] grid min-h-[76px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-none bg-white px-3.5 py-[13px] text-left text-[var(--ink)] [scroll-snap-align:start] transition-transform duration-200 group-hover:-translate-x-[148px] group-focus-within:-translate-x-[148px]" type="button" onClick={() => onOpenThread(thread.id)}>
                <Avatar name={displayTitle} className="grid size-[38px] place-items-center rounded-full bg-[var(--green)] text-[15px] font-black text-white object-cover" />
                <span className="grid min-w-0 gap-1">
                  <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px]">{displayTitle}</strong>
                  <small className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-[var(--muted)]">{lastMessage?.body || threadTypeLabel(thread)}</small>
                </span>
                <span className="grid min-w-16 justify-items-end gap-1">
                  <time className="text-[11px] text-[var(--muted)]">{lastMessage?.time || ""}</time>
                  <b className="rounded-full bg-[var(--green-soft)] px-[7px] py-1 text-[10px] font-extrabold text-[var(--green)]">{threadTypeLabel(thread)}</b>
                </span>
                {unreadCount(thread, participantId) ? (
                  <em className="absolute top-[11px] left-[50px] grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--red)] text-[10px] font-black not-italic text-white">
                    {unreadCount(thread, participantId)}
                  </em>
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function chatThreadDisplayTitle(thread: ChatThread, role: "student" | "teacher") {
  // Thread title fallback depends on who is reading the conversation.
  if (thread.type === "class") return thread.title || "Class Group";
  return thread.title || (role === "student" ? "Teacher Chat" : "Student Chat");
}

function ChatThreadWindow({
  thread,
  participantId,
  role,
  onBack,
  onSendMessage,
  onDeleteThread,
  avatarDataUrl,
}: {
  thread: ChatThread;
  participantId: string;
  role: "student" | "teacher";
  onBack: () => void;
  onSendMessage: (body: string) => void;
  onDeleteThread: (threadId: string) => void;
  avatarDataUrl: string;
}) {
  // Chat window owns only the draft text; messages live in parent state.
  const quickReplies = role === "teacher" ? teacherQuickReplies : studentQuickReplies;
  const displayTitle = chatThreadDisplayTitle(thread, role);
  const unread = unreadCount(thread, participantId);
  const [draft, setDraft] = React.useState("");

  function sendDraft() {
    // Clear the input after handing the draft to the backend send handler.
    onSendMessage(draft);
    setDraft("");
  }

  return (
    <section className="grid gap-3 overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-3.5">
      <header className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 border-b border-[rgba(53,84,110,0.1)] pb-3">
        <button className="grid size-9 place-items-center rounded-full bg-[#f2eee7] text-[22px] leading-none text-[var(--red)]" type="button" onClick={onBack} aria-label="Back to chat list">
          ‹
        </button>
        <div>
          <strong className="block text-[15px] text-[var(--ink)]">{displayTitle}</strong>
          <span className="text-[11px] text-[var(--muted)]">{threadTypeLabel(thread)} · {unread} Unread</span>
        </div>
        <span className={statusPillClass}>{thread.type === "class" ? "Class" : "Direct"}</span>
      </header>

      <div className="rounded-[14px] bg-[#f8f5ef] p-3">
        <span className={modelKickerClass}>Communication Focus</span>
        <p className="mt-1 mb-0 text-xs leading-[1.6] text-[var(--muted)]">
          {thread.type === "class"
            ? "Use class notices for shared plans. Use teacher chat for personal pronunciation questions."
            : "Use this thread to send practice updates, ask for recording review, or confirm the next practice focus."}
        </p>
      </div>

      {thread.type === "class" ? (
        <div className="flex justify-end">
          <button className="rounded-full bg-[var(--red-soft)] px-3 py-2 text-[11px] font-black text-[var(--red)]" type="button" onClick={() => onDeleteThread(thread.id)}>Delete Group</button>
        </div>
      ) : null}

      <div className="grid max-h-[390px] gap-3 overflow-y-auto pr-1">
        {thread.messages.map((message) => {
          const mine = message.senderId === participantId;
          const readCount = message.readBy.length;
          return (
            <article className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-2 ${mine ? "justify-items-end" : ""}`} key={message.id}>
              {!mine ? <Avatar name={message.sender} className="grid size-7 place-items-center rounded-full bg-[var(--green)] text-[11px] font-black text-white" /> : <span />}
              <div className={`max-w-[230px] rounded-2xl px-3 py-2.5 ${mine ? "bg-[var(--green)] text-white" : "bg-white text-[var(--ink)]"}`}>
                <span className={`mb-1 block text-[10px] font-black ${mine ? "text-white/75" : "text-[var(--muted)]"}`}>{message.sender}</span>
                <p className="m-0 text-xs leading-[1.55]">{message.body}</p>
                <small className={`mt-1 block text-[10px] ${mine ? "text-white/70" : "text-[var(--muted)]"}`}>
                  {message.time} · {mine ? (readCount > 1 ? "Read" : "Unread") : "Read"}
                </small>
              </div>
              {mine ? <Avatar name={message.sender} src={avatarDataUrl} className="grid size-7 place-items-center rounded-full bg-[var(--navy)] text-[11px] font-black text-white object-cover" /> : <span />}
            </article>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5" aria-label="Quick replies">
        {quickReplies.map((reply) => (
          <button className="rounded-full bg-[#f2eee7] px-2.5 py-1.5 text-[11px] font-black text-[var(--navy)]" type="button" key={reply} onClick={() => onSendMessage(reply)}>{reply}</button>
        ))}
      </div>
      <form className="grid grid-cols-[1fr_auto] gap-2" onSubmit={(event) => {
        event.preventDefault();
        sendDraft();
      }}>
        <input
          className="min-h-11 rounded-xl border border-[var(--line)] bg-[#fbfaf7] px-3 text-xs font-extrabold text-[var(--ink)]"
          placeholder={role === "teacher" ? "Type encouragement, reminders, or practice advice" : "Type a practice update or question"}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button className="rounded-xl bg-[var(--green)] px-3 text-xs font-black text-white" type="submit">Send</button>
      </form>
    </section>
  );
}

function TeacherChatTools({
  students,
  onCreateClassChat,
  onCreateDirectChat,
}: {
  students: AuthUser[];
  onCreateClassChat: (title: string, memberIds: string[]) => void;
  onCreateDirectChat: (studentId: string) => void;
}) {
  // Teacher tools create either class-wide or one-on-one conversations.
  const [classTitle, setClassTitle] = React.useState("Qiyin Class 1 Group");
  const [selectedStudentIds, setSelectedStudentIds] = React.useState<string[]>([]);
  const [directStudentId, setDirectStudentId] = React.useState("");

  React.useEffect(() => {
    // Keep selected ids valid when registered learner accounts change.
    setSelectedStudentIds((current) => current.filter((id) => students.some((student) => student.id === id)));
    setDirectStudentId((current) => current || students[0]?.id || "");
  }, [students]);

  function toggleClassStudent(studentId: string, checked: boolean) {
    // Checkbox state is stored as a unique list of learner ids.
    setSelectedStudentIds((current) =>
      checked ? [...new Set([...current, studentId])] : current.filter((id) => id !== studentId),
    );
  }

  return (
    <section className="grid gap-3 rounded-2xl border border-[rgba(53,84,110,0.12)] bg-white p-3.5" aria-label="Create Chat">
      <div className="grid gap-2.5">
        <span className={modelKickerClass}>Create Class Group</span>
        <label className="grid gap-1.5 text-xs font-extrabold text-[var(--muted)]">
          <span>Group name</span>
          <input className="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[#fbfaf7] px-3 text-[var(--ink)] font-extrabold" value={classTitle} onChange={(event) => setClassTitle(event.target.value)} placeholder="Example: Wednesday Tone Practice" />
        </label>
        <div className="flex flex-wrap gap-2" aria-label="Choose learners for the group">
          {students.map((student) => (
            <label className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-[rgba(32,154,120,0.18)] bg-[var(--green-soft)] px-2.5 py-[7px] text-[var(--green)]" key={student.id}>
              <input
                className="accent-[var(--green)]"
                type="checkbox"
                checked={selectedStudentIds.includes(student.id)}
                onChange={(event) => toggleClassStudent(student.id, event.target.checked)}
              />
              <span>{student.name || student.username}</span>
            </label>
          ))}
          {!students.length ? <p className="m-0 text-xs font-bold leading-[1.6] text-[var(--muted)]">No student accounts are registered yet.</p> : null}
        </div>
        <button className={primaryTeacherButtonClass} type="button" onClick={() => onCreateClassChat(classTitle, selectedStudentIds)} disabled={!selectedStudentIds.length}>Create Group</button>
      </div>
      <div className="grid gap-2.5 border-t border-[rgba(53,84,110,0.1)] pt-3">
        <span className={modelKickerClass}>Create Learner Chat</span>
        <label className="grid gap-1.5 text-xs font-extrabold text-[var(--muted)]">
          <span>Choose Learner</span>
          <select className="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[#fbfaf7] px-3 text-[var(--ink)] font-extrabold" value={directStudentId} onChange={(event) => setDirectStudentId(event.target.value)}>
            {students.map((student) => (
              <option value={student.id} key={student.id}>{student.name || student.username}</option>
            ))}
          </select>
        </label>
        <button className={secondaryTeacherButtonClass} type="button" onClick={() => onCreateDirectChat(directStudentId)} disabled={!directStudentId}>Start Chat</button>
      </div>
    </section>
  );
}

function StudentChatTools({
  teachers,
  onCreateStudentDirectChat,
}: {
  teachers: AuthUser[];
  onCreateStudentDirectChat: (teacherId: string) => void;
}) {
  // Learner tools create a direct conversation with one teacher.
  const [teacherId, setTeacherId] = React.useState("");

  React.useEffect(() => {
    // Default to the first available teacher account.
    setTeacherId((current) => current || teachers[0]?.id || "");
  }, [teachers]);

  return (
    <section className="grid gap-3 rounded-2xl border border-[rgba(53,84,110,0.12)] bg-white p-3.5" aria-label="Contact Teacher">
      <label className="grid gap-1.5 text-xs font-extrabold text-[var(--muted)]">
        <span>Choose Teacher</span>
        <select className="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[#fbfaf7] px-3 text-[var(--ink)] font-extrabold" value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
          {teachers.map((teacherUser) => (
            <option value={teacherUser.id} key={teacherUser.id}>{teacherUser.name || teacherUser.username}</option>
          ))}
        </select>
      </label>
      {!teachers.length ? <p className="m-0 text-xs font-bold leading-[1.6] text-[var(--muted)]">No teacher accounts are registered yet.</p> : null}
      <button className={secondaryTeacherButtonClass} type="button" onClick={() => onCreateStudentDirectChat(teacherId)} disabled={!teacherId}>Chat with Teacher</button>
    </section>
  );
}

// Account screen handles login/register state while preserving the legacy account layout.
