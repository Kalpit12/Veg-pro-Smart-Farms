import { routeDataThroughMssql } from "@/lib/mssql/client-routing";
import { createClient } from "@/lib/supabase/client";
import * as mssql from "@/services/mssql/ops-actions";

export type LogSprayInput = {
  worker_id: string;
  hotspot_id: string | null;
  farm_id: string;
  greenhouse_id: string | null;
  latitude: number;
  longitude: number;
  product_name: string;
  notes?: string | null;
  image_url?: string | null;
  severity_before?: number | null;
  severity_after?: number | null;
};

export async function logSpray(input: LogSprayInput) {
  if (routeDataThroughMssql()) return mssql.mssqlLogSprayAction(input);
  const supabase = createClient();
  return supabase.from("spray_treatments").insert(input).select().single();
}

export async function listSpraysForHotspot(hotspotId: string) {
  if (routeDataThroughMssql()) {
    const all = await mssql.mssqlListSpraysAction(500);
    return {
      data: (all.data ?? []).filter((s) => String(s.hotspot_id) === hotspotId),
      error: all.error,
    };
  }
  const supabase = createClient();
  return supabase
    .from("spray_treatments")
    .select("id, latitude, longitude, product_name, created_at, users:worker_id(full_name)")
    .eq("hotspot_id", hotspotId)
    .order("created_at", { ascending: true });
}

export async function listSprays(limit = 200) {
  if (routeDataThroughMssql()) return mssql.mssqlListSpraysAction(limit);
  const supabase = createClient();
  return supabase
    .from("spray_treatments")
    .select(
      "*, farms(name), greenhouses(name), users:worker_id(full_name), infestation_hotspots(pest_type, main_issue, severity, status, latitude, longitude, farm_id, greenhouse_id, farms(name), greenhouses(name))",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function listSpraysForHistory(options?: {
  greenhouseId?: string;
  since?: Date;
  limit?: number;
}) {
  if (routeDataThroughMssql()) {
    const { data, error } = await mssql.mssqlListSpraysAction(options?.limit ?? 500);
    let rows = data ?? [];
    if (options?.since) {
      const t = options.since.getTime();
      rows = rows.filter((r) => new Date(r.created_at as string).getTime() >= t);
    }
    if (options?.greenhouseId) {
      rows = rows.filter((r) => String(r.greenhouse_id) === options.greenhouseId);
    }
    return { data: rows, error };
  }
  const supabase = createClient();
  let query = supabase
    .from("spray_treatments")
    .select(
      "*, farms(name), greenhouses(name), users:worker_id(full_name), infestation_hotspots(pest_type, main_issue, severity, status, latitude, longitude, farm_id, greenhouse_id, farms(name), greenhouses(name))",
    )
    .order("created_at", { ascending: false });

  if (options?.since) {
    query = query.gte("created_at", options.since.toISOString());
  }
  if (options?.greenhouseId) {
    query = query.eq("greenhouse_id", options.greenhouseId);
  }

  return query.limit(options?.limit ?? 500);
}

export async function getSpraysTodayCount() {
  if (routeDataThroughMssql()) {
    const res = await mssql.mssqlGetSpraysTodayCountAction();
    return { count: res.data?.count ?? 0, error: res.error };
  }
  const supabase = createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return supabase
    .from("spray_treatments")
    .select("id", { count: "exact", head: true })
    .gte("created_at", today.toISOString());
}

export async function listSpraysForWorker(workerId: string, limit = 10) {
  if (routeDataThroughMssql()) {
    const { data, error } = await mssql.mssqlListSpraysAction(limit * 5);
    return {
      data: (data ?? [])
        .filter((s) => String(s.worker_id) === workerId)
        .slice(0, limit),
      error,
    };
  }
  const supabase = createClient();
  return supabase
    .from("spray_treatments")
    .select("id, product_name, created_at, farms(name), greenhouses(name)")
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false })
    .limit(limit);
}
