import type { DemoScoutingRecord } from "@/store/scouting-store";
import type { ScoutingIssueType } from "@/types/db";

export type GridCell = {
  column: number;
  bay: number;
  score: number;
  count: number;
  topIssue: string | null;
  issueType: ScoutingIssueType | null;
};

export type GreenhouseGridModel = {
  greenhouse: string;
  maxColumn: number;
  maxBay: number;
  cells: GridCell[];
};

export type ScoutingGridInput = {
  greenhouseName: string;
  columnNo: number;
  bayNo: number;
  issueType: ScoutingIssueType;
  issue: string;
  rating: number | null;
};

function cellScore(rating: number | null, issueType: ScoutingIssueType) {
  const base = rating ?? 3;
  const weight = issueType === "disease" ? 1.05 : 1;
  return Math.min(100, Math.round(base * 20 * weight));
}

export function buildGreenhouseGrid(
  records: ScoutingGridInput[],
  greenhouse: string,
): GreenhouseGridModel | null {
  const filtered = records.filter((r) => r.greenhouseName === greenhouse);
  if (!filtered.length) return null;

  const map = new Map<string, GridCell>();

  for (const r of filtered) {
    const key = `${r.columnNo}-${r.bayNo}`;
    const score = cellScore(r.rating, r.issueType);
    const existing = map.get(key);
    if (!existing || score > existing.score) {
      map.set(key, {
        column: r.columnNo,
        bay: r.bayNo,
        score,
        count: (existing?.count ?? 0) + 1,
        topIssue: r.issue,
        issueType: r.issueType,
      });
    } else {
      existing.count += 1;
    }
  }

  const cells = Array.from(map.values());
  return {
    greenhouse,
    maxColumn: Math.max(...cells.map((c) => c.column), 1),
    maxBay: Math.max(...cells.map((c) => c.bay), 1),
    cells,
  };
}

export function gridFromDemoRecords(
  records: DemoScoutingRecord[],
  greenhouse: string,
): GreenhouseGridModel | null {
  return buildGreenhouseGrid(
    records.map((r) => ({
      greenhouseName: r.greenhouseName,
      columnNo: r.columnNo,
      bayNo: r.bayNo,
      issueType: r.issueType,
      issue: r.issue,
      rating: r.rating,
    })),
    greenhouse,
  );
}

export function scoreColor(score: number) {
  if (score >= 80) return "bg-red-600";
  if (score >= 60) return "bg-orange-500";
  if (score >= 40) return "bg-amber-400";
  if (score >= 20) return "bg-yellow-300";
  return "bg-emerald-400/80";
}
