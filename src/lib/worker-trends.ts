import { format, parseISO, subDays } from "date-fns";

import { BEMACK_GREENHOUSES } from "@/lib/bemack-master-data";

export type WorkerWorkKind =
  | "infestation_report"
  | "spray"
  | "scouting_stop"
  | "scouting_round"
  | "activity";

export type WorkerHistoryEvent = {
  id: string;
  workerId: string;
  workerName: string;
  kind: WorkerWorkKind;
  title: string;
  detail: string | null;
  occurredAt: string;
  farmName: string | null;
  greenhouseId: string | null;
  greenhouseName: string | null;
  severity: number | null;
  status: string | null;
  /** Present for scouting_round events */
  roundId?: string | null;
  durationS?: number | null;
  distanceM?: number | null;
  coveragePct?: number | null;
  stopCount?: number | null;
  pointCount?: number | null;
};

export type WorkerRoundMetric = {
  id: string;
  greenhouseId: string | null;
  greenhouseName: string | null;
  startedAt: string;
  endedAt: string | null;
  status: string;
  stopCount: number;
  durationS: number | null;
  distanceM: number;
  coveragePct: number | null;
  pointCount: number;
  /** Quality flags for Scarab-style audits */
  flags: ("short" | "low_coverage" | "no_gps")[];
};

export type DaySparkPoint = {
  dateKey: string;
  label: string;
  count: number;
};

export type WorkerTrendsSummary = {
  workerId: string;
  workerName: string;
  totalEvents: number;
  reports: number;
  sprays: number;
  scoutingStops: number;
  activities: number;
  greenhouseCount: number;
  greenhouseNames: string[];
  lastActiveAt: string | null;
  /** Scarab-style round KPIs */
  roundsCompleted: number;
  totalDurationS: number;
  totalDistanceM: number;
  avgCoveragePct: number | null;
  totalRoundStops: number;
  housesThisWeek: string[];
  stopsPerHour: number | null;
  highSeverityFinds: number;
  sparkline: DaySparkPoint[];
  rounds: WorkerRoundMetric[];
  isScout: boolean;
  auditFlags: ("short" | "low_coverage" | "no_gps")[];
};

export type WorkerTrendsSort =
  | "activity"
  | "coverage"
  | "time"
  | "houses"
  | "name";

export function kindLabel(kind: WorkerWorkKind) {
  switch (kind) {
    case "infestation_report":
      return "Report";
    case "spray":
      return "Spray";
    case "scouting_stop":
      return "Scouting";
    case "scouting_round":
      return "Round";
    case "activity":
      return "Activity";
  }
}

export function roundQualityFlags(round: {
  durationS: number | null;
  coveragePct: number | null;
  pointCount: number;
  stopCount: number;
}): ("short" | "low_coverage" | "no_gps")[] {
  const flags: ("short" | "low_coverage" | "no_gps")[] = [];
  if (round.durationS != null && round.durationS > 0 && round.durationS < 15 * 60) {
    flags.push("short");
  }
  if (round.coveragePct != null && round.coveragePct < 25) {
    flags.push("low_coverage");
  }
  if (round.pointCount === 0 && round.stopCount > 0) {
    flags.push("no_gps");
  }
  return flags;
}

function buildSparkline(events: WorkerHistoryEvent[], days: number): DaySparkPoint[] {
  const points: DaySparkPoint[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const day = subDays(new Date(), d);
    const dateKey = format(day, "yyyy-MM-dd");
    const count = events.filter((e) => e.occurredAt.slice(0, 10) === dateKey).length;
    points.push({
      dateKey,
      label: format(day, "EEE"),
      count,
    });
  }
  return points;
}

function housesInLastDays(events: WorkerHistoryEvent[], days: number): string[] {
  const since = subDays(new Date(), days).toISOString();
  const names = new Set<string>();
  for (const e of events) {
    if (e.occurredAt < since) continue;
    if (
      (e.kind === "scouting_stop" || e.kind === "scouting_round") &&
      e.greenhouseName &&
      e.greenhouseName !== "—"
    ) {
      names.add(e.greenhouseName);
    }
  }
  return Array.from(names).sort();
}

export function summarizeWorkerEvents(
  workerId: string,
  workerName: string,
  events: WorkerHistoryEvent[],
  options?: { lookbackDays?: number },
): WorkerTrendsSummary {
  const lookbackDays = options?.lookbackDays ?? 14;
  const greenhouseNames = new Set<string>();
  let reports = 0;
  let sprays = 0;
  let scoutingStops = 0;
  let activities = 0;
  let lastActiveAt: string | null = null;
  let highSeverityFinds = 0;

  const rounds: WorkerRoundMetric[] = [];
  let totalDurationS = 0;
  let totalDistanceM = 0;
  let coverageSum = 0;
  let coverageN = 0;
  let totalRoundStops = 0;
  const auditFlagSet = new Set<"short" | "low_coverage" | "no_gps">();

  for (const event of events) {
    if (event.workerId !== workerId) continue;
    if (event.greenhouseName && event.greenhouseName !== "—") {
      greenhouseNames.add(event.greenhouseName);
    }
    if (!lastActiveAt || event.occurredAt > lastActiveAt) {
      lastActiveAt = event.occurredAt;
    }

    if (event.kind === "infestation_report") {
      reports += 1;
      if ((event.severity ?? 0) >= 4) highSeverityFinds += 1;
    } else if (event.kind === "spray") {
      sprays += 1;
    } else if (event.kind === "scouting_stop") {
      scoutingStops += 1;
      if ((event.severity ?? 0) >= 4) highSeverityFinds += 1;
    } else if (event.kind === "activity") {
      activities += 1;
    } else if (event.kind === "scouting_round") {
      const flags = roundQualityFlags({
        durationS: event.durationS ?? null,
        coveragePct: event.coveragePct ?? null,
        pointCount: event.pointCount ?? 0,
        stopCount: event.stopCount ?? 0,
      });
      flags.forEach((f) => auditFlagSet.add(f));
      rounds.push({
        id: event.roundId ?? event.id.replace(/^round-/, ""),
        greenhouseId: event.greenhouseId,
        greenhouseName: event.greenhouseName,
        startedAt: event.occurredAt,
        endedAt: event.status === "active" ? null : event.occurredAt,
        status: event.status ?? "completed",
        stopCount: event.stopCount ?? 0,
        durationS: event.durationS ?? null,
        distanceM: event.distanceM ?? 0,
        coveragePct: event.coveragePct ?? null,
        pointCount: event.pointCount ?? 0,
        flags,
      });
      if (event.durationS) totalDurationS += event.durationS;
      totalDistanceM += event.distanceM ?? 0;
      totalRoundStops += event.stopCount ?? 0;
      if (event.coveragePct != null) {
        coverageSum += event.coveragePct;
        coverageN += 1;
      }
    }
  }

  const names = Array.from(greenhouseNames).sort();
  const workerEvents = events.filter((e) => e.workerId === workerId);
  const isScout = scoutingStops > 0 || rounds.length > 0;
  const stopsPerHour =
    totalDurationS > 0
      ? Math.round((totalRoundStops / (totalDurationS / 3600)) * 10) / 10
      : scoutingStops > 0 && totalDurationS === 0
        ? null
        : null;

  // Prefer round-based stops/hour; fall back using scouting stops if we have duration
  let computedStopsPerHour = stopsPerHour;
  if (computedStopsPerHour == null && totalDurationS > 0 && scoutingStops > 0) {
    computedStopsPerHour =
      Math.round((scoutingStops / (totalDurationS / 3600)) * 10) / 10;
  }

  return {
    workerId,
    workerName,
    totalEvents: reports + sprays + scoutingStops + activities + rounds.length,
    reports,
    sprays,
    scoutingStops,
    activities,
    greenhouseCount: names.length,
    greenhouseNames: names,
    lastActiveAt,
    roundsCompleted: rounds.filter((r) => r.status !== "active").length,
    totalDurationS,
    totalDistanceM,
    avgCoveragePct:
      coverageN > 0 ? Math.round((coverageSum / coverageN) * 10) / 10 : null,
    totalRoundStops,
    housesThisWeek: housesInLastDays(workerEvents, 7),
    stopsPerHour: computedStopsPerHour,
    highSeverityFinds,
    sparkline: buildSparkline(workerEvents, Math.min(lookbackDays, 14)),
    rounds: rounds.sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    ),
    isScout,
    auditFlags: Array.from(auditFlagSet),
  };
}

export function buildWorkerSummaries(
  workers: { id: string; name: string }[],
  events: WorkerHistoryEvent[],
  options?: { lookbackDays?: number; sort?: WorkerTrendsSort; scoutsOnly?: boolean },
): WorkerTrendsSummary[] {
  const sort = options?.sort ?? "activity";
  let list = workers.map((w) =>
    summarizeWorkerEvents(w.id, w.name, events, {
      lookbackDays: options?.lookbackDays,
    }),
  );

  if (options?.scoutsOnly) {
    list = list.filter((s) => s.isScout);
  }

  list.sort((a, b) => {
    if (sort === "name") return a.workerName.localeCompare(b.workerName);
    if (sort === "coverage") {
      const ac = a.avgCoveragePct ?? -1;
      const bc = b.avgCoveragePct ?? -1;
      if (bc !== ac) return bc - ac;
    }
    if (sort === "time") {
      if (b.totalDurationS !== a.totalDurationS) {
        return b.totalDurationS - a.totalDurationS;
      }
    }
    if (sort === "houses") {
      if (b.greenhouseCount !== a.greenhouseCount) {
        return b.greenhouseCount - a.greenhouseCount;
      }
    }
    if (b.totalEvents !== a.totalEvents) return b.totalEvents - a.totalEvents;
    return a.workerName.localeCompare(b.workerName);
  });

  return list;
}

/** Houses with no scouting in the last `cycleDays` (farm-wide). */
export function missedGreenhousesThisCycle(
  events: WorkerHistoryEvent[],
  cycleDays = 7,
  expectedHouses: readonly string[] = BEMACK_GREENHOUSES,
): string[] {
  const since = subDays(new Date(), cycleDays).toISOString();
  const scouted = new Set<string>();
  for (const e of events) {
    if (e.occurredAt < since) continue;
    if (
      (e.kind === "scouting_stop" || e.kind === "scouting_round") &&
      e.greenhouseName
    ) {
      scouted.add(e.greenhouseName);
    }
  }
  return expectedHouses.filter((name) => !scouted.has(name));
}

export function formatEventWhen(iso: string) {
  try {
    return format(parseISO(iso), "dd MMM yyyy · HH:mm");
  } catch {
    return iso;
  }
}
