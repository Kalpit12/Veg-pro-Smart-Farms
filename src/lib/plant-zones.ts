import { BEMACK_DISEASES, BEMACK_PESTS, issueLabel } from "@/lib/bemack-master-data";

export type PlantZoneId = "top" | "middle" | "lower";

export type IssueKind = "pest" | "disease";

export type DiseaseSeverity = 1 | 2 | 3;

export type PlantZoneConfig = {
  id: PlantZoneId;
  label: string;
  description: string;
};

/**
 * Plant regions. Pest and disease options are filtered by VegPro Top / Mid / Bottom mapping.
 */
export const PLANT_ZONES: Record<PlantZoneId, PlantZoneConfig> = {
  top: {
    id: "top",
    label: "Flower / bloom",
    description: "Bud and flower head — FCM, caterpillars, botrytis, and others marked Top.",
  },
  middle: {
    id: "middle",
    label: "Leaves & stem",
    description: "Mid canopy, leaves, and stem — mites, aphids, black spot, stem bot, and others marked Mid.",
  },
  lower: {
    id: "lower",
    label: "Roots / base",
    description: "Lower canopy — only issues marked Bottom (thrips, whiteflies, mildews).",
  },
};

/** Hotspots on the rose illustration (percent of the 2:3 plant canvas). */
export const PLANT_ZONE_HOTSPOTS: Record<
  PlantZoneId,
  { top: string; left: string; width: string; height: string }
> = {
  top: { top: "2.5%", left: "20%", width: "60%", height: "25%" },
  middle: { top: "27%", left: "18%", width: "64%", height: "31%" },
  lower: { top: "58%", left: "12%", width: "76%", height: "38%" },
};

export { issueLabel };

export const PEST_OPTIONS = BEMACK_PESTS;

export const DISEASE_OPTIONS = BEMACK_DISEASES;

/** VegPro Pest and Disease List — Top / Mid / Bottom section flags. */
export const ISSUE_PLANT_ZONES: Record<string, readonly PlantZoneId[]> = {
  Mites: ["middle"],
  Aphids: ["middle"],
  Thrips: ["top", "middle", "lower"],
  "White Flies": ["top", "middle", "lower"],
  "False Codling Moth": ["top"],
  Spondoptera: ["top"],
  Helicoverpa: ["top"],
  "Other Caterpillars": ["top"],
  "Powdery Mildew": ["top", "middle", "lower"],
  "Downey Mildew": ["top", "middle", "lower"],
  Botrytis: ["top"],
  "Back Spot": ["middle"],
  "Stem Bot": ["middle"],
  Agrobacterium: ["middle"],
};

export function issuesForPlantZone(kind: IssueKind, zone: PlantZoneId): readonly string[] {
  const all = kind === "pest" ? PEST_OPTIONS : DISEASE_OPTIONS;
  return all.filter((name) => (ISSUE_PLANT_ZONES[name] ?? ["top", "middle", "lower"]).includes(zone));
}

export function preferredZoneForIssue(name: string): PlantZoneId {
  return ISSUE_PLANT_ZONES[name]?.[0] ?? "middle";
}

export function issueAllowedInZone(name: string, zone: PlantZoneId) {
  return (ISSUE_PLANT_ZONES[name] ?? ["top", "middle", "lower"]).includes(zone);
}

export const DISEASE_SEVERITY_META: Record<
  DiseaseSeverity,
  { label: string; color: string; className: string }
> = {
  1: {
    label: "Low",
    color: "#22c55e",
    className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  },
  2: {
    label: "Medium",
    color: "#f59e0b",
    className: "border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-100",
  },
  3: {
    label: "High",
    color: "#dc2626",
    className: "border-red-500/40 bg-red-500/15 text-red-900 dark:text-red-100",
  },
};

/** Map pest count into DB severity 1–5 for hotspot map icons. */
export function pestCountToSeverity(count: number): number {
  if (count <= 5) return 1;
  if (count <= 15) return 2;
  if (count <= 40) return 3;
  if (count <= 100) return 4;
  return 5;
}
