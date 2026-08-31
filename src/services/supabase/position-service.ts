import { createClient } from "@/lib/supabase/client";

export async function getWorkerPosition(workerId: string) {
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
  const supabase = createClient();
  return supabase
    .from("worker_positions")
    .select("*, users!inner(full_name, role)")
    .eq("users.role", "worker")
    .order("updated_at", { ascending: false });
}

export async function getWorkersInFieldCount() {
  const supabase = createClient();
  const since = new Date(Date.now() - 1000 * 60 * 30).toISOString();
  return supabase
    .from("worker_positions")
    .select("worker_id", { count: "exact", head: true })
    .gte("updated_at", since);
}
