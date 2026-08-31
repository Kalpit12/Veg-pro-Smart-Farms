/**
 * Star farm master lists — VegPro "Greenhouse Bay Mapping Star.xlsx" + "Pest and Disease List.xlsx".
 * Export names keep a BEMACK_ prefix so existing imports keep working.
 */

import { STAR_GREENHOUSE_ROWS, STAR_VARIETY_ORDER } from "@/lib/star-greenhouse-rows";

export const BEMACK_FARM_NAME = "Star" as const;

export const BEMACK_FARM_ID = "beee0001-0001-4001-8001-000000000001";

export const BEMACK_CATEGORIES = ["Cut Rose"] as const;

export type BemackCategory = (typeof BEMACK_CATEGORIES)[number];

export const BEMACK_GREENHOUSES = STAR_GREENHOUSE_ROWS.map((row) => row.name);

const STAR_VARIETIES = STAR_VARIETY_ORDER;

export const BEMACK_VARIETIES: Record<BemackCategory, readonly string[]> = {
  "Cut Rose": STAR_VARIETIES,
};

/** VegPro Pest and Disease List.xlsx — Disease names in file order. */
export const BEMACK_DISEASES = [
  "Powdery Mildew",
  "Downey Mildew",
  "Botrytis",
  "Back Spot",
  "Stem Bot",
  "Agrobacterium",
] as const;

/** VegPro Pest and Disease List.xlsx — Pest names in file order. */
export const BEMACK_PESTS = [
  "Mites",
  "Aphids",
  "Thrips",
  "White Flies",
  "False Codling Moth",
  "Spondoptera",
  "Helicoverpa",
  "Other Caterpillars",
] as const;

export const ISSUE_SHORT_CODES: Record<string, string> = {
  Mites: "MT",
  Aphids: "AP",
  Thrips: "TP",
  "White Flies": "WF",
  "False Codling Moth": "FCM",
  Spondoptera: "SP",
  Helicoverpa: "HV",
  "Other Caterpillars": "OC",
  "Powdery Mildew": "PM",
  "Downey Mildew": "DM",
  Botrytis: "BO",
  "Back Spot": "BS",
  "Stem Bot": "ST/BO",
  Agrobacterium: "AG",
};

export function issueLabel(name: string) {
  const code = ISSUE_SHORT_CODES[name];
  return code ? `${name} (${code})` : name;
}

export const SCOUTING_PARAMETERS = [
  { id: "sp-mites", group: "pest" as const, name: "Mites" },
  { id: "sp-aphids", group: "pest" as const, name: "Aphids" },
  { id: "sp-thrips", group: "pest" as const, name: "Thrips" },
  { id: "sp-white-flies", group: "pest" as const, name: "White Flies" },
  { id: "sp-fcm", group: "pest" as const, name: "False Codling Moth" },
  { id: "sp-spondoptera", group: "pest" as const, name: "Spondoptera" },
  { id: "sp-helicoverpa", group: "pest" as const, name: "Helicoverpa" },
  { id: "sp-caterpillers", group: "pest" as const, name: "Other Caterpillars" },
  { id: "sd-powdery", group: "disease" as const, name: "Powdery Mildew" },
  { id: "sd-downey", group: "disease" as const, name: "Downey Mildew" },
  { id: "sd-botrytis", group: "disease" as const, name: "Botrytis" },
  { id: "sd-back-spot", group: "disease" as const, name: "Back Spot" },
  { id: "sd-stem-bot", group: "disease" as const, name: "Stem Bot" },
  { id: "sd-agrobacterium", group: "disease" as const, name: "Agrobacterium" },
  { id: "ch-vigor", group: "crop_health" as const, name: "Crop vigor" },
  { id: "ch-nutrient", group: "crop_health" as const, name: "Nutrient stress signs" },
] as const;

export type ScoutingParameterId = (typeof SCOUTING_PARAMETERS)[number]["id"];

const GH_BASE = { lat: -1.2921, lng: 36.8219 };

export function bemackGreenhouseId(name: string) {
  const row = STAR_GREENHOUSE_ROWS.find((r) => r.name === name);
  return row?.id ?? STAR_GREENHOUSE_ROWS[0].id;
}

export function bemackQrValue(greenhouseName: string) {
  return `VEGPRO|STAR|${greenhouseName}`;
}

export function bemackGreenhouseCoords(index: number) {
  const row = Math.floor(index / 8);
  const col = index % 8;
  return {
    lat: GH_BASE.lat + row * 0.00045,
    lng: GH_BASE.lng + col * 0.00045,
  };
}

export function starGreenhouseRow(name: string) {
  return STAR_GREENHOUSE_ROWS.find((r) => r.name === name) ?? STAR_GREENHOUSE_ROWS[0];
}

export function varietiesForGreenhouse(greenhouseName: string | null | undefined) {
  if (!greenhouseName) return [...STAR_VARIETIES];
  const row = STAR_GREENHOUSE_ROWS.find((r) => r.name === greenhouseName);
  return row ? [...row.varieties] : [...STAR_VARIETIES];
}

export function bayMaxForGreenhouse(greenhouseName: string | null | undefined) {
  if (!greenhouseName) return 11;
  return STAR_GREENHOUSE_ROWS.find((r) => r.name === greenhouseName)?.bayMax ?? 11;
}

export function maxColumnsForGreenhouse(greenhouseName: string | null | undefined) {
  if (!greenhouseName) return 11;
  return STAR_GREENHOUSE_ROWS.find((r) => r.name === greenhouseName)?.columnMax ?? 11;
}

export function columnCountForBay(
  greenhouseName: string | null | undefined,
  bayNo: number,
) {
  const row = greenhouseName
    ? STAR_GREENHOUSE_ROWS.find((r) => r.name === greenhouseName)
    : undefined;
  if (!row) return 11;
  return row.columnsByBay?.[bayNo] ?? row.columnMax;
}

export function greenhouseCellExists(
  greenhouseName: string | null | undefined,
  columnNo: number,
  bayNo: number,
) {
  const bayMax = bayMaxForGreenhouse(greenhouseName);
  if (bayNo < 1 || bayNo > bayMax || columnNo < 1) return false;
  return columnNo <= columnCountForBay(greenhouseName, bayNo);
}

export function coverageGridForGreenhouse(greenhouseName: string) {
  return {
    maxColumn: maxColumnsForGreenhouse(greenhouseName),
    maxBay: bayMaxForGreenhouse(greenhouseName),
    columnCountForBay: (bayNo: number) => columnCountForBay(greenhouseName, bayNo),
  };
}

export function baysForGreenhouse(greenhouseName: string | null | undefined) {
  const max = bayMaxForGreenhouse(greenhouseName);
  return Array.from({ length: max }, (_, i) => i + 1);
}

export function varietyForBay(greenhouseName: string | null | undefined, bayNo: number) {
  const row = greenhouseName
    ? STAR_GREENHOUSE_ROWS.find((r) => r.name === greenhouseName)
    : undefined;
  if (!row) return STAR_VARIETIES[0];
  return row.varietyByBay?.[bayNo] ?? row.varieties[0] ?? STAR_VARIETIES[0];
}

export function formatAreaSqm(areaSqm: number) {
  return `${areaSqm.toLocaleString("en-US", { maximumFractionDigits: 2 })} sqm`;
}

const GH_NAME_RE = /^STGH(\d+)([A-Z])$/i;

export function compareStarGreenhouseName(a: string, b: string) {
  const ma = GH_NAME_RE.exec(a.trim());
  const mb = GH_NAME_RE.exec(b.trim());
  if (ma && mb) {
    const n = Number(ma[1]) - Number(mb[1]);
    if (n !== 0) return n;
    return ma[2]!.localeCompare(mb[2]!);
  }
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function formatStarGreenhouseLabel(greenhouseName: string) {
  const row = STAR_GREENHOUSE_ROWS.find((r) => r.name === greenhouseName);
  if (!row) return greenhouseName;
  return `${row.name} · ${row.varieties.join(" / ")} · ${formatAreaSqm(row.areaSqm)} · ${row.bayMax} bays · ${row.columnMax} cols`;
}

export const BEMACK_DEMO_LOCATIONS = STAR_GREENHOUSE_ROWS.map((row, i) => ({
  farmId: BEMACK_FARM_ID,
  farmName: BEMACK_FARM_NAME,
  greenhouseId: row.id,
  greenhouseName: row.name,
  qrValue: bemackQrValue(row.name),
  ...bemackGreenhouseCoords(i),
}));

export const BEMACK_SAMPLE_SCOUTS = [
  {
    scoutName: "Test Patel",
    greenhouse: "STGH01A",
    category: "Cut Rose" as BemackCategory,
    variety: "Red Calypso",
    beds: 11,
    columnNo: 1,
    bayNo: 5,
    issueType: "disease" as const,
    issue: "Agrobacterium",
    rating: 4,
  },
  {
    scoutName: "Test Shah",
    greenhouse: "STGH03A",
    category: "Cut Rose" as BemackCategory,
    variety: "Athena",
    beds: 11,
    columnNo: 2,
    bayNo: 8,
    issueType: "pest" as const,
    issue: "False Codling Moth",
    rating: 3,
  },
  {
    scoutName: "Test Singh",
    greenhouse: "STGH05A",
    category: "Cut Rose" as BemackCategory,
    variety: "Confidential",
    beds: 11,
    columnNo: 1,
    bayNo: 4,
    issueType: "disease" as const,
    issue: "Powdery Mildew",
    rating: 5,
  },
] as const;

export function issuesForType(type: "disease" | "pest") {
  return type === "disease" ? BEMACK_DISEASES : BEMACK_PESTS;
}

export function bemackLocationByGreenhouseId(greenhouseId: string) {
  return BEMACK_DEMO_LOCATIONS.find((l) => l.greenhouseId === greenhouseId) ?? null;
}

export function bemackLocationByName(greenhouseName: string) {
  return BEMACK_DEMO_LOCATIONS.find((l) => l.greenhouseName === greenhouseName) ?? null;
}
