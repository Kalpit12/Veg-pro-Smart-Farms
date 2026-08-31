import { createClient } from "@/lib/supabase/client";

export async function submitActivity(payload: {
  worker_id: string;
  farm_id: string;
  greenhouse_id?: string | null;
  activity_type: string;
  notes?: string | null;
  image_url?: string | null;
  gps_location?: string | null;
}) {
  const supabase = createClient();
  return supabase.from("activities").insert(payload);
}

export async function listRecentActivities(limit = 10) {
  const supabase = createClient();
  return supabase
    .from("activities")
    .select(
      "id, activity_type, status, created_at, notes, image_url, gps_location, users(full_name), farms(name), greenhouses(name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function listActivities(params: {
  q?: string;
  status?: "pending" | "approved" | "rejected";
  limit?: number;
}) {
  const supabase = createClient();
  let query = supabase
    .from("activities")
    .select(
      "id, activity_type, status, created_at, notes, image_url, gps_location, users(full_name), farms(name), greenhouses(name)",
    )
    .order("created_at", { ascending: false });

  if (params.status) query = query.eq("status", params.status);
  if (params.q) query = query.ilike("activity_type", `%${params.q}%`);
  if (params.limit) query = query.limit(params.limit);

  return query;
}

export async function setActivityStatus(id: string, status: "approved" | "rejected") {
  const supabase = createClient();
  return supabase.from("activities").update({ status }).eq("id", id);
}

export async function listActivitiesForWorker(workerId: string, limit = 6) {
  const supabase = createClient();
  return supabase
    .from("activities")
    .select("id, activity_type, status, created_at, farms(name), greenhouses(name)")
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function getLatestActivityForWorker(workerId: string) {
  const supabase = createClient();
  return supabase
    .from("activities")
    .select("id, activity_type, gps_location, created_at, status, farms(name), greenhouses(name)")
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}
