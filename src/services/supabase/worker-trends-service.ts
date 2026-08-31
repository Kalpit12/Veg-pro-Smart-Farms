import { createClient } from "@/lib/supabase/client";
import {
  roundQualityFlags,
  type WorkerHistoryEvent,
} from "@/lib/worker-trends";

export type WorkerTrendsFetchResult = {
  workers: { id: string; name: string }[];
  events: WorkerHistoryEvent[];
};

export async function listWorkerTrendsSince(
  since: Date,
): Promise<WorkerTrendsFetchResult> {
  const supabase = createClient();
  const sinceIso = since.toISOString();

  const { data: workers, error: workersError } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "worker")
    .order("full_name");

  if (workersError) throw workersError;
  if (!workers?.length) return { workers: [], events: [] };

  const workerIds = workers.map((w) => w.id);

  const [hotspotsRes, spraysRes, scoutingRes, activitiesRes, roundsRes] =
    await Promise.all([
      supabase
        .from("infestation_hotspots")
        .select(
          "id, reported_by, pest_type, problem, main_issue, severity, status, created_at, greenhouse_id, greenhouses(name), farms(name), users:reported_by(full_name)",
        )
        .in("reported_by", workerIds)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("spray_treatments")
        .select(
          "id, worker_id, product_name, created_at, greenhouse_id, greenhouses(name), farms(name), users:worker_id(full_name)",
        )
        .in("worker_id", workerIds)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("scouting_records")
        .select(
          "id, scout_id, issue_type, issue_name, rating, recorded_at, greenhouse_id, greenhouses(name), farms(name), users:scout_id(full_name)",
        )
        .in("scout_id", workerIds)
        .gte("recorded_at", sinceIso)
        .order("recorded_at", { ascending: false })
        .limit(1000),
      supabase
        .from("activities")
        .select(
          "id, worker_id, activity_type, status, notes, created_at, greenhouse_id, greenhouses(name), farms(name), users:worker_id(full_name)",
        )
        .in("worker_id", workerIds)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("scouting_rounds")
        .select(
          "id, scout_id, greenhouse_id, status, started_at, ended_at, stop_count, distance_m, duration_s, point_count, coverage_pct, greenhouses(name), farms(name), users:scout_id(full_name)",
        )
        .in("scout_id", workerIds)
        .gte("started_at", sinceIso)
        .order("started_at", { ascending: false })
        .limit(500),
    ]);

  if (hotspotsRes.error) throw hotspotsRes.error;
  if (spraysRes.error) throw spraysRes.error;
  if (scoutingRes.error) throw scoutingRes.error;
  if (activitiesRes.error) throw activitiesRes.error;
  if (roundsRes.error) throw roundsRes.error;

  const events: WorkerHistoryEvent[] = [];

  for (const h of hotspotsRes.data ?? []) {
    const name =
      (h.users as { full_name?: string } | null)?.full_name ??
      workers.find((w) => w.id === h.reported_by)?.full_name ??
      "Worker";
    events.push({
      id: `report-${h.id}`,
      workerId: h.reported_by,
      workerName: name,
      kind: "infestation_report",
      title: h.pest_type,
      detail: h.problem ?? h.main_issue ?? null,
      occurredAt: h.created_at,
      farmName: (h.farms as { name?: string } | null)?.name ?? null,
      greenhouseId: h.greenhouse_id ?? null,
      greenhouseName: (h.greenhouses as { name?: string } | null)?.name ?? null,
      severity: h.severity ?? null,
      status: h.status ?? null,
    });
  }

  for (const s of spraysRes.data ?? []) {
    if (!s.worker_id) continue;
    const name =
      (s.users as { full_name?: string } | null)?.full_name ??
      workers.find((w) => w.id === s.worker_id)?.full_name ??
      "Worker";
    events.push({
      id: `spray-${s.id}`,
      workerId: s.worker_id,
      workerName: name,
      kind: "spray",
      title: s.product_name,
      detail: "Spray treatment logged",
      occurredAt: s.created_at,
      farmName: (s.farms as { name?: string } | null)?.name ?? null,
      greenhouseId: s.greenhouse_id ?? null,
      greenhouseName: (s.greenhouses as { name?: string } | null)?.name ?? null,
      severity: null,
      status: null,
    });
  }

  for (const r of scoutingRes.data ?? []) {
    const name =
      (r.users as { full_name?: string } | null)?.full_name ??
      workers.find((w) => w.id === r.scout_id)?.full_name ??
      "Scout";
    events.push({
      id: `scout-${r.id}`,
      workerId: r.scout_id,
      workerName: name,
      kind: "scouting_stop",
      title: r.issue_name,
      detail: `${r.issue_type}${r.rating != null ? ` · rating ${r.rating}/5` : ""}`,
      occurredAt: r.recorded_at,
      farmName: (r.farms as { name?: string } | null)?.name ?? null,
      greenhouseId: r.greenhouse_id ?? null,
      greenhouseName: (r.greenhouses as { name?: string } | null)?.name ?? null,
      severity: r.rating ?? null,
      status: null,
    });
  }

  for (const a of activitiesRes.data ?? []) {
    if (!a.worker_id) continue;
    const name =
      (a.users as { full_name?: string } | null)?.full_name ??
      workers.find((w) => w.id === a.worker_id)?.full_name ??
      "Worker";
    events.push({
      id: `activity-${a.id}`,
      workerId: a.worker_id,
      workerName: name,
      kind: "activity",
      title: a.activity_type,
      detail: a.notes ?? null,
      occurredAt: a.created_at,
      farmName: (a.farms as { name?: string } | null)?.name ?? null,
      greenhouseId: a.greenhouse_id ?? null,
      greenhouseName: (a.greenhouses as { name?: string } | null)?.name ?? null,
      severity: null,
      status: a.status ?? null,
    });
  }

  for (const round of roundsRes.data ?? []) {
    const name =
      (round.users as { full_name?: string } | null)?.full_name ??
      workers.find((w) => w.id === round.scout_id)?.full_name ??
      "Scout";
    const durationS = round.duration_s;
    const distanceM = Number(round.distance_m ?? 0);
    const coveragePct =
      round.coverage_pct != null ? Number(round.coverage_pct) : null;
    const pointCount = Number(round.point_count ?? 0);
    const stopCount = Number(round.stop_count ?? 0);
    const flags = roundQualityFlags({
      durationS,
      coveragePct,
      pointCount,
      stopCount,
    });

    events.push({
      id: `round-${round.id}`,
      workerId: round.scout_id,
      workerName: name,
      kind: "scouting_round",
      title: `Scouting round · ${stopCount} stops`,
      detail: [
        flags.length ? `Flags: ${flags.join(", ")}` : null,
        coveragePct != null ? `Coverage ${coveragePct}%` : null,
      ]
        .filter(Boolean)
        .join(" · ") || null,
      occurredAt: round.started_at,
      farmName: (round.farms as { name?: string } | null)?.name ?? null,
      greenhouseId: round.greenhouse_id ?? null,
      greenhouseName:
        (round.greenhouses as { name?: string } | null)?.name ?? null,
      severity: null,
      status: round.status,
      roundId: round.id,
      durationS,
      distanceM,
      coveragePct,
      stopCount,
      pointCount,
    });
  }

  events.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  return {
    workers: workers.map((w) => ({ id: w.id, name: w.full_name })),
    events,
  };
}
