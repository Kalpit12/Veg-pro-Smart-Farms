import { routeDataThroughMssql } from "@/lib/mssql/client-routing";
import { createClient } from "@/lib/supabase/client";
import * as mssql from "@/services/mssql/ops-actions";

export async function createAlert(type: string, message: string) {
  if (routeDataThroughMssql()) return mssql.mssqlCreateAlertAction(type, message);
  const supabase = createClient();
  return supabase.from("alerts").insert({
    type,
    message,
    status: "open",
  });
}

export async function listOpenAlerts(limit = 5) {
  if (routeDataThroughMssql()) return mssql.mssqlListOpenAlertsAction(limit);
  const supabase = createClient();
  return supabase
    .from("alerts")
    .select("id, type, message, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(limit);
}
