import { hasMssqlEnv } from "@/lib/data-backend";

/** True when the browser should call server actions instead of Supabase client. */
export function routeDataThroughMssql() {
  return hasMssqlEnv();
}
