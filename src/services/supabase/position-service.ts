import { routeDataThroughMssql } from "@/lib/mssql/client-routing";
import { createClient } from "@/lib/supabase/client";
import * as mssql from "@/services/mssql/ops-actions";

export async function getWorkerPosition(workerId: string) {
  if (routeDataThroughMssql()) {
    const { data } = await mssql.mssqlListWorkerPositionsAction();
    const row = (data ?? []).find((p) => p.worker_id === workerId);
    return { data: row ?? null, error: null };
  }
  const supabase = createClient();
  return supabase
    .from("worker_positions")
    .select("latitude, longitude, updated_at")
    .eq("worker_id", workerId)
    .maybeSingle();
}

export async function upsertWorkerPosition(
  workerId: string,
  latitude: number,
  longitude: number,
) {
  if (routeDataThroughMssql()) {
    return mssql.mssqlUpsertWorkerPositionAction(workerId, latitude, longitude);
  }
  const supabase = createClient();
  return supabase
    .from("worker_positions")
    .upsert({
      worker_id: workerId,
      latitude,
      longitude,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
}

export async function listWorkerPositions() {
  if (routeDataThroughMssql()) return mssql.mssqlListWorkerPositionsAction();
  const supabase = createClient();
  return supabase
    .from("worker_positions")
    .select("*, users!inner(full_name, role)")
    .eq("users.role", "worker")
    .order("updated_at", { ascending: false });
}

export async function getWorkersInFieldCount() {
  if (routeDataThroughMssql()) {
    const res = await mssql.mssqlGetWorkersInFieldCountAction();
    return { count: res.data?.count ?? 0, error: res.error };
  }
  const supabase = createClient();
  const since = new Date(Date.now() - 1000 * 60 * 30).toISOString();
  return supabase
    .from("worker_positions")
    .select("worker_id", { count: "exact", head: true })
    .gte("updated_at", since);
}
