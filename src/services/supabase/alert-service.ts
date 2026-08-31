import { createClient } from "@/lib/supabase/client";

export async function createAlert(type: string, message: string) {
  const supabase = createClient();
  return supabase.from("alerts").insert({
    type,
    message,
    status: "open",
  });
}

export async function listOpenAlerts(limit = 5) {
  const supabase = createClient();
  return supabase
    .from("alerts")
    .select("id, type, message, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(limit);
}

