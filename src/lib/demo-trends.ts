import { addDays, format, subDays } from "date-fns";

import {
  BEMACK_DISEASES,
  BEMACK_GREENHOUSES,
  BEMACK_PESTS,
  BEMACK_VARIETIES,
  bemackGreenhouseId,
} from "@/lib/bemack-master-data";
import {
  buildTrendsGrid,
  toColumnKey,
  type TrendsGridModel,
  type TrendsScoutingRow,
  type TrendsSprayRow,
} from "@/lib/trends-arrows";

/** Stable pseudo-random 0–1 from greenhouse index + day offset. */
function demoNoise(ghIndex: number, dayOffset: number) {
  const x = Math.sin(ghIndex * 12.9898 + dayOffset * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const DEMO_ISSUES = [
  ...BEMACK_PESTS.slice(0, 4).map((name) => ({
    issueType: "pest" as const,
    issue: name,
  })),
  ...BEMACK_DISEASES.slice(0, 4).map((name) => ({
    issueType: "disease" as const,
    issue: name,
  })),
];

const DEMO_VARIETIES = [...BEMACK_VARIETIES["Cut Rose"].slice(0, 7)];

/**
 * Scarab-like demo matrix: every Star greenhouse × lookback days with
 * issue/variety metadata so filters work offline.
 */
export function buildDemoTrendsRows(days: number): TrendsScoutingRow[] {
  const rows: TrendsScoutingRow[] = [];

  for (let d = days - 1; d >= 0; d--) {
    const day = subDays(new Date(), d);
    day.setHours(10, 0, 0, 0);
    const iso = day.toISOString();

    BEMACK_GREENHOUSES.forEach((name, ghIndex) => {
      if (demoNoise(ghIndex, d) < 0.12) return;

      const issueMeta = DEMO_ISSUES[(ghIndex + d) % DEMO_ISSUES.length]!;
      const variety = DEMO_VARIETIES[(ghIndex * 3 + d) % DEMO_VARIETIES.length]!;

      const base = 1.5 + (ghIndex % 5) * 0.55;
      const wave = Math.sin((d + ghIndex) / 3.2) * 1.2;
      const jitter = demoNoise(ghIndex + 3, d + 7) * 1.4 - 0.7;
      const rating = Math.min(5, Math.max(1, Math.round(base + wave + jitter)));

      rows.push({
        greenhouseId: bemackGreenhouseId(name),
        greenhouseName: name,
        recordedAt: iso,
        rating,
        issueType: issueMeta.issueType,
        issue: issueMeta.issue,
        variety,
      });

      // Second observation some days (different issue) for richer filters
      if (demoNoise(ghIndex + 9, d) > 0.55) {
        const other = DEMO_ISSUES[(ghIndex + d + 3) % DEMO_ISSUES.length]!;
        rows.push({
          greenhouseId: bemackGreenhouseId(name),
          greenhouseName: name,
          recordedAt: iso,
          rating: Math.min(5, Math.max(1, rating + (demoNoise(ghIndex, d + 2) > 0.5 ? 1 : -1))),
          issueType: other.issueType,
          issue: other.issue,
          variety,
        });
      }
    });
  }

  return rows;
}

export function buildDemoSprayRows(days: number): TrendsSprayRow[] {
  const sprays: TrendsSprayRow[] = [];
  for (let d = days - 1; d >= 0; d--) {
    BEMACK_GREENHOUSES.forEach((name, ghIndex) => {
      if (demoNoise(ghIndex + 11, d) < 0.88) return;
      const day = subDays(new Date(), d);
      day.setHours(14, 30, 0, 0);
      sprays.push({
        greenhouseId: bemackGreenhouseId(name),
        sprayedAt: day.toISOString(),
      });
    });
  }
  return sprays;
}

export function listTrendDateKeys(days: number, mode: "day" | "week" = "day"): string[] {
  if (mode === "day") {
    const keys: string[] = [];
    for (let d = days - 1; d >= 0; d--) {
      keys.push(format(subDays(new Date(), d), "yyyy-MM-dd"));
    }
    return keys;
  }

  const weekStarts = new Set<string>();
  for (let d = days - 1; d >= 0; d--) {
    const day = format(subDays(new Date(), d), "yyyy-MM-dd");
    weekStarts.add(toColumnKey(day, "week"));
  }
  return Array.from(weekStarts).sort();
}

export function buildTrendDateLabels(
  dates: string[],
  mode: "day" | "week",
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const key of dates) {
    if (mode === "day") {
      labels[key] = format(new Date(`${key}T12:00:00`), "dd MMM");
    } else {
      const start = new Date(`${key}T12:00:00`);
      const end = addDays(start, 6);
      labels[key] = `${format(start, "dd MMM")}–${format(end, "dd MMM")}`;
    }
  }
  return labels;
}

export function bemackTrendGreenhouses() {
  return BEMACK_GREENHOUSES.map((name) => ({
    id: bemackGreenhouseId(name),
    name,
  }));
}

export function buildDemoTrendsGrid(
  days: number,
  mode: "day" | "week" = "day",
): TrendsGridModel {
  const dates = listTrendDateKeys(days, mode);
  return buildTrendsGrid(buildDemoTrendsRows(days), {
    dates,
    greenhouses: bemackTrendGreenhouses(),
    mode,
    sprays: buildDemoSprayRows(days),
    dateLabels: buildTrendDateLabels(dates, mode),
  });
}
