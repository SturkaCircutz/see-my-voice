import type { PracticeAttempt } from "../types";
import { attemptScore } from "./utils";

export function practiceStreakDays(attempts: PracticeAttempt[], now = new Date()) {
  const practicedDates = new Set(
    attempts
      .map((attempt) => new Date(attempt.createdAt))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map((date) => date.toISOString().slice(0, 10)),
  );
  const cursor = new Date(now);
  let streak = 0;

  while (practicedDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function progressCalendarDays(attempts: PracticeAttempt[], count = 14) {
  const practiced = new Set(
    attempts
      .map((attempt) => new Date(attempt.createdAt))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map((date) => date.toISOString().slice(0, 10)),
  );
  const today = new Date();
  const selectedDate = today.toISOString().slice(0, 10);
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (count - 1 - offset));
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      label: progressDateLabel(key),
      practiced: practiced.has(key),
      today: key === selectedDate,
      selected: key === selectedDate,
    };
  });
}

export function progressChartScores(attempts: PracticeAttempt[]) {
  const attemptScores = attempts
    .slice(0, 7)
    .map((attempt) => Math.round(attemptScore(attempt)))
    .reverse();
  return attemptScores.length ? [...Array(Math.max(0, 7 - attemptScores.length)).fill(0), ...attemptScores] : [];
}

export function progressChartLabels(attempts: PracticeAttempt[], count: number) {
  const attemptLabels = attempts
    .slice(0, count)
    .map((attempt) => progressDateLabel(attempt.createdAt))
    .reverse();
  if (attemptLabels.length) return [...Array(Math.max(0, count - attemptLabels.length)).fill(""), ...attemptLabels];
  return recentProgressLabels(count);
}

function recentProgressLabels(count: number) {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (count - 1 - index));
    return progressDateLabel(date.toISOString());
  });
}

function progressDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// Small SVG chart used by the progress screen.
export function ProgressTrendChart({
  scores,
  labels,
  latestScore,
}: {
  scores: number[];
  labels: string[];
  latestScore: number;
}) {
  const min = 50;
  const max = 90;
  const width = 320;
  const height = 124;
  const padding = { top: 15, right: 13, bottom: 25, left: 13 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const hasScores = scores.some((score) => score > 0);
  const normalized = scores.map((score) => (score > 0 ? 100 - ((score - min) / (max - min)) * 100 : 100));
  const points = normalized.map((value, index) => {
    const x = padding.left + (innerWidth * index) / Math.max(normalized.length - 1, 1);
    const y = padding.top + (innerHeight * value) / 100;
    return { x, y, value };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <svg className="block h-[124px] w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="This week overall score line chart">
      {[0, 1, 2].map((row) => {
        const y = padding.top + (innerHeight * row) / 2;
        return <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#ece8e0" strokeWidth="1" key={row} />;
      })}
      {hasScores ? (
        <>
          <polyline points={polyline} fill="none" stroke="#cf4b31" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => (
            <circle cx={point.x} cy={point.y} r={index === points.length - 1 ? 4 : 3} fill="#cf4b31" key={`${point.x}-${point.y}`} />
          ))}
        </>
      ) : (
        <text x={width / 2} y={padding.top + innerHeight / 2} fill="#aaa6ad" fontSize="13" fontWeight="700" textAnchor="middle">
          No practice data yet
        </text>
      )}
      {labels.map((label, index) => {
        const x = padding.left + (innerWidth * index) / Math.max(labels.length - 1, 1);
        return (
          <text x={x} y={height - 6} fill="#aaa6ad" fontSize="10" textAnchor="middle" key={label}>
            {label}
          </text>
        );
      })}
      <text x={width - padding.right} y="11" fill="#cf4b31" fontSize="11" fontWeight="700" textAnchor="end">
        {latestScore ? `${latestScore} ` : "No Practice"}
      </text>
    </svg>
  );
}
