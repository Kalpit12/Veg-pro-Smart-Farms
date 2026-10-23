import { getMssqlConfig } from "@/lib/mssql/config";
import { getSupabaseAnonKey } from "@/lib/supabase/config";

function clientRuntimeBackend(): ServerDataBackend | null {
  if (typeof window === "undefined") return null;
  const runtime = window.__VEGPRO_DATA_BACKEND__;
  if (runtime === "mssql" || runtime === "supabase" || runtime === "demo") {
    return runtime;
  }
  return null;
}

/** Browser: Supabase or VegPro MS SQL (not offline demo). */
export function hasMssqlEnv() {
  if (process.env.NEXT_PUBLIC_DATA_BACKEND === "mssql") return true;
  return clientRuntimeBackend() === "mssql";
}

export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabaseAnonKey());
}

export function hasConfiguredBackend() {
  if (hasSupabaseEnv() || hasMssqlEnv()) return true;
  const runtime = clientRuntimeBackend();
  return runtime === "mssql" || runtime === "supabase";
}

declare global {
  interface Window {
    /** Set after /api/app/config when server uses MSSQL/Supabase. */
    __VEGPRO_FORCE_PRODUCTION__?: boolean;
    /** Server data backend when NEXT_PUBLIC_* was not set at build time. */
    __VEGPRO_DATA_BACKEND__?: ServerDataBackend;
  }
}

export function isOfflineDemo() {
  if (hasConfiguredBackend()) return false;
  if (typeof window !== "undefined" && window.__VEGPRO_FORCE_PRODUCTION__) return false;
  return true;
}

/** Use real DB APIs (MSSQL or Supabase), not in-browser demo stores. */
export function usesProductionData() {
  return hasConfiguredBackend();
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
