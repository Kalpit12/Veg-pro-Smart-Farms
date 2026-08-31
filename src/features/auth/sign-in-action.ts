"use server";

import { createClient } from "@/lib/supabase/server";
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

export async function signInWithPasswordAction(
  email: string,
  password: string,
): Promise<SignInResult> {
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
  const supabase = await createClient();
  await supabase.auth.signOut();
}
