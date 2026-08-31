import type { DemoScoutingRecord } from "@/store/scouting-store";

export type ScoutRouteStop = {
  id: string;
  greenhouseName: string;
  columnNo: number;
  bayNo: number;
  lat: number | null;
  lng: number | null;
  recordedAt: string;
  label: string;
  scoutName: string;
  issue: string;
  rating: number | null;
};

export type ScoutRouteSummary = {
  roundId: string;
  scoutName: string;
  greenhouseName: string;
  startedAt: string;
  endedAt: string | null;
  status: "active" | "completed";
  stopCount: number;
  durationMinutes: number | null;
  stops: ScoutRouteStop[];
};

export function stopsFromRecords(
  records: DemoScoutingRecord[],
  roundId?: string,
): ScoutRouteStop[] {
  const filtered = roundId
    ? records.filter((r) => r.roundId === roundId)
    : records;

  return [...filtered]
    .filter((r) => r.columnNo > 0 && r.bayNo > 0)
    .sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    )
    .map((r) => ({
      id: r.id,
      greenhouseName: r.greenhouseName,
      columnNo: r.columnNo,
      bayNo: r.bayNo,
      lat: r.latitude,
      lng: r.longitude,
      recordedAt: r.recordedAt,
      label: `${r.greenhouseName} · Col ${r.columnNo} Bay ${r.bayNo}`,
      scoutName: r.scoutName,
      issue: r.issue,
      rating: r.rating,
    }));
}

export function routeSummaryFromDemo(
  round: {
    id: string;
    scoutName: string;
    greenhouseName: string;
    startedAt: string;
    endedAt?: string | null;
    status: "active" | "completed";
    stopCount: number;
  },
  records: DemoScoutingRecord[],
): ScoutRouteSummary {
  const stops = stopsFromRecords(records, round.id);
  const end = round.endedAt ? new Date(round.endedAt) : null;
  const start = new Date(round.startedAt);
  const durationMinutes = end
    ? Math.round((end.getTime() - start.getTime()) / 60000)
    : null;

  return {
    roundId: round.id,
    scoutName: round.scoutName,
    greenhouseName: round.greenhouseName,
    startedAt: round.startedAt,
    endedAt: round.endedAt ?? null,
    status: round.status,
    stopCount: round.stopCount,
    durationMinutes,
    stops,
  };
}
