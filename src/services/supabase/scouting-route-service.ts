import { createClient } from "@/lib/supabase/client";
import { distanceBetweenPoints, durationSeconds } from "@/lib/route-metrics";
import { isUuid } from "@/lib/uuid";
import type { ScoutingRoutePoint, ScoutingRound } from "@/types/db";

export type RoutePointInput = {
  latitude: number;
  longitude: number;
  accuracy_m?: number | null;
  recorded_at?: string;
};

export async function appendRoutePoints(roundId: string, points: RoutePointInput[]) {
  if (!isUuid(roundId) || !points.length) {
    return { data: [] as ScoutingRoutePoint[], error: null };
  }

  const supabase = createClient();
  const rows = points.map((p) => ({
    round_id: roundId,
    latitude: p.latitude,
    longitude: p.longitude,
    accuracy_m: p.accuracy_m ?? null,
    recorded_at: p.recorded_at ?? new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("scouting_route_points")
    .insert(rows)
    .select();

  if (!error && data?.length) {
    const { count } = await supabase
      .from("scouting_route_points")
      .select("*", { count: "exact", head: true })
      .eq("round_id", roundId);

    if (count != null) {
      await supabase
        .from("scouting_rounds")
        .update({ point_count: count })
        .eq("id", roundId);
    }
  }

  return { data: (data as ScoutingRoutePoint[]) ?? [], error };
}

export async function listRoutePoints(roundId: string) {
  if (!isUuid(roundId)) {
    return { data: [] as ScoutingRoutePoint[], error: null };
  }
  const supabase = createClient();
  return supabase
    .from("scouting_route_points")
    .select("*")
    .eq("round_id", roundId)
    .order("recorded_at", { ascending: true });
}

export async function listRoutePointsForRounds(roundIds: string[]) {
  const ids = roundIds.filter(isUuid);
  if (!ids.length) {
    return { data: [] as ScoutingRoutePoint[], error: null };
  }
  const supabase = createClient();
  return supabase
    .from("scouting_route_points")
    .select("*")
    .in("round_id", ids)
    .order("recorded_at", { ascending: true });
}

export async function finalizeRoundMetrics(
  roundId: string,
  options?: { coveragePct?: number | null },
) {
  if (!isUuid(roundId)) {
    return { data: null, error: new Error("Invalid round id") };
  }

  const supabase = createClient();
  const { data: round, error: roundError } = await supabase
    .from("scouting_rounds")
    .select("*")
    .eq("id", roundId)
    .maybeSingle();

  if (roundError || !round) {
    return { data: null, error: roundError ?? new Error("Round not found") };
  }

  const { data: points, error: pointsError } = await listRoutePoints(roundId);
  if (pointsError) return { data: null, error: pointsError };

  const endedAt = new Date().toISOString();
  const distance_m = distanceBetweenPoints(
    (points as ScoutingRoutePoint[] | null)?.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
    })) ?? [],
  );
  const duration_s = durationSeconds(round.started_at, endedAt);
  const point_count = points?.length ?? 0;

  const update: Partial<ScoutingRound> & {
    status: "completed";
    ended_at: string;
  } = {
    status: "completed",
    ended_at: endedAt,
    distance_m,
    duration_s,
    point_count,
  };

  if (options?.coveragePct != null) {
    update.coverage_pct = options.coveragePct;
  }

  return supabase
    .from("scouting_rounds")
    .update(update)
    .eq("id", roundId)
    .select()
    .single();
}

export async function updateRoundCoverage(roundId: string, coveragePct: number) {
  if (!isUuid(roundId)) {
    return { data: null, error: new Error("Invalid round id") };
  }
  const supabase = createClient();
  return supabase
    .from("scouting_rounds")
    .update({ coverage_pct: coveragePct })
    .eq("id", roundId)
    .select()
    .single();
}
