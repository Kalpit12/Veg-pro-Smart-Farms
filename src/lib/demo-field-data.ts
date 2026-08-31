import type { GreenhouseConditionCompare } from "@/lib/greenhouse-condition";
import { getHistorySinceDate } from "@/lib/history-range";
import type { HotspotRow } from "@/services/supabase/infestation-service";

/** Farm anchors (Bangalore area) — worker GPS uses per-greenhouse offsets from these */
export const DEMO_FARMS = {
  north: {
    farmId: "demo-north",
    greenhouseId: "demo-gh-a1",
    farmName: "North Farm",
    greenhouseName: "GH-A1",
    qrValue: "VEGPRO|NORTH|GH-A1",
    lat: 12.9716,
    lng: 77.5946,
  },
  northA2: {
    farmId: "demo-north",
    greenhouseId: "demo-gh-a2",
    farmName: "North Farm",
    greenhouseName: "GH-A2",
    qrValue: "VEGPRO|NORTH|GH-A2",
    lat: 12.9728,
    lng: 77.5958,
  },
  east: {
    farmId: "demo-east",
    greenhouseId: "demo-gh-e1",
    farmName: "East Farm",
    greenhouseName: "GH-E1",
    qrValue: "VEGPRO|EAST|GH-E1",
    lat: 12.978,
    lng: 77.601,
  },
  eastE2: {
    farmId: "demo-east",
    greenhouseId: "demo-gh-e2",
    farmName: "East Farm",
    greenhouseName: "GH-E2",
    qrValue: "VEGPRO|EAST|GH-E2",
    lat: 12.9792,
    lng: 77.6022,
  },
  south: {
    farmId: "demo-south",
    greenhouseId: "demo-gh-s1",
    farmName: "South Farm",
    greenhouseName: "GH-S1",
    qrValue: "VEGPRO|SOUTH|GH-S1",
    lat: 12.965,
    lng: 77.588,
  },
  southS2: {
    farmId: "demo-south",
    greenhouseId: "demo-gh-s2",
    farmName: "South Farm",
    greenhouseName: "GH-S2",
    qrValue: "VEGPRO|SOUTH|GH-S2",
    lat: 12.9662,
    lng: 77.5892,
  },
} as const;

export type DemoFarmKey = keyof typeof DEMO_FARMS;

export const DEMO_WORKERS = [
  {
    id: "demo-w-ravi",
    name: "Ravi Kumar",
    farmKey: "north" as DemoFarmKey,
    task: "Report: Aphids",
    problem: "Leaves curling on lower stems",
    mainIssue: "Spreading on tomato crop in GH-A1",
    rating: 4,
  },
  {
    id: "demo-w-asha",
    name: "Asha Devi",
    farmKey: "east" as DemoFarmKey,
    task: "Report: Whitefly",
    problem: "Sticky residue on capsicum leaves",
    mainIssue: "Yield at risk in GH-E1",
    rating: 3,
  },
  {
    id: "demo-w-priya",
    name: "Priya Nair",
    farmKey: "northA2" as DemoFarmKey,
    task: "Report: Thrips",
    problem: "Silver streaks on lettuce leaves",
    mainIssue: "GH-A2 bench rows 3–6 affected",
    rating: 4,
  },
  {
    id: "demo-w-kumar",
    name: "Kumar Singh",
    farmKey: "south" as DemoFarmKey,
    task: "Spray: Spinosad",
    problem: "Spider mites on cucumber vines",
    mainIssue: "Treatment in progress at GH-S1",
    rating: 4,
  },
  {
    id: "demo-w-meena",
    name: "Meena Reddy",
    farmKey: "eastE2" as DemoFarmKey,
    task: "Report: Leaf spot",
    problem: "Brown lesions on bell pepper foliage",
    mainIssue: "Fungal spread suspected in GH-E2",
    rating: 5,
  },
  {
    id: "demo-w-suresh",
    name: "Suresh Patel",
    farmKey: "southS2" as DemoFarmKey,
    task: "Scouting: Caterpillar",
    problem: "Chewed holes on cabbage heads",
    mainIssue: "Localized in GH-S2 north section",
    rating: 3,
  },
  {
    id: "demo-w-lakshmi",
    name: "Lakshmi Iyer",
    farmKey: "north" as DemoFarmKey,
    task: "Spray: Neem oil",
    problem: "Follow-up on aphid hotspot",
    mainIssue: "Rows 8–12 sprayed in GH-A1",
    rating: 5,
  },
  {
    id: "demo-w-arjun",
    name: "Arjun Menon",
    farmKey: "east" as DemoFarmKey,
    task: "Irrigation check",
    problem: "Drip pressure low in zone B",
    mainIssue: "Capsicum stress risk if not fixed",
    rating: 3,
  },
] as const;

function loc(key: DemoFarmKey) {
  return DEMO_FARMS[key];
}

export { getHistorySinceDate, HISTORY_LOOKBACK_MONTHS } from "@/lib/history-range";

function ago(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export type DemoHistoryItem = {
  id: string;
  type: "report" | "spray";
  title: string;
  detail: string;
  farm: string;
  greenhouse: string;
  greenhouse_id: string;
  worker: string;
  created_at: string;
  severity?: number;
  status?: string;
};

/** Unique greenhouses for history filters */
export function getDemoGreenhouseOptions() {
  const seen = new Set<string>();
  return Object.values(DEMO_FARMS)
    .filter((entry) => {
      if (seen.has(entry.greenhouseId)) return false;
      seen.add(entry.greenhouseId);
      return true;
    })
    .map((entry) => ({
      id: entry.greenhouseId,
      label: `${entry.farmName} / ${entry.greenhouseName}`,
      farmName: entry.farmName,
      greenhouseName: entry.greenhouseName,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function buildDemoHistoryArchive(): DemoHistoryItem[] {
  const archive: Omit<DemoHistoryItem, "id">[] = [
    // GH-A1
    {
      type: "report",
      title: "Mealybug",
      detail: "Clusters on stem nodes — resolved after spray",
      farm: loc("north").farmName,
      greenhouse: loc("north").greenhouseName,
      greenhouse_id: loc("north").greenhouseId,
      worker: "Ravi Kumar",
      created_at: daysAgo(12),
    },
    {
      type: "spray",
      title: "Neem oil",
      detail: "Preventive rows 1–6 after mealybug report",
      farm: loc("north").farmName,
      greenhouse: loc("north").greenhouseName,
      greenhouse_id: loc("north").greenhouseId,
      worker: "Lakshmi Iyer",
      created_at: daysAgo(11),
    },
    {
      type: "report",
      title: "Aphids",
      detail: "Early signs on tomato lower canopy",
      farm: loc("north").farmName,
      greenhouse: loc("north").greenhouseName,
      greenhouse_id: loc("north").greenhouseId,
      worker: "Ravi Kumar",
      created_at: daysAgo(38),
    },
    {
      type: "spray",
      title: "Insecticidal soap",
      detail: "Spot treatment on affected benches",
      farm: loc("north").farmName,
      greenhouse: loc("north").greenhouseName,
      greenhouse_id: loc("north").greenhouseId,
      worker: "Ravi Kumar",
      created_at: daysAgo(37),
    },
    {
      type: "report",
      title: "Powdery mildew",
      detail: "White patches on upper leaves — humidity spike",
      farm: loc("north").farmName,
      greenhouse: loc("north").greenhouseName,
      greenhouse_id: loc("north").greenhouseId,
      worker: "Lakshmi Iyer",
      created_at: daysAgo(62),
    },
    {
      type: "spray",
      title: "Sulfur spray",
      detail: "Full-house preventive after mildew alert",
      farm: loc("north").farmName,
      greenhouse: loc("north").greenhouseName,
      greenhouse_id: loc("north").greenhouseId,
      worker: "Lakshmi Iyer",
      created_at: daysAgo(61),
    },
    // GH-A2
    {
      type: "report",
      title: "Thrips",
      detail: "Silver streaks on lettuce — bench rows 1–2",
      farm: loc("northA2").farmName,
      greenhouse: loc("northA2").greenhouseName,
      greenhouse_id: loc("northA2").greenhouseId,
      worker: "Priya Nair",
      created_at: daysAgo(8),
    },
    {
      type: "spray",
      title: "Horticultural oil",
      detail: "Preventive application on lettuce rows",
      farm: loc("northA2").farmName,
      greenhouse: loc("northA2").greenhouseName,
      greenhouse_id: loc("northA2").greenhouseId,
      worker: "Priya Nair",
      created_at: daysAgo(24),
    },
    {
      type: "report",
      title: "Downy mildew",
      detail: "Yellowing on outer leaves after heavy rain week",
      farm: loc("northA2").farmName,
      greenhouse: loc("northA2").greenhouseName,
      greenhouse_id: loc("northA2").greenhouseId,
      worker: "Priya Nair",
      created_at: daysAgo(55),
    },
    {
      type: "spray",
      title: "Copper fungicide",
      detail: "Scheduled preventive for lettuce crop",
      farm: loc("northA2").farmName,
      greenhouse: loc("northA2").greenhouseName,
      greenhouse_id: loc("northA2").greenhouseId,
      worker: "Priya Nair",
      created_at: daysAgo(54),
    },
    // GH-E1
    {
      type: "report",
      title: "Whitefly",
      detail: "Sticky traps full — capsicum zone A",
      farm: loc("east").farmName,
      greenhouse: loc("east").greenhouseName,
      greenhouse_id: loc("east").greenhouseId,
      worker: "Asha Devi",
      created_at: daysAgo(15),
    },
    {
      type: "spray",
      title: "Pyrethrin",
      detail: "Evening application on capsicum rows",
      farm: loc("east").farmName,
      greenhouse: loc("east").greenhouseName,
      greenhouse_id: loc("east").greenhouseId,
      worker: "Asha Devi",
      created_at: daysAgo(14),
    },
    {
      type: "report",
      title: "Irrigation fault",
      detail: "Drip pressure low in zone B — resolved",
      farm: loc("east").farmName,
      greenhouse: loc("east").greenhouseName,
      greenhouse_id: loc("east").greenhouseId,
      worker: "Arjun Menon",
      created_at: daysAgo(42),
    },
    {
      type: "report",
      title: "Aphids",
      detail: "Minor outbreak on young capsicum plants",
      farm: loc("east").farmName,
      greenhouse: loc("east").greenhouseName,
      greenhouse_id: loc("east").greenhouseId,
      worker: "Asha Devi",
      created_at: daysAgo(78),
    },
    // GH-E2
    {
      type: "report",
      title: "Leaf spot",
      detail: "Brown lesions on bell pepper — monitoring",
      farm: loc("eastE2").farmName,
      greenhouse: loc("eastE2").greenhouseName,
      greenhouse_id: loc("eastE2").greenhouseId,
      worker: "Meena Reddy",
      created_at: daysAgo(6),
    },
    {
      type: "spray",
      title: "Copper fungicide",
      detail: "Leaf spot follow-up on pepper rows",
      farm: loc("eastE2").farmName,
      greenhouse: loc("eastE2").greenhouseName,
      greenhouse_id: loc("eastE2").greenhouseId,
      worker: "Meena Reddy",
      created_at: daysAgo(36),
    },
    {
      type: "report",
      title: "Bacterial spot",
      detail: "Water-soaked lesions on fruit — isolated rows",
      farm: loc("eastE2").farmName,
      greenhouse: loc("eastE2").greenhouseName,
      greenhouse_id: loc("eastE2").greenhouseId,
      worker: "Meena Reddy",
      created_at: daysAgo(68),
    },
    {
      type: "spray",
      title: "Streptomycin",
      detail: "Targeted spray on affected pepper section",
      farm: loc("eastE2").farmName,
      greenhouse: loc("eastE2").greenhouseName,
      greenhouse_id: loc("eastE2").greenhouseId,
      worker: "Meena Reddy",
      created_at: daysAgo(67),
    },
    // GH-S1
    {
      type: "report",
      title: "Spider mites",
      detail: "Webbing on cucumber trellis — treatment started",
      farm: loc("south").farmName,
      greenhouse: loc("south").greenhouseName,
      greenhouse_id: loc("south").greenhouseId,
      worker: "Kumar Singh",
      created_at: daysAgo(10),
    },
    {
      type: "spray",
      title: "Spinosad",
      detail: "Mite control on cucumber vines",
      farm: loc("south").farmName,
      greenhouse: loc("south").greenhouseName,
      greenhouse_id: loc("south").greenhouseId,
      worker: "Kumar Singh",
      created_at: daysAgo(9),
    },
    {
      type: "report",
      title: "Root rot",
      detail: "Overwatering suspected — drainage improved",
      farm: loc("south").farmName,
      greenhouse: loc("south").greenhouseName,
      greenhouse_id: loc("south").greenhouseId,
      worker: "Kumar Singh",
      created_at: daysAgo(48),
    },
    {
      type: "report",
      title: "Powdery mildew",
      detail: "Early signs on cucumber leaves — resolved",
      farm: loc("south").farmName,
      greenhouse: loc("south").greenhouseName,
      greenhouse_id: loc("south").greenhouseId,
      worker: "Kumar Singh",
      created_at: daysAgo(82),
    },
    // GH-S2
    {
      type: "report",
      title: "Caterpillar",
      detail: "Chewed holes on cabbage heads — localized",
      farm: loc("southS2").farmName,
      greenhouse: loc("southS2").greenhouseName,
      greenhouse_id: loc("southS2").greenhouseId,
      worker: "Suresh Patel",
      created_at: daysAgo(7),
    },
    {
      type: "spray",
      title: "Bacillus thuringiensis",
      detail: "Organic caterpillar control north section",
      farm: loc("southS2").farmName,
      greenhouse: loc("southS2").greenhouseName,
      greenhouse_id: loc("southS2").greenhouseId,
      worker: "Suresh Patel",
      created_at: daysAgo(6),
    },
    {
      type: "report",
      title: "Nematode",
      detail: "Stunted roots on trial bed — monitoring",
      farm: loc("southS2").farmName,
      greenhouse: loc("southS2").greenhouseName,
      greenhouse_id: loc("southS2").greenhouseId,
      worker: "Suresh Patel",
      created_at: daysAgo(52),
    },
    {
      type: "report",
      title: "Cutworm",
      detail: "Seedling damage near entrance — traps set",
      farm: loc("southS2").farmName,
      greenhouse: loc("southS2").greenhouseName,
      greenhouse_id: loc("southS2").greenhouseId,
      worker: "Suresh Patel",
      created_at: daysAgo(88),
    },
  ];

  return archive.map((entry, index) => ({
    ...entry,
    id: `demo-hist-archive-${index + 1}`,
    type: entry.type as "report" | "spray",
    ...(entry.type === "report"
      ? { severity: index % 2 === 0 ? 4 : 3, status: "resolved" as const }
      : {}),
  }));
}

export function getDemoHotspots(): HotspotRow[] {
  return [
    {
      id: "demo-h1",
      farm_id: loc("north").farmId,
      greenhouse_id: loc("north").greenhouseId,
      reported_by: "demo-w-ravi",
      latitude: loc("north").lat + 0.00018,
      longitude: loc("north").lng + 0.00022,
      pest_type: "Aphids",
      problem: "Leaves curling on lower stems",
      main_issue: "Spreading on tomato crop",
      severity: 4,
      status: "active",
      created_at: ago(92),
      farms: { name: loc("north").farmName },
      greenhouses: { name: loc("north").greenhouseName },
    },
    {
      id: "demo-h2",
      farm_id: loc("east").farmId,
      greenhouse_id: loc("east").greenhouseId,
      reported_by: "demo-w-asha",
      latitude: loc("east").lat + 0.00015,
      longitude: loc("east").lng + 0.00018,
      pest_type: "Whitefly",
      problem: "Sticky residue on capsicum leaves",
      main_issue: "Yield at risk in GH-E1",
      severity: 3,
      status: "active",
      created_at: ago(48),
      farms: { name: loc("east").farmName },
      greenhouses: { name: loc("east").greenhouseName },
    },
    {
      id: "demo-h3",
      farm_id: loc("northA2").farmId,
      greenhouse_id: loc("northA2").greenhouseId,
      reported_by: "demo-w-priya",
      latitude: loc("northA2").lat + 0.00012,
      longitude: loc("northA2").lng + 0.00014,
      pest_type: "Thrips",
      problem: "Silver streaks on lettuce leaves",
      main_issue: "Bench rows 3–6 affected",
      severity: 4,
      status: "active",
      created_at: ago(35),
      farms: { name: loc("northA2").farmName },
      greenhouses: { name: loc("northA2").greenhouseName },
    },
    {
      id: "demo-h4",
      farm_id: loc("eastE2").farmId,
      greenhouse_id: loc("eastE2").greenhouseId,
      reported_by: "demo-w-meena",
      latitude: loc("eastE2").lat + 0.0002,
      longitude: loc("eastE2").lng + 0.00016,
      pest_type: "Leaf spot",
      problem: "Brown lesions on bell pepper foliage",
      main_issue: "Fungal spread suspected",
      severity: 5,
      status: "active",
      created_at: ago(22),
      farms: { name: loc("eastE2").farmName },
      greenhouses: { name: loc("eastE2").greenhouseName },
    },
    {
      id: "demo-h5",
      farm_id: loc("southS2").farmId,
      greenhouse_id: loc("southS2").greenhouseId,
      reported_by: "demo-w-suresh",
      latitude: loc("southS2").lat + 0.00014,
      longitude: loc("southS2").lng + 0.0002,
      pest_type: "Caterpillar",
      problem: "Chewed holes on cabbage heads",
      main_issue: "Localized north section",
      severity: 3,
      status: "active",
      created_at: ago(14),
      farms: { name: loc("southS2").farmName },
      greenhouses: { name: loc("southS2").greenhouseName },
    },
    {
      id: "demo-h6",
      farm_id: loc("south").farmId,
      greenhouse_id: loc("south").greenhouseId,
      reported_by: "demo-w-kumar",
      latitude: loc("south").lat + 0.0001,
      longitude: loc("south").lng + 0.00012,
      pest_type: "Spider mites",
      problem: "Webbing on cucumber vines",
      main_issue: "Spray treatment underway",
      severity: 3,
      status: "sprayed",
      created_at: ago(55),
      farms: { name: loc("south").farmName },
      greenhouses: { name: loc("south").greenhouseName },
    },
  ];
}

export function getDemoSprays() {
  return [
    {
      id: "demo-s1",
      latitude: loc("north").lat + 0.00008,
      longitude: loc("north").lng + 0.0001,
      product_name: "Neem oil",
      created_at: ago(18),
      users: { full_name: "Lakshmi Iyer" },
      farms: { name: loc("north").farmName },
      greenhouses: { name: loc("north").greenhouseName },
      greenhouse_id: loc("north").greenhouseId,
    },
    {
      id: "demo-s2",
      latitude: loc("south").lat + 0.00006,
      longitude: loc("south").lng + 0.00008,
      product_name: "Spinosad",
      created_at: ago(12),
      users: { full_name: "Kumar Singh" },
      farms: { name: loc("south").farmName },
      greenhouses: { name: loc("south").greenhouseName },
      greenhouse_id: loc("south").greenhouseId,
    },
    {
      id: "demo-s3",
      latitude: loc("east").lat + 0.0001,
      longitude: loc("east").lng + 0.00009,
      product_name: "Pyrethrin",
      created_at: ago(6),
      users: { full_name: "Asha Devi" },
      farms: { name: loc("east").farmName },
      greenhouses: { name: loc("east").greenhouseName },
      greenhouse_id: loc("east").greenhouseId,
    },
  ];
}

/** Worker GPS pinned to their assigned greenhouse (not farm center) */
export function getDemoPositions() {
  return DEMO_WORKERS.map((w) => {
    const farm = loc(w.farmKey);
    return {
      worker_id: w.id,
      latitude: farm.lat + 0.00004,
      longitude: farm.lng + 0.00005,
      updated_at: ago(
        w.id === "demo-w-ravi" || w.id === "demo-w-meena"
          ? 2
          : w.id === "demo-w-kumar"
            ? 5
            : w.id === "demo-w-suresh"
              ? 8
              : 12,
      ),
      users: { full_name: w.name },
    };
  });
}

export function getDemoHistory(greenhouseId?: string) {
  const since = getHistorySinceDate();
  const hotspots = getDemoHotspots();
  const sprays = getDemoSprays();

  const reports: DemoHistoryItem[] = hotspots.map((h) => {
    const worker =
      DEMO_WORKERS.find((w) => w.id === h.reported_by)?.name ?? "Worker";
    return {
      id: h.id,
      type: "report" as const,
      title: h.pest_type,
      detail: h.problem,
      farm: h.farms?.name ?? "—",
      greenhouse: h.greenhouses?.name ?? "—",
      greenhouse_id: h.greenhouse_id ?? "",
      worker,
      created_at: h.created_at,
      severity: h.severity,
      status: h.status,
    };
  });

  const sprayItems: DemoHistoryItem[] = sprays.map((s) => ({
    id: s.id,
    type: "spray" as const,
    title: s.product_name,
    detail: "Spray treatment logged",
    farm: s.farms?.name ?? "—",
    greenhouse: s.greenhouses?.name ?? "—",
    greenhouse_id:
      "greenhouse_id" in s && typeof s.greenhouse_id === "string"
        ? s.greenhouse_id
        : "",
    worker: s.users?.full_name ?? "Worker",
    created_at: s.created_at,
  }));

  const combined = [...reports, ...sprayItems, ...buildDemoHistoryArchive()];

  return combined
    .filter((item) => new Date(item.created_at) >= since)
    .filter((item) => !greenhouseId || item.greenhouse_id === greenhouseId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}

function demoCondition(
  farmKey: DemoFarmKey,
  baseline: {
    health: number;
    severity: number;
    active: number;
    resolved: number;
    summary: string;
    issue: string;
  },
  current: {
    health: number;
    severity: number;
    active: number;
    resolved: number;
    summary: string;
    issue: string;
  },
): GreenhouseConditionCompare {
  const farm = loc(farmKey);
  const since = getHistorySinceDate();
  const healthDelta = current.health - baseline.health;
  const severityDelta = baseline.severity - current.severity;
  const issuesResolved = current.resolved - baseline.resolved + 2;
  const percentImproved =
    baseline.health > 0 ? Math.round((healthDelta / baseline.health) * 100) : 0;
  const trend =
    healthDelta >= 8 ? "improved" : healthDelta <= -8 ? "worsened" : "stable";

  return {
    greenhouseId: farm.greenhouseId,
    greenhouse: farm.greenhouseName,
    farm: farm.farmName,
    baseline: {
      periodLabel: "3 months ago",
      recordedAt: since.toISOString(),
      healthScore: baseline.health,
      avgSeverity: baseline.severity,
      activeIssues: baseline.active,
      resolvedIssues: baseline.resolved,
      summary: baseline.summary,
      primaryIssue: baseline.issue,
    },
    current: {
      periodLabel: "Now",
      recordedAt: new Date().toISOString(),
      healthScore: current.health,
      avgSeverity: current.severity,
      activeIssues: current.active,
      resolvedIssues: current.resolved,
      summary: current.summary,
      primaryIssue: current.issue,
    },
    healthDelta,
    severityDelta,
    issuesResolved: Math.max(issuesResolved, 0),
    percentImproved,
    trend,
  };
}

const DEMO_GH_CONDITIONS: Record<string, GreenhouseConditionCompare> = {
  [loc("north").greenhouseId]: demoCondition(
    "north",
    {
      health: 38,
      severity: 4.6,
      active: 5,
      resolved: 1,
      summary: "Heavy aphid and mealybug pressure across tomato rows.",
      issue: "Aphids & mealybug",
    },
    {
      health: 76,
      severity: 2.8,
      active: 2,
      resolved: 8,
      summary: "Aphids contained after neem treatments; rows 8–12 monitored.",
      issue: "Aphids (controlled)",
    },
  ),
  [loc("northA2").greenhouseId]: demoCondition(
    "northA2",
    {
      health: 44,
      severity: 4.2,
      active: 4,
      resolved: 2,
      summary: "Thrips and downy mildew on lettuce benches 1–6.",
      issue: "Thrips",
    },
    {
      health: 71,
      severity: 3.1,
      active: 2,
      resolved: 7,
      summary: "Thrips reduced; lettuce benches recovering after fungicide.",
      issue: "Thrips (low)",
    },
  ),
  [loc("east").greenhouseId]: demoCondition(
    "east",
    {
      health: 41,
      severity: 4.4,
      active: 5,
      resolved: 1,
      summary: "Whitefly outbreak and irrigation stress on capsicum.",
      issue: "Whitefly",
    },
    {
      health: 68,
      severity: 3.2,
      active: 3,
      resolved: 6,
      summary: "Whitefly counts down after pyrethrin; drip pressure restored.",
      issue: "Whitefly (moderate)",
    },
  ),
  [loc("eastE2").greenhouseId]: demoCondition(
    "eastE2",
    {
      health: 35,
      severity: 4.8,
      active: 6,
      resolved: 0,
      summary: "Severe leaf spot and bacterial spot on bell peppers.",
      issue: "Leaf spot",
    },
    {
      health: 62,
      severity: 3.6,
      active: 3,
      resolved: 5,
      summary: "Fungal lesions shrinking; copper and streptomycin follow-ups.",
      issue: "Leaf spot (treated)",
    },
  ),
  [loc("south").greenhouseId]: demoCondition(
    "south",
    {
      health: 46,
      severity: 4.0,
      active: 4,
      resolved: 2,
      summary: "Spider mites and root rot risk on cucumber vines.",
      issue: "Spider mites",
    },
    {
      health: 74,
      severity: 2.6,
      active: 1,
      resolved: 7,
      summary: "Mite treatment effective; drainage improvements holding.",
      issue: "Spider mites (resolved)",
    },
  ),
  [loc("southS2").greenhouseId]: demoCondition(
    "southS2",
    {
      health: 40,
      severity: 4.3,
      active: 5,
      resolved: 1,
      summary: "Caterpillar and nematode damage on cabbage trial beds.",
      issue: "Caterpillar",
    },
    {
      health: 70,
      severity: 2.9,
      active: 2,
      resolved: 6,
      summary: "Caterpillar localized; Bt spray and traps reducing spread.",
      issue: "Caterpillar (localized)",
    },
  ),
};

export function getDemoGreenhouseCondition(greenhouseId: string) {
  return DEMO_GH_CONDITIONS[greenhouseId] ?? null;
}

export function getDemoWorkerRows() {
  return DEMO_WORKERS.map((w) => {
    const farm = loc(w.farmKey);
    return {
      workerId: w.id,
      workerName: w.name,
      greenhouse: farm.greenhouseName,
      farm: farm.farmName,
      workingOn: w.task,
      problem: w.problem,
      mainIssue: w.mainIssue,
      severity: w.rating,
    };
  });
}

export type DemoLiveActivity = {
  id: string;
  activity_type: string;
  status: string;
  created_at: string;
  problem?: string;
  users?: { full_name?: string } | null;
  farms?: { name?: string } | null;
  greenhouses?: { name?: string } | null;
};

/** Recent field actions (last ~2 hours) for live feed */
export function getDemoLiveActivities(): DemoLiveActivity[] {
  return [
    {
      id: "live-1",
      activity_type: "Infestation report",
      status: "pending",
      created_at: ago(3),
      problem: "Brown lesions on bell pepper — fungal spread suspected",
      users: { full_name: "Meena Reddy" },
      farms: { name: loc("eastE2").farmName },
      greenhouses: { name: loc("eastE2").greenhouseName },
    },
    {
      id: "live-2",
      activity_type: "Spray treatment",
      status: "approved",
      created_at: ago(6),
      problem: "Pyrethrin applied for whitefly control",
      users: { full_name: "Asha Devi" },
      farms: { name: loc("east").farmName },
      greenhouses: { name: loc("east").greenhouseName },
    },
    {
      id: "live-3",
      activity_type: "Scouting",
      status: "pending",
      created_at: ago(14),
      problem: "Chewed holes on cabbage — caterpillar localized",
      users: { full_name: "Suresh Patel" },
      farms: { name: loc("southS2").farmName },
      greenhouses: { name: loc("southS2").greenhouseName },
    },
    {
      id: "live-4",
      activity_type: "Spray treatment",
      status: "approved",
      created_at: ago(12),
      problem: "Spinosad on cucumber vines for spider mites",
      users: { full_name: "Kumar Singh" },
      farms: { name: loc("south").farmName },
      greenhouses: { name: loc("south").greenhouseName },
    },
    {
      id: "live-5",
      activity_type: "Infestation report",
      status: "pending",
      created_at: ago(35),
      problem: "Silver streaks on lettuce — thrips on bench rows 3–6",
      users: { full_name: "Priya Nair" },
      farms: { name: loc("northA2").farmName },
      greenhouses: { name: loc("northA2").greenhouseName },
    },
    {
      id: "live-6",
      activity_type: "Irrigation",
      status: "approved",
      created_at: ago(28),
      problem: "Drip pressure low in zone B — capsicum stress risk",
      users: { full_name: "Arjun Menon" },
      farms: { name: loc("east").farmName },
      greenhouses: { name: loc("east").greenhouseName },
    },
    {
      id: "live-7",
      activity_type: "Spray treatment",
      status: "approved",
      created_at: ago(18),
      problem: "Neem oil follow-up on aphid hotspot rows 8–12",
      users: { full_name: "Lakshmi Iyer" },
      farms: { name: loc("north").farmName },
      greenhouses: { name: loc("north").greenhouseName },
    },
    {
      id: "live-8",
      activity_type: "Infestation report",
      status: "approved",
      created_at: ago(48),
      problem: "Sticky residue on capsicum — whitefly active",
      users: { full_name: "Asha Devi" },
      farms: { name: loc("east").farmName },
      greenhouses: { name: loc("east").greenhouseName },
    },
  ];
}

/** Older activities for history tab in live feed */
export function getDemoActivityHistory(): DemoLiveActivity[] {
  return [
    {
      id: "hist-act-1",
      activity_type: "Pest inspection",
      status: "approved",
      created_at: ago(60 * 5),
      problem: "No visible infestation — GH-A1 clear",
      users: { full_name: "Ravi Kumar" },
      farms: { name: loc("north").farmName },
      greenhouses: { name: loc("north").greenhouseName },
    },
    {
      id: "hist-act-2",
      activity_type: "Harvest prep",
      status: "approved",
      created_at: ago(60 * 8),
      problem: "Lettuce batch ready for pick in GH-A2",
      users: { full_name: "Priya Nair" },
      farms: { name: loc("northA2").farmName },
      greenhouses: { name: loc("northA2").greenhouseName },
    },
    {
      id: "hist-act-3",
      activity_type: "Spray treatment",
      status: "rejected",
      created_at: ago(60 * 12),
      problem: "Missing PPE photo — resubmit required",
      users: { full_name: "Kumar Singh" },
      farms: { name: loc("south").farmName },
      greenhouses: { name: loc("south").greenhouseName },
    },
    {
      id: "hist-act-4",
      activity_type: "Infestation report",
      status: "approved",
      created_at: ago(60 * 26),
      problem: "Mealybug clusters on stems — later resolved",
      users: { full_name: "Ravi Kumar" },
      farms: { name: loc("north").farmName },
      greenhouses: { name: loc("north").greenhouseName },
    },
    {
      id: "hist-act-5",
      activity_type: "Soil sampling",
      status: "approved",
      created_at: ago(60 * 48),
      problem: "Root rot trial bed — drainage improved",
      users: { full_name: "Kumar Singh" },
      farms: { name: loc("south").farmName },
      greenhouses: { name: loc("south").greenhouseName },
    },
  ];
}

export function getDemoActivityLogs() {
  return [...getDemoLiveActivities(), ...getDemoActivityHistory()].map(
    (a) => ({
      ...a,
      notes: a.problem ?? null,
      image_url: null,
    }),
  );
}

export function getDemoAlerts() {
  return [
    {
      id: "demo-alert-1",
      type: "infestation",
      message: `Severity 5 leaf spot at ${loc("eastE2").farmName} / ${loc("eastE2").greenhouseName} — assign spray crew.`,
      created_at: ago(8),
    },
    {
      id: "demo-alert-2",
      type: "infestation",
      message: `Aphid hotspot still active at ${loc("north").greenhouseName} after 90+ minutes.`,
      created_at: ago(25),
    },
    {
      id: "demo-alert-3",
      type: "operations",
      message: `Low drip pressure reported by Arjun Menon at ${loc("east").greenhouseName}.`,
      created_at: ago(30),
    },
  ];
}

export function getDemoKpis() {
  const hotspots = getDemoHotspots();
  const active = hotspots.filter((h) => h.status === "active");
  const severe = active.filter((h) => h.severity >= 4);
  const spraysToday = getDemoSprays().length + 4;
  return {
    activeHotspots: active.length,
    spraysToday,
    workersInField: getDemoPositions().length,
    severeHotspots: severe.length,
  };
}
