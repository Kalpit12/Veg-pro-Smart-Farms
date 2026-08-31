import { createClient } from "@/lib/supabase/client";
import type { InfestationHotspot, InfestationStatus } from "@/types/db";

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
  const supabase = createClient();
  return supabase.from("infestation_hotspots").insert(input).select().single();
}

export async function listHotspots(limit = 200) {
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
  const supabase = createClient();
  return supabase
    .from("infestation_hotspots")
    .select("*, farms(name), greenhouses(name), users:reported_by(full_name)")
    .eq("id", id)
    .single();
}

export async function listActiveHotspotsForGreenhouse(greenhouseId: string) {
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
  const supabase = createClient();
  return supabase.from("infestation_hotspots").update({ status }).eq("id", id);
}

export async function getHotspotKpis() {
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
