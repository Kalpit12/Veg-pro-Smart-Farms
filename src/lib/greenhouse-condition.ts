import { format, subDays } from "date-fns";

import { getHistorySinceDate, HISTORY_LOOKBACK_MONTHS } from "@/lib/history-range";

export type ConditionSnapshot = {
  periodLabel: string;
  recordedAt: string;
  healthScore: number;
  avgSeverity: number;
  activeIssues: number;
  resolvedIssues: number;
  summary: string;
  primaryIssue: string;
};

export type GreenhouseConditionCompare = {
  greenhouseId: string;
  greenhouse: string;
  farm: string;
  baseline: ConditionSnapshot;
  current: ConditionSnapshot;
  healthDelta: number;
  severityDelta: number;
  issuesResolved: number;
  percentImproved: number;
  trend: "improved" | "stable" | "worsened";
};

export type ImprovementTrendPoint = {
  label: string;
  healthScore: number;
  avgSeverity: number;
  sprays: number;
  reports: number;
};

export type HistoryRecordForCondition = {
  type: "report" | "spray";
  created_at: string;
  greenhouse_id: string;
  greenhouse: string;
  farm: string;
  title: string;
  detail: string;
  severity?: number;
  status?: string;
};

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function healthFromMetrics(avgSeverity: number, activeIssues: number) {
  const raw = 100 - avgSeverity * 14 - activeIssues * 6;
  return Math.max(8, Math.min(98, Math.round(raw)));
}

function snapshotFromItems(
  items: HistoryRecordForCondition[],
  periodLabel: string,
  recordedAt: Date,
): ConditionSnapshot {
  const reports = items.filter((i) => i.type === "report");
  const severities = reports
    .map((r) => r.severity ?? 3)
    .filter((s) => s > 0);
  const avgSeverity = severities.length ? avg(severities) : 2;
  const activeIssues = reports.filter(
    (r) => r.status === "active" || !r.status,
  ).length;
  const resolvedIssues = reports.filter(
    (r) => r.status === "resolved" || r.status === "sprayed",
  ).length;
  const sprays = items.filter((i) => i.type === "spray").length;

  const primaryIssue =
    reports.sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0))[0]?.title ??
    (sprays > 0 ? "Treatment in progress" : "No major issues");

  let summary: string;
  if (avgSeverity >= 4) {
    summary = `High pest pressure — ${primaryIssue} affecting crop zones.`;
  } else if (avgSeverity >= 3) {
    summary = `Moderate risk — ${primaryIssue} under active management.`;
  } else {
    summary = `Stable conditions — ${primaryIssue} largely under control.`;
  }

  return {
    periodLabel,
    recordedAt: recordedAt.toISOString(),
    healthScore: healthFromMetrics(avgSeverity, activeIssues),
    avgSeverity: Math.round(avgSeverity * 10) / 10,
    activeIssues,
    resolvedIssues,
    summary,
    primaryIssue,
  };
}

export function computeGreenhouseCondition(
  items: HistoryRecordForCondition[],
  greenhouseId: string,
): GreenhouseConditionCompare | null {
  const ghItems = items.filter((i) => i.greenhouse_id === greenhouseId);
  if (!ghItems.length) return null;

  const sample = ghItems[0];
  const since = getHistorySinceDate();
  const now = new Date();

  const baselineEnd = subDays(since, -21);
  const baselineItems = ghItems.filter((i) => {
    const d = new Date(i.created_at);
    return d >= since && d <= baselineEnd;
  });

  const currentStart = subDays(now, 21);
  const currentItems = ghItems.filter((i) => new Date(i.created_at) >= currentStart);

  const baseline = snapshotFromItems(
    baselineItems.length ? baselineItems : ghItems.slice(-4),
    `${HISTORY_LOOKBACK_MONTHS} months ago`,
    since,
  );
  const current = snapshotFromItems(
    currentItems.length ? currentItems : ghItems.slice(0, 6),
    "Now",
    now,
  );

  const healthDelta = current.healthScore - baseline.healthScore;
  const severityDelta =
    Math.round((baseline.avgSeverity - current.avgSeverity) * 10) / 10;
  const issuesResolved = Math.max(
    0,
    current.resolvedIssues - baseline.resolvedIssues + current.resolvedIssues,
  );
  const percentImproved =
    baseline.healthScore > 0
      ? Math.round((healthDelta / baseline.healthScore) * 100)
      : healthDelta;

  let trend: GreenhouseConditionCompare["trend"] = "stable";
  if (healthDelta >= 8) trend = "improved";
  else if (healthDelta <= -8) trend = "worsened";

  return {
    greenhouseId,
    greenhouse: sample.greenhouse,
    farm: sample.farm,
    baseline,
    current,
    healthDelta,
    severityDelta,
    issuesResolved,
    percentImproved,
    trend,
  };
}

const TREND_WEEKS = 13;

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

/** Demo / sparse-data curve anchored to baseline → current snapshots */
export function buildImprovementTrendFromCompare(
  compare: GreenhouseConditionCompare,
): ImprovementTrendPoint[] {
  const since = getHistorySinceDate();
  const bumps = [0, -4, 2, -3, 5, -2, 4, 0, 3, -1, 2, 1, 0];

  return Array.from({ length: TREND_WEEKS }, (_, i) => {
    const t = i / (TREND_WEEKS - 1);
    const eased = smoothstep(t);
    const weekDate = new Date(since);
    weekDate.setDate(weekDate.getDate() + i * 7);

    const healthBase =
      compare.baseline.healthScore +
      (compare.current.healthScore - compare.baseline.healthScore) * eased;
    const severityBase =
      compare.baseline.avgSeverity +
      (compare.current.avgSeverity - compare.baseline.avgSeverity) * eased;

    return {
      label: format(weekDate, "MMM d"),
      healthScore: Math.max(
        8,
        Math.min(98, Math.round(healthBase + (bumps[i] ?? 0))),
      ),
      avgSeverity: Math.max(
        1,
        Math.min(
          5,
          Math.round((severityBase + (bumps[TREND_WEEKS - 1 - i] ?? 0) * 0.08) * 10) /
            10,
        ),
      ),
      sprays: Math.max(0, Math.round(1 + eased * 3 + (i % 3 === 0 ? 1 : 0))),
      reports: Math.max(0, Math.round(2 - eased * 1.2 + (i % 4 === 0 ? 1 : 0))),
    };
  });
}

export function computeImprovementTrend(
  items: HistoryRecordForCondition[],
  greenhouseId: string,
  compare?: GreenhouseConditionCompare | null,
): ImprovementTrendPoint[] {
  const ghItems = items.filter((i) => i.greenhouse_id === greenhouseId);
  if (!ghItems.length && compare) {
    return buildImprovementTrendFromCompare(compare);
  }

  const since = getHistorySinceDate();
  const points: ImprovementTrendPoint[] = [];

  for (let w = 0; w < TREND_WEEKS; w++) {
    const weekStart = new Date(since);
    weekStart.setDate(weekStart.getDate() + w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekItems = ghItems.filter((i) => {
      const d = new Date(i.created_at);
      return d >= weekStart && d < weekEnd;
    });

    const reports = weekItems.filter((i) => i.type === "report");
    const sprays = weekItems.filter((i) => i.type === "spray");

    let healthScore: number;
    let avgSeverity: number;

    if (reports.length) {
      const snap = snapshotFromItems(weekItems, "", weekStart);
      healthScore = snap.healthScore;
      avgSeverity = snap.avgSeverity;
    } else if (compare) {
      const t = w / (TREND_WEEKS - 1);
      const eased = smoothstep(t);
      healthScore = Math.round(
        compare.baseline.healthScore +
          (compare.current.healthScore - compare.baseline.healthScore) * eased,
      );
      avgSeverity =
        Math.round(
          (compare.baseline.avgSeverity +
            (compare.current.avgSeverity - compare.baseline.avgSeverity) *
              eased) *
            10,
        ) / 10;
    } else {
      healthScore = 50;
      avgSeverity = 3;
    }

    points.push({
      label: format(weekStart, "MMM d"),
      healthScore,
      avgSeverity,
      sprays: sprays.length,
      reports: reports.length,
    });
  }

  return points;
}
