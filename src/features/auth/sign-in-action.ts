"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerDataBackend } from "@/lib/data-backend";
import { findUserByEmail, verifyMssqlPassword } from "@/lib/auth/mssql-credentials";
import {
  clearSessionCookie,
  getSessionFromCookies,
  setSessionCookie,
} from "@/lib/auth/session";
import type { Role } from "@/types/db";

export type SignInResult =
  | { ok: true; role: Role }
  | { ok: false; error: string };

function networkErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  if (/fetch|network|ECONN|ENOTFOUND|ETIMEDOUT|socket/i.test(raw)) {
    return "Cannot reach Supabase Auth from this machine. Check VPN, firewall, or antivirus HTTPS scanning, then try again.";
  }
  return raw || "Sign in failed.";
}

export async function getSessionAction(): Promise<{
  id: string;
  role: Role;
  email: string;
} | null> {
  const session = await getSessionFromCookies();
  if (!session) return null;
  return { id: session.sub, role: session.role, email: session.email };
}

export async function signInWithPasswordAction(
  email: string,
  password: string,
): Promise<SignInResult> {
  const backend = getServerDataBackend();

  if (backend === "mssql") {
    try {
      const user = await findUserByEmail(email);
      if (!user) {
        return { ok: false, error: "Invalid email or password." };
      }
      const valid = await verifyMssqlPassword(user, password);
      if (!valid) {
        return { ok: false, error: "Invalid email or password." };
      }
      await setSessionCookie({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      return { ok: true, role: user.role };
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error);
      if (/MSSQL|SESSION_SECRET|ECONN|ETIMEOUT|login failed/i.test(raw)) {
        return {
          ok: false,
          error:
            "Cannot reach the VegPro database. Check VPN, MSSQL_* env vars, and that 001_schema.sql was applied.",
        };
      }
      return { ok: false, error: raw || "Sign in failed." };
    }
  }

  if (backend === "demo") {
    return { ok: false, error: "Database is not configured." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Signed in, but no user session was created." };

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    return { ok: true, role: (profile?.role ?? "worker") as Role };
  } catch (error) {
    return { ok: false, error: networkErrorMessage(error) };
  }
}

export async function signOutAction() {
  const backend = getServerDataBackend();
  if (backend === "mssql") {
    await clearSessionCookie();
    return;
  }
  if (backend === "supabase") {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
}
