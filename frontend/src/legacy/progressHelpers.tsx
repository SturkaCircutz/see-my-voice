import type { PracticeAttempt } from "../types";
import { attemptScore } from "./utils";

export function practiceStreakDays(attempts: PracticeAttempt[], now = new Date()) {
  // Count consecutive calendar days that contain at least one practice attempt.
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
  // Build a fixed-width calendar strip ending today.
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
  // Show at most seven recent scores in chronological order.
  const attemptScores = attempts
    .slice(0, 7)
    .map((attempt) => Math.round(attemptScore(attempt)))
    .reverse();
  return attemptScores.length ? [...Array(Math.max(0, 7 - attemptScores.length)).fill(0), ...attemptScores] : [];
}

export function progressChartLabels(attempts: PracticeAttempt[], count: number) {
  // Labels follow real attempts when available, otherwise recent dates.
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

type TrendPoint = {
  x: number;
  y: number;
  score: number;
  index: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundedDomain(scores: number[]) {
  // Use an adaptive axis so low scores are not clipped at the card bottom.
  if (!scores.length) return { min: 0, mid: 50, max: 100 };
  const low = Math.min(...scores);
  const high = Math.max(...scores);
  const spread = Math.max(high - low, 12);
  const buffer = Math.max(8, spread * 0.28);
  let min = Math.max(0, Math.floor((low - buffer) / 5) * 5);
  let max = Math.min(100, Math.ceil((high + buffer) / 5) * 5);

  if (max - min < 20) {
    const midpoint = (max + min) / 2;
    min = Math.max(0, Math.floor((midpoint - 10) / 5) * 5);
    max = Math.min(100, Math.ceil((midpoint + 10) / 5) * 5);
  }

  if (max <= min) max = Math.min(100, min + 20);
  return { min, mid: Math.round((min + max) / 2), max };
}

function smoothTrendPath(points: TrendPoint[]) {
  // Curved SVG paths give the chart a softer product feel.
  if (!points.length) return "";
  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x - 16} ${point.y} L ${point.x + 16} ${point.y}`;
  }

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const middleX = (previous.x + point.x) / 2;
    return `${path} C ${middleX} ${previous.y}, ${middleX} ${point.y}, ${point.x} ${point.y}`;
  }, "");
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
  // The chart is pure SVG so it renders consistently without a chart library.
  const width = 360;
  const height = 184;
  const padding = { top: 30, right: 22, bottom: 42, left: 40 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const chartBottom = padding.top + innerHeight;
  const slotCount = Math.max(scores.length, labels.length, 7);
  const chartScores = Array.from({ length: slotCount }, (_, index) => {
    const score = scores[index] ?? 0;
    return Number.isFinite(score) ? clamp(Math.round(score), 0, 100) : 0;
  });
  const plottedScores = chartScores.filter((score) => score > 0);
  const hasScores = plottedScores.length > 0;
  const domain = roundedDomain(plottedScores);
  const points = chartScores
    .map((score, index) => {
      if (!score) return null;
      const x = padding.left + (innerWidth * index) / Math.max(slotCount - 1, 1);
      const y = padding.top + ((domain.max - score) / Math.max(domain.max - domain.min, 1)) * innerHeight;
      return { x, y: clamp(y, padding.top, chartBottom), score, index };
    })
    .filter((point): point is TrendPoint => Boolean(point));
  const firstPoint = points[0];
  const latestPoint = points[points.length - 1];
  const linePath = smoothTrendPath(points);
  const pathStartX = points.length === 1 && firstPoint ? firstPoint.x - 16 : firstPoint?.x || padding.left;
  const pathEndX = points.length === 1 && latestPoint ? latestPoint.x + 16 : latestPoint?.x || padding.left;
  const areaPath = hasScores
    ? `${linePath} L ${pathEndX} ${chartBottom} L ${pathStartX} ${chartBottom} Z`
    : "";
  const tooltipWidth = 88;
  const tooltipX = latestPoint ? clamp(latestPoint.x - tooltipWidth + 18, padding.left, width - padding.right - tooltipWidth) : 0;
  const tooltipY = latestPoint ? clamp(latestPoint.y - 34, padding.top - 16, chartBottom - 30) : 0;
  const axisLabels = [domain.max, domain.mid, domain.min];
  const displayLabels = Array.from({ length: slotCount }, (_, index) => labels[index] || "");

  return (
    <svg className="block h-[184px] w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="This week overall score line chart">
      <defs>
        <linearGradient id="progress-trend-line" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#e99555" />
          <stop offset="100%" stopColor="#cf4b31" />
        </linearGradient>
        <linearGradient id="progress-trend-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#cf4b31" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#cf4b31" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2].map((row) => {
        const y = padding.top + (innerHeight * row) / 2;
        return (
          <g key={row}>
            <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#eee7dc" strokeWidth="1" />
            <text x={padding.left - 10} y={y + 4} fill="#766f78" fontSize="10" fontWeight="700" textAnchor="end">
              {axisLabels[row]}
            </text>
          </g>
        );
      })}
      {hasScores ? (
        <>
          <path className="smv-chart-area" d={areaPath} fill="url(#progress-trend-area)" />
          <path className="smv-chart-line" d={linePath} fill="none" stroke="url(#progress-trend-line)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
          {points.map((point, index) => (
            <g className="smv-fade-in" key={`${point.index}-${point.score}`}>
              {index === points.length - 1 ? <circle cx={point.x} cy={point.y} r="8" fill="#cf4b31" opacity="0.14" /> : null}
              <circle cx={point.x} cy={point.y} r={index === points.length - 1 ? 4.8 : 3.4} fill="#cf4b31" stroke="#fffefa" strokeWidth="2" />
            </g>
          ))}
          {latestPoint ? (
            <g className="smv-fade-in">
              <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height="24" rx="12" fill="#fffefa" stroke="rgba(207,75,49,0.16)" />
              <text x={tooltipX + tooltipWidth / 2} y={tooltipY + 16} fill="#cf4b31" fontSize="11" fontWeight="800" textAnchor="middle">
                Latest {latestPoint.score || latestScore}
              </text>
            </g>
          ) : null}
        </>
      ) : (
        <text x={width / 2} y={padding.top + innerHeight / 2 + 4} fill="#766f78" fontSize="13" fontWeight="800" textAnchor="middle">
          No practice data yet
        </text>
      )}
      {displayLabels.map((label, index) => {
        if (!label) return null;
        const x = padding.left + (innerWidth * index) / Math.max(slotCount - 1, 1);
        return (
          <text x={x} y={height - 12} fill="#817a82" fontSize="10" fontWeight="700" textAnchor="middle" key={`${label}-${index}`}>
            {label}
          </text>
        );
      })}
    </svg>
  );
}
