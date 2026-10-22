"use server";

import { getServerDataBackend } from "@/lib/data-backend";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv, hasSupabaseServiceRole } from "@/lib/supabase/config";
import { mssqlUpdateStaffAccountAction } from "@/services/mssql/ops-actions";

export type UpdateStaffAccountInput = {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  password?: string;
};

export type UpdateStaffAccountResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateStaffAccountAction(
  input: UpdateStaffAccountInput,
): Promise<UpdateStaffAccountResult> {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const password = input.password?.trim();

  if (fullName.length < 2) return { ok: false, error: "Enter the person’s full name." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (password && password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  if (getServerDataBackend() === "mssql") {
    const res = await mssqlUpdateStaffAccountAction({
      userId: input.userId,
      fullName,
      email,
      phone,
      password: password || undefined,
    });
    if (res.error) return { ok: false, error: res.error.message };
    return { ok: true };
  }

  if (!hasSupabaseEnv() || !hasSupabaseServiceRole()) {
    return { ok: false, error: "Database is not configured on this server." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in as an admin to edit accounts." };

  const { data: actor } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (actor?.role !== "admin") {
    return { ok: false, error: "Only admins can edit staff accounts." };
  }

  const admin = createServiceRoleClient();
  const { error: profileError } = await admin
    .from("users")
    .update({ full_name: fullName, email, phone: phone || null })
    .eq("id", input.userId);
  if (profileError) return { ok: false, error: profileError.message };

  if (password) {
    const { error: authError } = await admin.auth.admin.updateUserById(input.userId, {
      password,
      email,
    });
    if (authError) return { ok: false, error: authError.message };
  } else {
    const { error: authError } = await admin.auth.admin.updateUserById(input.userId, { email });
    if (authError) return { ok: false, error: authError.message };
  }

  return { ok: true };
}
