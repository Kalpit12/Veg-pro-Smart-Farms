import {
  BEMACK_FARM_ID,
  BEMACK_FARM_NAME,
  bemackGreenhouseId,
  bemackLocationByName,
  type BemackCategory,
} from "@/lib/bemack-master-data";
import type { HotspotRow } from "@/services/supabase/infestation-service";
import type { ScoutingIssueType } from "@/types/db";

const minutesAgo = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

export const STAR_FLOW_WORKERS = [
  {
    id: "49b389f8-8113-4773-b92c-b52c498284a2",
    name: "Worker User",
    greenhouse: "STGH01A",
    variety: "Red Calypso",
  },
  {
    id: "aaaaaa01-0001-4001-8001-000000000001",
    name: "Amina Otieno",
    greenhouse: "STGH02A",
    variety: "Fuschiana",
  },
  {
    id: "aaaaaa01-0001-4001-8001-000000000002",
    name: "James Mwangi",
    greenhouse: "STGH03A",
    variety: "Athena",
  },
  {
    id: "aaaaaa01-0001-4001-8001-000000000003",
    name: "Faith Wanjiku",
    greenhouse: "STGH05A",
    variety: "Confidential",
  },
  {
    id: "aaaaaa01-0001-4001-8001-000000000004",
    name: "Daniel Kipchoge",
    greenhouse: "STGH07A",
    variety: "Moonwalk",
  },
] as const;

export function seedStarFlowHotspots(): HotspotRow[] {
  const rows: Array<{
    id: string;
    worker: (typeof STAR_FLOW_WORKERS)[number];
    pest: string;
    problem: string;
    mainIssue: string;
    severity: number;
    status: "active" | "sprayed";
    mins: number;
  }> = [
    {
      id: "eeeeee01-0001-4001-8001-000000000001",
      worker: STAR_FLOW_WORKERS[0],
      pest: "Thrips",
      problem: "Silver streaks on upper leaves",
      mainIssue: "Pressure rising in bays 4–6",
      severity: 4,
      status: "sprayed",
      mins: 92,
    },
    {
      id: "eeeeee01-0001-4001-8001-000000000002",
      worker: STAR_FLOW_WORKERS[1],
      pest: "Aphids",
      problem: "Colonies on new shoots",
      mainIssue: "High pressure on Fuschiana — spray crew needed",
      severity: 5,
      status: "active",
      mins: 82,
    },
    {
      id: "eeeeee01-0001-4001-8001-000000000003",
      worker: STAR_FLOW_WORKERS[2],
      pest: "False Codling Moth",
      problem: "Larvae in buds",
      mainIssue: "Spot treatment completed after scout round",
      severity: 3,
      status: "sprayed",
      mins: 67,
    },
    {
      id: "eeeeee01-0001-4001-8001-000000000004",
      worker: STAR_FLOW_WORKERS[3],
      pest: "Mites",
      problem: "Stippling on lower foliage",
      mainIssue: "Spreading along the west walkway",
      severity: 4,
      status: "active",
      mins: 52,
    },
    {
      id: "eeeeee01-0001-4001-8001-000000000005",
      worker: STAR_FLOW_WORKERS[4],
      pest: "Helicoverpa",
      problem: "Chewed buds and petals",
      mainIssue: "Urgent — feeding damage in bay 8",
      severity: 5,
      status: "active",
      mins: 37,
    },
  ];

  return rows.map((row) => {
    const loc = bemackLocationByName(row.worker.greenhouse)!;
    return {
      id: row.id,
      farm_id: BEMACK_FARM_ID,
      greenhouse_id: loc.greenhouseId,
      reported_by: row.worker.id,
      latitude: loc.lat + 0.00005,
      longitude: loc.lng + 0.00004,
      pest_type: row.pest,
      problem: row.problem,
      main_issue: row.mainIssue,
      severity: row.severity,
      status: row.status,
      created_at: minutesAgo(row.mins),
      farms: { name: BEMACK_FARM_NAME },
      greenhouses: { name: row.worker.greenhouse },
      users: { full_name: row.worker.name },
    } as HotspotRow;
  });
}

export function seedStarFlowSprays() {
  const loc1 = bemackLocationByName("STGH01A")!;
  const loc3 = bemackLocationByName("STGH03A")!;
  return [
    {
      id: "demo-spray-star-1",
      worker_id: STAR_FLOW_WORKERS[0].id,
      farm_id: BEMACK_FARM_ID,
      greenhouse_id: loc1.greenhouseId,
      hotspot_id: "eeeeee01-0001-4001-8001-000000000001",
      latitude: loc1.lat,
      longitude: loc1.lng,
      product_name: "Abamectin 1.8 EC",
      notes: "Response to Thrips at STGH01A",
      created_at: minutesAgo(80),
      users: { full_name: STAR_FLOW_WORKERS[0].name },
      farms: { name: BEMACK_FARM_NAME },
      greenhouses: { name: "STGH01A" },
    },
    {
      id: "demo-spray-star-2",
      worker_id: STAR_FLOW_WORKERS[2].id,
      farm_id: BEMACK_FARM_ID,
      greenhouse_id: loc3.greenhouseId,
      hotspot_id: "eeeeee01-0001-4001-8001-000000000003",
      latitude: loc3.lat,
      longitude: loc3.lng,
      product_name: "Spinosad 480 SC",
      notes: "Response to False Codling Moth at STGH03A",
      created_at: minutesAgo(55),
      users: { full_name: STAR_FLOW_WORKERS[2].name },
      farms: { name: BEMACK_FARM_NAME },
      greenhouses: { name: "STGH03A" },
    },
  ];
}

export function seedStarFlowAlerts() {
  return [
    {
      id: "demo-alert-star-1",
      type: "infestation",
      message:
        "[Star demo] Severity 5 Aphids at Star / STGH02A (Amina Otieno) — assign spray crew.",
      created_at: minutesAgo(70),
    },
    {
      id: "demo-alert-star-2",
      type: "infestation",
      message: "[Star demo] Mites still active at STGH05A after Faith Wanjiku report.",
      created_at: minutesAgo(40),
    },
    {
      id: "demo-alert-star-3",
      type: "infestation",
      message: "[Star demo] Severity 5 Helicoverpa at STGH07A (Daniel Kipchoge).",
      created_at: minutesAgo(20),
    },
  ];
}

const SCOUT_STOPS: Array<{
  worker: (typeof STAR_FLOW_WORKERS)[number];
  issueType: "pest" | "disease";
  issue: string;
  rating: number;
  bay: number;
  col: number;
  mins: number;
  roundId: string;
}> = [
  { worker: STAR_FLOW_WORKERS[0], issueType: "pest", issue: "Thrips", rating: 4, bay: 3, col: 1, mins: 110, roundId: "dddddd01-0001-4001-8001-000000000001" },
  { worker: STAR_FLOW_WORKERS[0], issueType: "disease", issue: "Powdery Mildew", rating: 3, bay: 5, col: 2, mins: 98, roundId: "dddddd01-0001-4001-8001-000000000001" },
  { worker: STAR_FLOW_WORKERS[1], issueType: "pest", issue: "Aphids", rating: 5, bay: 2, col: 1, mins: 100, roundId: "dddddd01-0001-4001-8001-000000000002" },
  { worker: STAR_FLOW_WORKERS[1], issueType: "pest", issue: "White Flies", rating: 3, bay: 4, col: 2, mins: 88, roundId: "dddddd01-0001-4001-8001-000000000002" },
  { worker: STAR_FLOW_WORKERS[2], issueType: "pest", issue: "False Codling Moth", rating: 3, bay: 4, col: 1, mins: 85, roundId: "dddddd01-0001-4001-8001-000000000003" },
  { worker: STAR_FLOW_WORKERS[2], issueType: "disease", issue: "Botrytis", rating: 4, bay: 6, col: 2, mins: 73, roundId: "dddddd01-0001-4001-8001-000000000003" },
  { worker: STAR_FLOW_WORKERS[3], issueType: "pest", issue: "Mites", rating: 4, bay: 5, col: 1, mins: 70, roundId: "dddddd01-0001-4001-8001-000000000004" },
  { worker: STAR_FLOW_WORKERS[3], issueType: "disease", issue: "Downey Mildew", rating: 2, bay: 7, col: 2, mins: 58, roundId: "dddddd01-0001-4001-8001-000000000004" },
  { worker: STAR_FLOW_WORKERS[4], issueType: "pest", issue: "Helicoverpa", rating: 5, bay: 1, col: 1, mins: 55, roundId: "dddddd01-0001-4001-8001-000000000005" },
  { worker: STAR_FLOW_WORKERS[4], issueType: "disease", issue: "Back Spot", rating: 3, bay: 3, col: 2, mins: 43, roundId: "dddddd01-0001-4001-8001-000000000005" },
];

export function seedStarFlowRounds() {
  return STAR_FLOW_WORKERS.map((w, i) => {
    const mins = [125, 115, 100, 85, 70][i]!;
    return {
      id: `dddddd01-0001-4001-8001-00000000000${i + 1}`,
      scoutName: w.name,
      farmId: BEMACK_FARM_ID,
      greenhouseId: bemackGreenhouseId(w.greenhouse),
      greenhouseName: w.greenhouse,
      startedAt: minutesAgo(mins),
      endedAt: minutesAgo(mins - 35),
      status: "completed" as const,
      stopCount: 2,
      distanceM: 180,
      durationS: 2100,
      pointCount: 16,
      coveragePct: 14.5,
    };
  });
}

export function seedStarFlowRecords() {
  return SCOUT_STOPS.map((s, i) => {
    const loc = bemackLocationByName(s.worker.greenhouse)!;
    return {
      id: `demo-scout-star-${i + 1}`,
      roundId: s.roundId,
      scoutName: s.worker.name,
      farmName: BEMACK_FARM_NAME,
      farmId: BEMACK_FARM_ID,
      greenhouseName: s.worker.greenhouse,
      greenhouseId: loc.greenhouseId,
      category: "Cut Rose" as BemackCategory,
      variety: s.worker.variety,
      beds: 11,
      columnNo: s.col,
      bayNo: s.bay,
      issueType: s.issueType as ScoutingIssueType,
      issue: s.issue,
      rating: s.rating,
      recordedAt: minutesAgo(s.mins),
      latitude: loc.lat + 0.00004,
      longitude: loc.lng + 0.00003,
      observations: [],
    };
  });
}
