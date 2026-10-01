import { getMssqlConfig } from "@/lib/mssql/config";
import { getSupabaseAnonKey } from "@/lib/supabase/config";

/** Browser: Supabase or VegPro MS SQL (not offline demo). */
export function hasMssqlEnv() {
  return process.env.NEXT_PUBLIC_DATA_BACKEND === "mssql";
}

export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabaseAnonKey());
}

export function hasConfiguredBackend() {
  return hasSupabaseEnv() || hasMssqlEnv();
}

export function isOfflineDemo() {
  return !hasConfiguredBackend();
}

export type ServerDataBackend = "mssql" | "supabase" | "demo";

export function getServerDataBackend(): ServerDataBackend {
  if (process.env.DATA_BACKEND === "mssql" && getMssqlConfig()) return "mssql";
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    getSupabaseAnonKey()
  ) {
    return "supabase";
  }
  return "demo";
}
