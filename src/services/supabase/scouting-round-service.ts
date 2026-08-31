import { createClient } from "@/lib/supabase/client";
import { isUuid } from "@/lib/uuid";
import type { ScoutingRound } from "@/types/db";

export async function getActiveRound(scoutId: string, greenhouseId: string) {
  const supabase = createClient();
  return supabase
    .from("scouting_rounds")
    .select("*")
    .eq("scout_id", scoutId)
    .eq("greenhouse_id", greenhouseId)
    .eq("status", "active")
    .maybeSingle();
}

/** Any active round for this scout (newest first) — survives greenhouse GPS reassignment. */
export async function getAnyActiveRoundForScout(scoutId: string) {
  const supabase = createClient();
  return supabase
    .from("scouting_rounds")
    .select(
      `*,
      greenhouses(name),
      farms(name)`,
    )
    .eq("scout_id", scoutId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function startScoutingRound(input: {
  scout_id: string;
  farm_id: string;
  greenhouse_id: string;
}) {
  const supabase = createClient();
  // Prefer an existing active round for this scout so GPS greenhouse hops don't orphan sessions
  const anyActive = await getAnyActiveRoundForScout(input.scout_id);
  if (anyActive.data) {
    return { data: anyActive.data as ScoutingRound, error: null };
  }

  return supabase
    .from("scouting_rounds")
    .insert({ ...input, status: "active" })
    .select()
    .single();
}

export async function completeScoutingRound(roundId: string) {
  const supabase = createClient();
  return supabase
    .from("scouting_rounds")
    .update({ status: "completed", ended_at: new Date().toISOString() })
    .eq("id", roundId)
    .select()
    .single();
}

export type ScoutingRoundRow = ScoutingRound & {
  users?: { full_name?: string } | null;
  greenhouses?: { name?: string } | null;
  farms?: { name?: string } | null;
};

export async function listScoutingRounds(limit = 50) {
  const supabase = createClient();
  return supabase
    .from("scouting_rounds")
    .select(
      `*,
      users:scout_id(full_name),
      greenhouses(name),
      farms(name)`,
    )
    .order("started_at", { ascending: false })
    .limit(limit);
}

export async function listRecordsForRound(roundId: string) {
  if (!isUuid(roundId)) {
    return { data: [], error: null };
  }
  const supabase = createClient();
  return supabase
    .from("scouting_records")
    .select(
      `*,
      crop_varieties(name),
      greenhouses(name)`,
    )
    .eq("round_id", roundId)
    .order("recorded_at", { ascending: true });
}
