"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv, hasSupabaseServiceRole } from "@/lib/supabase/config";
import type { Role } from "@/types/db";

export type StaffAccountRole = Extract<Role, "worker" | "supervisor">;

export type CreateStaffAccountInput = {
  fullName: string;
  email: string;
  phone: string;
  role: StaffAccountRole;
  password: string;
};

export type CreateStaffAccountResult =
  | { ok: true; email: string; role: StaffAccountRole; fullName: string }
  | { ok: false; error: string };

export type StaffProvisioningStatus = {
  canCreate: boolean;
  message: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function getStaffProvisioningStatus(): Promise<StaffProvisioningStatus> {
  if (!hasSupabaseEnv()) {
    return {
      canCreate: false,
      message: "Supabase is not configured. Accounts cannot be created in demo mode.",
    };
  }
  if (!hasSupabaseServiceRole()) {
    return {
      canCreate: false,
      message:
        "Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase → Project Settings → API). Restart the server. Do not use NEXT_PUBLIC_ for this key.",
    };
  }
  return { canCreate: true, message: null };
}

export async function createStaffAccountAction(
  input: CreateStaffAccountInput,
): Promise<CreateStaffAccountResult> {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const password = input.password;
  const role = input.role;

  if (fullName.length < 2) return { ok: false, error: "Enter the person’s full name." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (role !== "worker" && role !== "supervisor") {
    return { ok: false, error: "Role must be field worker or farm manager." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Supabase is not configured on this server." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in as an admin to create accounts." };

  const { data: actor } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (actor?.role !== "admin") {
    return { ok: false, error: "Only admins can create worker and manager accounts." };
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

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { role },
  });

  if (authError || !created.user) {
    const msg = authError?.message ?? "Could not create the login.";
    if (/already been registered|already exists/i.test(msg)) {
      return { ok: false, error: "That email already has an account." };
    }
    return { ok: false, error: msg };
  }

  const { error: profileError } = await admin.from("users").insert({
    id: created.user.id,
    full_name: fullName,
    email,
    phone: phone || null,
    role,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    if (/duplicate|unique/i.test(profileError.message)) {
      return { ok: false, error: "That email is already on the staff list." };
    }
    return { ok: false, error: profileError.message };
  }

  return { ok: true, email, role, fullName };
}
