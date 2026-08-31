import { BEMACK_GREENHOUSES } from "@/lib/bemack-master-data";
import type { DemoScoutingRecord } from "@/store/scouting-store";
import type { ScoutingIssueType } from "@/types/db";

export type PressureByGreenhouse = {
  greenhouse: string;
  diseasePressure: number;
  pestPressure: number;
  recordCount: number;
};

export type PressureByVariety = {
  greenhouse: string;
  variety: string;
  issueType: ScoutingIssueType;
  issue: string;
  avgRating: number;
  count: number;
};

export type GreenhouseChartRow = {
  greenhouse: string;
  disease: number;
  pest: number;
};

function avgRating(records: DemoScoutingRecord[]) {
  const rated = records.filter((r) => r.rating != null);
  if (!rated.length) return 0;
  return rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length;
}

function roundRating(value: number) {
  return Math.round(value * 10) / 10;
}

export function pressureByGreenhouse(records: DemoScoutingRecord[]): PressureByGreenhouse[] {
  const byGh = new Map<string, DemoScoutingRecord[]>();
  for (const r of records) {
    const list = byGh.get(r.greenhouseName) ?? [];
    list.push(r);
    byGh.set(r.greenhouseName, list);
  }

  return Array.from(byGh.entries())
    .map(([greenhouse, items]) => {
      const diseases = items.filter((i) => i.issueType === "disease");
      const pests = items.filter((i) => i.issueType === "pest");
      return {
        greenhouse,
        diseasePressure: roundRating(avgRating(diseases)),
        pestPressure: roundRating(avgRating(pests)),
        recordCount: items.length,
      };
    })
    .sort((a, b) => b.diseasePressure + b.pestPressure - (a.diseasePressure + a.pestPressure));
}

export function mergeGreenhouseChartRows(
  rows: { greenhouse: string; diseasePressure: number; pestPressure: number }[],
): GreenhouseChartRow[] {
  const map = new Map(rows.map((r) => [r.greenhouse, r]));
  return BEMACK_GREENHOUSES.map((gh) => {
    const row = map.get(gh);
    return {
      greenhouse: gh,
      disease: row?.diseasePressure ?? 0,
      pest: row?.pestPressure ?? 0,
    };
  }).sort(
    (a, b) =>
      b.disease + b.pest - (a.disease + a.pest) ||
      a.greenhouse.localeCompare(b.greenhouse),
  );
}

export function pressureByVariety(records: DemoScoutingRecord[]): PressureByVariety[] {
  const map = new Map<string, DemoScoutingRecord[]>();
  for (const r of records) {
    const key = `${r.greenhouseName}|${r.variety}|${r.issueType}|${r.issue}`;
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }

  return Array.from(map.entries()).map(([key, items]) => {
    const [greenhouse, variety, issueType, issue] = key.split("|");
    return {
      greenhouse,
      variety,
      issueType: issueType as ScoutingIssueType,
      issue,
      avgRating: roundRating(avgRating(items)),
      count: items.length,
    };
  });
}
