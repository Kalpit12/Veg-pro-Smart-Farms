import { compareStarGreenhouseName } from "@/lib/bemack-master-data";

export type TrendsArrowTone = "bad" | "okay";

export type TrendsArrowLevel = 1 | 2 | 3 | 4;

export type TrendsArrowState = {
  tone: TrendsArrowTone;
  count: TrendsArrowLevel;
  /** 0–100 pressure (badness) derived from rating */
  badPct: number;
  /** 0–100 wellness when tone is okay */
  okayPct: number;
};

/** Convert scouting rating (1–5) to Scarab arrow display. */
export function ratingToTrendArrows(rating: number): TrendsArrowState {
  const clamped = Math.min(5, Math.max(1, rating));
  const badPct = Math.round(((clamped - 1) / 4) * 100);

  if (badPct >= 50) {
    const count = pctToArrowCount(badPct);
    return { tone: "bad", count, badPct, okayPct: 100 - badPct };
  }

  const okayPct = 100 - badPct;
  const count = pctToArrowCount(okayPct);
  return { tone: "okay", count, badPct, okayPct };
}

/** Map a 0–100 percentage to 1–4 arrows (25% per arrow). */
export function pctToArrowCount(pct: number): TrendsArrowLevel {
  const n = Math.round(Math.min(100, Math.max(0, pct)) / 25);
  return Math.min(4, Math.max(1, n)) as TrendsArrowLevel;
}

export type TrendsScoutingRow = {
  greenhouseId: string;
  greenhouseName: string;
  recordedAt: string;
  rating: number | null;
  issueType?: string | null;
  issue?: string | null;
  variety?: string | null;
};

export type TrendsSprayRow = {
  greenhouseId: string;
  sprayedAt: string;
};

export type TrendsCell = {
  greenhouseId: string;
  greenhouseName: string;
  dateKey: string;
  avgRating: number;
  sampleCount: number;
  arrows: TrendsArrowState;
  sprayCount: number;
};

export type TrendsGridModel = {
  dates: string[];
  /** Display labels for columns (daily or week range) */
  dateLabels: Record<string, string>;
  greenhouses: { id: string; name: string }[];
  /** key = `${greenhouseId}|${dateKey}` */
  cells: Map<string, TrendsCell>;
  summary: TrendsSummary;
};

export type TrendsSummary = {
  housesScouted: number;
  housesTotal: number;
  housesHighPressure: number;
  housesImproved: number;
  housesWorsened: number;
  coveragePct: number;
  lastScoutedByHouse: Map<string, string>;
};

export function trendsCellKey(greenhouseId: string, dateKey: string) {
  return `${greenhouseId}|${dateKey}`;
}

export function filterTrendsRows(
  rows: TrendsScoutingRow[],
  filters: {
    issueType?: string;
    issue?: string;
    variety?: string;
  },
): TrendsScoutingRow[] {
  return rows.filter((row) => {
    if (filters.issueType && filters.issueType !== "all") {
      if ((row.issueType ?? "") !== filters.issueType) return false;
    }
    if (filters.issue && filters.issue !== "all") {
      if ((row.issue ?? "") !== filters.issue) return false;
    }
    if (filters.variety && filters.variety !== "all") {
      if ((row.variety ?? "") !== filters.variety) return false;
    }
    return true;
  });
}

/** Bucket a calendar date into a column key (day or week start). */
export function toColumnKey(isoDate: string, mode: "day" | "week"): string {
  const day = isoDate.slice(0, 10);
  if (mode === "day") return day;

  const d = new Date(`${day}T12:00:00`);
  const dayOfWeek = d.getDay(); // 0 Sun … 6 Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + mondayOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function buildTrendsGrid(
  rows: TrendsScoutingRow[],
  options: {
    dates: string[];
    greenhouses: { id: string; name: string }[];
    mode?: "day" | "week";
    sprays?: TrendsSprayRow[];
    dateLabels?: Record<string, string>;
  },
): TrendsGridModel {
  const mode = options.mode ?? "day";
  const dateSet = new Set(options.dates);
  const buckets = new Map<string, { sum: number; count: number; name: string }>();
  const lastScoutedByHouse = new Map<string, string>();

  for (const row of rows) {
    if (row.rating == null) continue;
    const dayKey = row.recordedAt.slice(0, 10);
    const colKey = toColumnKey(dayKey, mode);
    if (!dateSet.has(colKey)) continue;

    const prevLast = lastScoutedByHouse.get(row.greenhouseId);
    if (!prevLast || dayKey > prevLast) {
      lastScoutedByHouse.set(row.greenhouseId, dayKey);
    }

    const key = trendsCellKey(row.greenhouseId, colKey);
    const prev = buckets.get(key) ?? {
      sum: 0,
      count: 0,
      name: row.greenhouseName,
    };
    prev.sum += row.rating;
    prev.count += 1;
    prev.name = row.greenhouseName || prev.name;
    buckets.set(key, prev);
  }

  const sprayCounts = new Map<string, number>();
  for (const spray of options.sprays ?? []) {
    const colKey = toColumnKey(spray.sprayedAt.slice(0, 10), mode);
    if (!dateSet.has(colKey)) continue;
    const key = trendsCellKey(spray.greenhouseId, colKey);
    sprayCounts.set(key, (sprayCounts.get(key) ?? 0) + 1);
  }

  const cells = new Map<string, TrendsCell>();
  for (const gh of options.greenhouses) {
    for (const dateKey of options.dates) {
      const key = trendsCellKey(gh.id, dateKey);
      const bucket = buckets.get(key);
      const sprayCount = sprayCounts.get(key) ?? 0;
      if ((!bucket || bucket.count === 0) && sprayCount === 0) continue;

      if (!bucket || bucket.count === 0) {
        // Spray-only day: UI shows spray marker, not arrows (sampleCount === 0).
        cells.set(key, {
          greenhouseId: gh.id,
          greenhouseName: gh.name,
          dateKey,
          avgRating: 0,
          sampleCount: 0,
          arrows: { tone: "okay", count: 1, badPct: 0, okayPct: 100 },
          sprayCount,
        });
        continue;
      }

      const avgRating = bucket.sum / bucket.count;
      cells.set(key, {
        greenhouseId: gh.id,
        greenhouseName: gh.name,
        dateKey,
        avgRating: Math.round(avgRating * 10) / 10,
        sampleCount: bucket.count,
        arrows: ratingToTrendArrows(avgRating),
        sprayCount,
      });
    }
  }

  const summary = computeTrendsSummary(
    options.greenhouses,
    options.dates,
    cells,
    lastScoutedByHouse,
  );

  return {
    dates: options.dates,
    dateLabels: options.dateLabels ?? Object.fromEntries(options.dates.map((d) => [d, d])),
    greenhouses: options.greenhouses,
    cells,
    summary,
  };
}

function computeTrendsSummary(
  greenhouses: { id: string; name: string }[],
  dates: string[],
  cells: Map<string, TrendsCell>,
  lastScoutedByHouse: Map<string, string>,
): TrendsSummary {
  const latest = dates[dates.length - 1];
  const prev = dates.length >= 2 ? dates[dates.length - 2] : null;

  let housesScouted = 0;
  let housesHighPressure = 0;
  let housesImproved = 0;
  let housesWorsened = 0;

  for (const gh of greenhouses) {
    if (lastScoutedByHouse.has(gh.id)) housesScouted += 1;

    const latestCell = latest
      ? cells.get(trendsCellKey(gh.id, latest))
      : undefined;
    if (latestCell && latestCell.sampleCount > 0 && latestCell.arrows.tone === "bad") {
      housesHighPressure += 1;
    }

    if (prev && latestCell && latestCell.sampleCount > 0) {
      const prevCell = cells.get(trendsCellKey(gh.id, prev));
      if (prevCell && prevCell.sampleCount > 0) {
        if (latestCell.avgRating < prevCell.avgRating - 0.15) housesImproved += 1;
        if (latestCell.avgRating > prevCell.avgRating + 0.15) housesWorsened += 1;
      }
    }
  }

  const coveragePct =
    greenhouses.length === 0
      ? 0
      : Math.round((housesScouted / greenhouses.length) * 100);

  return {
    housesScouted,
    housesTotal: greenhouses.length,
    housesHighPressure,
    housesImproved,
    housesWorsened,
    coveragePct,
    lastScoutedByHouse,
  };
}

export type GreenhouseSeveritySort = {
  id: string;
  name: string;
  latestBadPct: number;
  latestRating: number | null;
  hasLatest: boolean;
};

/** Sort greenhouses worst-first by latest column pressure. */
export function sortGreenhousesBySeverity(
  greenhouses: { id: string; name: string }[],
  cells: Map<string, TrendsCell>,
  latestDate: string | undefined,
  order: "worst" | "name",
): { id: string; name: string }[] {
  if (order === "name" || !latestDate) {
    return [...greenhouses].sort((a, b) => compareStarGreenhouseName(a.name, b.name));
  }

  return [...greenhouses]
    .map((gh) => {
      const cell = cells.get(trendsCellKey(gh.id, latestDate));
      const latestRating =
        cell && cell.sampleCount > 0 ? cell.avgRating : null;
      const latestBadPct =
        cell && cell.sampleCount > 0 ? cell.arrows.badPct : -1;
      return { ...gh, latestBadPct, latestRating };
    })
    .sort((a, b) => {
      if (b.latestBadPct !== a.latestBadPct) return b.latestBadPct - a.latestBadPct;
      return compareStarGreenhouseName(a.name, b.name);
    })
    .map(({ id, name }) => ({ id, name }));
}

export function collectFilterOptions(rows: TrendsScoutingRow[]) {
  const issues = new Set<string>();
  const varieties = new Set<string>();
  const issueTypes = new Set<string>();

  for (const row of rows) {
    if (row.issue) issues.add(row.issue);
    if (row.variety) varieties.add(row.variety);
    if (row.issueType) issueTypes.add(row.issueType);
  }

  return {
    issues: Array.from(issues).sort(),
    varieties: Array.from(varieties).sort(),
    issueTypes: Array.from(issueTypes).sort(),
  };
}
