import type { DemoScoutingRecord } from "@/store/scouting-store";
import type { ScoutingIssueType } from "@/types/db";

export type SprayPriority = "urgent" | "scheduled" | "monitor";

export type SprayWorkItem = {
  id: string;
  priority: SprayPriority;
  greenhouse: string;
  variety: string;
  issueType: ScoutingIssueType;
  issue: string;
  rating: number;
  location: string;
  productHint: string;
  action: string;
};

const PEST_PRODUCTS: Record<string, string> = {
  "White Flies": "Encarsia / spiromesifen",
  Thrips: "Spinosad / blue sticky traps",
  Aphids: "Neem oil / parasitoids",
  Mites: "Abamectin / predatory mites",
  "False Codling Moth": "Bacillus thuringiensis",
  Helicoverpa: "Bacillus thuringiensis",
  "Other Caterpillars": "Bacillus thuringiensis",
  "Other Caterpillers": "Bacillus thuringiensis",
  Spondoptera: "Bacillus thuringiensis",
};

const DISEASE_PRODUCTS: Record<string, string> = {
  Botrytis: "Fungicide rotation — captan / switch",
  "Powdery Mildew": "Sulfur / potassium bicarbonate",
  Agrobacterium: "Remove infected plants — sanitize tools",
  "Downey Mildew": "Copper-based protectant",
  "Back Spot": "Chlorothalonil / improve airflow",
  "Stem Bot": "Prune affected stems — fungicide dip",
};

function productFor(issueType: ScoutingIssueType, issue: string) {
  if (issueType === "pest") return PEST_PRODUCTS[issue] ?? "Consult IPM chart";
  return DISEASE_PRODUCTS[issue] ?? "Consult disease protocol";
}

function priorityFromRating(rating: number): SprayPriority {
  if (rating >= 4) return "urgent";
  if (rating >= 3) return "scheduled";
  return "monitor";
}

export type SprayProgramInput = {
  id: string;
  greenhouseName: string;
  variety: string;
  issueType: ScoutingIssueType;
  issue: string;
  rating: number | null;
  columnNo: number;
  bayNo: number;
  beds: number;
  recordedAt: string;
};

export function buildSprayWorkProgram(records: SprayProgramInput[]): SprayWorkItem[] {
  const seen = new Set<string>();
  const items: SprayWorkItem[] = [];

  const sorted = [...records].sort((a, b) => {
    const ra = a.rating ?? 0;
    const rb = b.rating ?? 0;
    return rb - ra;
  });

  for (const r of sorted) {
    if (!r.issue || r.issue.trim().toLowerCase() === "none found") continue;
    if (r.rating == null) continue;
    const rating = r.rating;
    if (rating < 3) continue;

    const key = `${r.greenhouseName}|${r.variety}|${r.issue}|${r.columnNo}|${r.bayNo}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const priority = priorityFromRating(rating);
    items.push({
      id: r.id,
      priority,
      greenhouse: r.greenhouseName,
      variety: r.variety,
      issueType: r.issueType,
      issue: r.issue,
      rating,
      location: `Col ${r.columnNo} · Bay ${r.bayNo}`,
      productHint: productFor(r.issueType, r.issue),
      action:
        priority === "urgent"
          ? "Spray today — target hotspot before spread"
          : priority === "scheduled"
            ? "Schedule within 48h — monitor daily"
            : "Monitor — re-scout in 3 days",
    });
  }

  const order: SprayPriority[] = ["urgent", "scheduled", "monitor"];
  return items.sort(
    (a, b) => order.indexOf(a.priority) - order.indexOf(b.priority) || b.rating - a.rating,
  );
}

export function sprayProgramFromDemo(records: DemoScoutingRecord[]) {
  return buildSprayWorkProgram(
    records.map((r) => ({
      id: r.id,
      greenhouseName: r.greenhouseName,
      variety: r.variety,
      issueType: r.issueType,
      issue: r.issue,
      rating: r.rating,
      columnNo: r.columnNo,
      bayNo: r.bayNo,
      beds: r.beds,
      recordedAt: r.recordedAt,
    })),
  );
}
