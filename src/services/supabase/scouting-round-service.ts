import { routeDataThroughMssql } from "@/lib/mssql/client-routing";
import { createClient } from "@/lib/supabase/client";
import { isUuid } from "@/lib/uuid";
import type { ScoutingRound } from "@/types/db";
import * as mssql from "@/services/mssql/scouting-actions";

export async function getActiveRound(scoutId: string, greenhouseId: string) {
  if (routeDataThroughMssql()) {
    const { data } = await mssql.mssqlGetAnyActiveRoundForScoutAction(scoutId);
    if (!data || data.greenhouse_id !== greenhouseId) {
      return { data: null, error: null };
    }
    return { data, error: null };
  }
  const supabase = createClient();
  return supabase
    .from("scouting_rounds")
    .select("*")
    .eq("scout_id", scoutId)
    .eq("greenhouse_id", greenhouseId)
    .eq("status", "active")
    .maybeSingle();
}

export async function getAnyActiveRoundForScout(scoutId: string) {
  if (routeDataThroughMssql()) return mssql.mssqlGetAnyActiveRoundForScoutAction(scoutId);
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
  id?: string;
  started_at?: string;
}) {
  if (routeDataThroughMssql()) return mssql.mssqlStartScoutingRoundAction(input);
  const supabase = createClient();
  const anyActive = await getAnyActiveRoundForScout(input.scout_id);
  if (anyActive.data) {
    return { data: anyActive.data as ScoutingRound, error: null };
  }

  const row: Record<string, unknown> = {
    scout_id: input.scout_id,
    farm_id: input.farm_id,
    greenhouse_id: input.greenhouse_id,
    status: "active",
  };
  if (input.id) row.id = input.id;
  if (input.started_at) row.started_at = input.started_at;

  return supabase.from("scouting_rounds").insert(row).select().single();
}

export async function completeScoutingRound(roundId: string) {
  if (routeDataThroughMssql()) return mssql.mssqlCompleteScoutingRoundAction(roundId);
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
  if (routeDataThroughMssql()) return mssql.mssqlListScoutingRoundsAction(limit);
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

export async function listScoutingRoundsBetween(from: Date, to: Date, limit = 80) {
  if (routeDataThroughMssql()) {
    return mssql.mssqlListScoutingRoundsBetweenAction(
      from.toISOString(),
      to.toISOString(),
      limit,
    );
  }
  const supabase = createClient();
  return supabase
    .from("scouting_rounds")
    .select(
      `*,
      users:scout_id(full_name),
      greenhouses(name),
      farms(name)`,
    )
    .gte("started_at", from.toISOString())
    .lte("started_at", to.toISOString())
    .order("started_at", { ascending: false })
    .limit(limit);
}

export async function listRecordsForRound(roundId: string) {
  if (!isUuid(roundId)) {
    return { data: [], error: null };
  }
  if (routeDataThroughMssql()) return mssql.mssqlListRecordsForRoundAction(roundId);
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
