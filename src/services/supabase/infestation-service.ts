import { routeDataThroughMssql } from "@/lib/mssql/client-routing";
import { createClient } from "@/lib/supabase/client";
import type { InfestationHotspot, InfestationStatus } from "@/types/db";
import * as mssql from "@/services/mssql/ops-actions";

export type ReportInfestationInput = {
  farm_id: string;
  greenhouse_id: string | null;
  reported_by: string;
  latitude: number;
  longitude: number;
  pest_type: string;
  problem: string;
  main_issue: string;
  severity: number;
};

export async function reportInfestation(input: ReportInfestationInput) {
  if (routeDataThroughMssql()) return mssql.mssqlReportInfestationAction(input);
  const supabase = createClient();
  return supabase.from("infestation_hotspots").insert(input).select().single();
}

export async function listHotspots(limit = 200) {
  if (routeDataThroughMssql()) return mssql.mssqlListHotspotsAction(limit);
  const supabase = createClient();
  return supabase
    .from("infestation_hotspots")
    .select("*, farms(name), greenhouses(name), users:reported_by(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function listHotspotsForHistory(options?: {
  greenhouseId?: string;
  since?: Date;
  limit?: number;
}) {
  if (routeDataThroughMssql()) {
    return mssql.mssqlListHotspotsForHistoryAction({
      greenhouseId: options?.greenhouseId,
      sinceIso: options?.since?.toISOString(),
      limit: options?.limit,
    });
  }
  const supabase = createClient();
  let query = supabase
    .from("infestation_hotspots")
    .select("*, farms(name), greenhouses(name), users:reported_by(full_name)")
    .order("created_at", { ascending: false });

  if (options?.since) {
    query = query.gte("created_at", options.since.toISOString());
  }
  if (options?.greenhouseId) {
    query = query.eq("greenhouse_id", options.greenhouseId);
  }

  return query.limit(options?.limit ?? 500);
}

export async function listActiveHotspots(limit = 50) {
  if (routeDataThroughMssql()) return mssql.mssqlListActiveHotspotsAction(limit);
  const supabase = createClient();
  return supabase
    .from("infestation_hotspots")
    .select(
      "*, farms(name), greenhouses(name), users:reported_by(full_name)",
    )
    .eq("status", "active")
    .order("severity", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function getHotspotById(id: string) {
  if (routeDataThroughMssql()) return mssql.mssqlGetHotspotByIdAction(id);
  const supabase = createClient();
  return supabase
    .from("infestation_hotspots")
    .select("*, farms(name), greenhouses(name), users:reported_by(full_name)")
    .eq("id", id)
    .single();
}

export async function listActiveHotspotsForGreenhouse(greenhouseId: string) {
  if (routeDataThroughMssql()) {
    return mssql.mssqlListActiveHotspotsForGreenhouseAction(greenhouseId);
  }
  const supabase = createClient();
  return supabase
    .from("infestation_hotspots")
    .select(
      "id, pest_type, problem, main_issue, severity, status, latitude, longitude, created_at, greenhouse_id, farm_id",
    )
    .eq("greenhouse_id", greenhouseId)
    .eq("status", "active")
    .order("severity", { ascending: false });
}

export async function updateHotspotStatus(id: string, status: InfestationStatus) {
  if (routeDataThroughMssql()) return mssql.mssqlUpdateHotspotStatusAction(id, status);
  const supabase = createClient();
  return supabase.from("infestation_hotspots").update({ status }).eq("id", id);
}

export async function updateHotspotAfterSpray(
  id: string,
  options?: { severityAfter?: number | null },
) {
  if (routeDataThroughMssql()) return mssql.mssqlUpdateHotspotAfterSprayAction(id, options);
  const supabase = createClient();
  const patch: { status: InfestationStatus; severity?: number } = {
    status: "sprayed",
  };
  if (
    options?.severityAfter != null &&
    options.severityAfter >= 1 &&
    options.severityAfter <= 5
  ) {
    patch.severity = options.severityAfter;
  }
  return supabase.from("infestation_hotspots").update(patch).eq("id", id);
}

export async function getHotspotKpis() {
  if (routeDataThroughMssql()) return mssql.mssqlGetHotspotKpisAction();
  const supabase = createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [active, severe, resolvedToday] = await Promise.all([
    supabase
      .from("infestation_hotspots")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("infestation_hotspots")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gte("severity", 4),
    supabase
      .from("infestation_hotspots")
      .select("id", { count: "exact", head: true })
      .eq("status", "resolved")
      .gte("created_at", today.toISOString()),
  ]);

  return {
    activeHotspots: active.count ?? 0,
    severeHotspots: severe.count ?? 0,
    resolvedToday: resolvedToday.count ?? 0,
  };
}

export type HotspotRow = InfestationHotspot & {
  farms?: { name?: string } | null;
  greenhouses?: { name?: string } | null;
  users?: { full_name?: string } | null;
};
