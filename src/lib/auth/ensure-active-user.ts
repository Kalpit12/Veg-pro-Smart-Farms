import { redirect } from "next/navigation";

import { getServerDataBackend } from "@/lib/data-backend";
import { clearSessionCookie, getSessionFromCookies } from "@/lib/auth/session";
import { isMssqlUserActive } from "@/lib/auth/mssql-credentials";

/** Ends MSSQL sessions for deactivated accounts (Supabase handled in middleware). */
export async function redirectIfInactiveUser() {
  if (getServerDataBackend() !== "mssql") return;

  const session = await getSessionFromCookies();
  if (!session) return;

  let active = true;
  try {
    active = await isMssqlUserActive(session.sub);
  } catch {
    return;
  }
  if (active) return;

  await clearSessionCookie();
  redirect("/auth/login?inactive=1");
}
