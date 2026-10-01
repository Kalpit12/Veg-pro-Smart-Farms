import { endOfYesterday, format, startOfYesterday } from "date-fns";

import type { DemoScoutingRound } from "@/store/scouting-store";
import type { ScoutingRoundRow } from "@/services/supabase/scouting-round-service";

export type YesterdayScoutRound = {
  roundId: string;
  greenhouseName: string;
  scoutName: string;
  farmName: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  stopCount: number;
  distanceM: number;
  durationS: number | null;
  coveragePct: number | null;
};

export function yesterdayWindow() {
  return { from: startOfYesterday(), to: endOfYesterday() };
}

export function yesterdayLabel() {
  return format(startOfYesterday(), "EEEE, MMM d");
}

export function isWithinYesterday(iso: string) {
  const t = new Date(iso).getTime();
  const { from, to } = yesterdayWindow();
  return t >= from.getTime() && t <= to.getTime();
}

export function roundToYesterdaySummary(
  round: ScoutingRoundRow | DemoScoutingRound,
  farmName = "Star",
): YesterdayScoutRound {
  const isRemote = "scout_id" in round;
  if (isRemote) {
    const r = round as ScoutingRoundRow;
    return {
      roundId: r.id,
      greenhouseName: r.greenhouses?.name ?? "—",
      scoutName: r.users?.full_name ?? "Scout",
      farmName: r.farms?.name ?? farmName,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      status: r.status,
      stopCount: r.stop_count ?? 0,
      distanceM: Number(r.distance_m ?? 0),
      durationS: r.duration_s ?? null,
      coveragePct: r.coverage_pct != null ? Number(r.coverage_pct) : null,
    };
  }
  const d = round as DemoScoutingRound;
  return {
    roundId: d.id,
    greenhouseName: d.greenhouseName,
    scoutName: d.scoutName,
    farmName,
    startedAt: d.startedAt,
    endedAt: d.endedAt ?? null,
    status: d.status,
    stopCount: d.stopCount,
    distanceM: d.distanceM ?? 0,
    durationS: d.durationS ?? null,
    coveragePct: d.coveragePct ?? null,
  };
}

export function filterRoundsStartedYesterday(
  rounds: (ScoutingRoundRow | DemoScoutingRound)[],
): YesterdayScoutRound[] {
  return rounds
    .filter((r) => {
      const started = "started_at" in r ? r.started_at : r.startedAt;
      return isWithinYesterday(started);
    })
    .map((r) => roundToYesterdaySummary(r))
    .sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
}

/** One card per greenhouse (latest round if multiple scouts visited yesterday). */
export function dedupeByGreenhouse(rounds: YesterdayScoutRound[]) {
  const byGh = new Map<string, YesterdayScoutRound>();
  for (const r of rounds) {
    const prev = byGh.get(r.greenhouseName);
    if (!prev || new Date(r.startedAt) > new Date(prev.startedAt)) {
      byGh.set(r.greenhouseName, r);
    }
  }
  return Array.from(byGh.values()).sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
}
