"use server";

import { getServerDataBackend } from "@/lib/data-backend";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv, hasSupabaseServiceRole } from "@/lib/supabase/config";
import { requireServerSession } from "@/lib/mssql/session-server";
import { mssqlSetStaffAccountActiveAction } from "@/services/mssql/ops-actions";

export type SetStaffActiveResult = { ok: true } | { ok: false; error: string };

export async function setStaffAccountActiveAction(
  userId: string,
  isActive: boolean,
): Promise<SetStaffActiveResult> {
  const trimmedId = userId.trim();
  if (!trimmedId) return { ok: false, error: "Missing user id." };

  if (getServerDataBackend() === "mssql") {
    const res = await mssqlSetStaffAccountActiveAction(trimmedId, isActive);
    if (res.error) return { ok: false, error: res.error.message };
    return { ok: true };
  }

  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Database is not configured on this server." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in as an admin to change account status." };

  const { data: actor } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (actor?.role !== "admin") {
    return { ok: false, error: "Only admins can activate or deactivate staff accounts." };
  }

  if (user.id === trimmedId && !isActive) {
    return { ok: false, error: "You cannot deactivate your own account." };
  }

  if (!hasSupabaseServiceRole()) {
    return {
      ok: false,
      error:
        "Server is missing SUPABASE_SERVICE_ROLE_KEY. Add the secret key from Supabase → API, then restart.",
    };
  }

  let admin;
  try {
    admin = createServiceRoleClient();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Admin API is not configured." };
  }

  const { error: profileError } = await admin
    .from("users")
    .update({ is_active: isActive })
    .eq("id", trimmedId);

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  const { error: authError } = await admin.auth.admin.updateUserById(trimmedId, {
    ban_duration: isActive ? "none" : "876000h",
  });

  if (authError) {
    return {
      ok: false,
      error: `Profile updated but login block failed: ${authError.message}`,
    };
  }

  return { ok: true };
}
