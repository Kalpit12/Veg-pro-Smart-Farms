import type { RoutePointLike } from "@/lib/route-metrics";
import { distanceBetweenPoints } from "@/lib/route-metrics";
import type { CoverageModel } from "@/lib/scouting-coverage";

export type AiScoutingInsight = {
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
};

export type AiScoutingReport = {
  summary: string;
  insights: AiScoutingInsight[];
};

/**
 * Heuristic post-round analysis (local "AI" insights — no external model required).
 */
export function analyzeScoutingRound(input: {
  distanceM: number;
  durationS: number;
  stopCount: number;
  pointCount: number;
  coverage: CoverageModel | null;
  stops: { issue: string; rating: number | null; recordedAt: string; columnNo: number; bayNo: number }[];
  routePoints: RoutePointLike[];
}): AiScoutingReport {
  const insights: AiScoutingInsight[] = [];
  const { coverage, stops, distanceM, durationS, stopCount, pointCount } = input;

  if (coverage && coverage.coveragePct < 50) {
    insights.push({
      severity: "warning",
      title: "Low greenhouse coverage",
      detail: `Only ${coverage.coveragePct}% of the column×bay grid was visited (${coverage.visitedCells}/${coverage.expectedCells} cells).`,
    });
  } else if (coverage && coverage.coveragePct < 80) {
    insights.push({
      severity: "info",
      title: "Partial coverage",
      detail: `${coverage.coveragePct}% of cells visited. Consider finishing missed bays on the next pass.`,
    });
  }

  if (coverage && coverage.missed.length) {
    const sample = coverage.missed
      .slice(0, 5)
      .map((m) => `Col ${m.columnNo} Bay ${m.bayNo}`)
      .join(", ");
    insights.push({
      severity: coverage.coveragePct < 60 ? "warning" : "info",
      title: "Areas skipped",
      detail: `Missed cells include: ${sample}${coverage.missed.length > 5 ? ` (+${coverage.missed.length - 5} more)` : ""}.`,
    });
  }

  if (durationS > 0 && durationS < 10 * 60 && (coverage?.expectedCells ?? 0) > 20) {
    insights.push({
      severity: "warning",
      title: "Unusually short inspection",
      detail: `Round lasted only ${Math.round(durationS / 60)} minutes for a full greenhouse grid.`,
    });
  }

  const highSeverity = stops.filter((s) => (s.rating ?? 0) >= 4);
  if (highSeverity.length >= 3) {
    insights.push({
      severity: "critical",
      title: "High concentration of severe reports",
      detail: `${highSeverity.length} observations rated 4–5. Prioritize spray follow-up.`,
    });
  }

  const byCell = new Map<string, number>();
  for (const s of stops) {
    const key = `${s.issue}|${s.columnNo}-${s.bayNo}`;
    byCell.set(key, (byCell.get(key) ?? 0) + 1);
  }
  const repeats = Array.from(byCell.entries()).filter(([, n]) => n >= 2);
  if (repeats.length) {
    insights.push({
      severity: "warning",
      title: "Repeated outbreak locations",
      detail: `${repeats.length} cell/issue combinations appeared more than once this round.`,
    });
  }

  if (pointCount < 5 && distanceM < 50 && stopCount > 0) {
    insights.push({
      severity: "info",
      title: "Sparse GPS track",
      detail: "Few route points were recorded — keep the field app open while walking for better coverage proof.",
    });
  }

  if (input.routePoints.length >= 3) {
    const midDist = distanceBetweenPoints(input.routePoints);
    if (midDist > 0 && durationS > 0) {
      const mPerMin = midDist / (durationS / 60);
      if (mPerMin > 80) {
        insights.push({
          severity: "info",
          title: "Fast walking pace",
          detail: `Average ~${Math.round(mPerMin)} m/min — verify observation quality was not rushed.`,
        });
      }
    }
  }

  if (!insights.length) {
    insights.push({
      severity: "info",
      title: "Round looks healthy",
      detail: "Coverage and observations are within expected ranges. No follow-up flags.",
    });
  }

  const summary = coverage
    ? `Scouted ${coverage.coveragePct}% of ${coverage.greenhouseName} · ${stopCount} observations · ${Math.round(distanceM)} m`
    : `Round complete · ${stopCount} observations · ${Math.round(distanceM)} m`;

  return { summary, insights };
}
