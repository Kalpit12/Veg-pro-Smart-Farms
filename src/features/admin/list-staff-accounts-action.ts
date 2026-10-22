"use server";

import { getServerDataBackend } from "@/lib/data-backend";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv, hasSupabaseServiceRole } from "@/lib/supabase/config";
import { mssqlListStaffAccountsAction } from "@/services/mssql/ops-actions";
import type { StaffAccountRow } from "@/services/supabase/staff-service";

type ListStaffResult = {
  data: StaffAccountRow[] | null;
  error: { message: string } | null;
};

function mapStaffRows(
  rows: Record<string, unknown>[] | null | undefined,
): StaffAccountRow[] {
  return (rows ?? []).map((row) => ({
    id: row.id as string,
    full_name: row.full_name as string,
    email: row.email as string,
    phone: (row.phone as string | null) ?? null,
    role: row.role as StaffAccountRow["role"],
    is_active: row.is_active === false ? false : true,
    created_at: row.created_at as string,
  }));
}

async function listStaffFromSupabaseServer(): Promise<ListStaffResult> {
  if (!hasSupabaseEnv()) {
    return { data: [], error: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: { message: "Sign in as an admin to view staff." } };
  }

  const { data: actor, error: actorError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (actorError) {
    return { data: null, error: { message: actorError.message } };
  }
  if (actor?.role !== "admin" && actor?.role !== "supervisor") {
    return { data: null, error: { message: "Not allowed to view the staff directory." } };
  }

  const selectWithActive =
    "id, full_name, email, phone, role, is_active, created_at";

  if (hasSupabaseServiceRole()) {
    try {
      const admin = createServiceRoleClient();
      let { data, error } = await admin
        .from("users")
        .select(selectWithActive)
        .order("created_at", { ascending: false });

      if (error && /is_active/i.test(error.message)) {
        const fallback = await admin
          .from("users")
          .select("id, full_name, email, phone, role, created_at")
          .order("created_at", { ascending: false });
        data = fallback.data?.map((row) => ({ ...row, is_active: true })) ?? null;
        error = fallback.error;
      }

      if (error) return { data: null, error: { message: error.message } };
      return { data: mapStaffRows(data as Record<string, unknown>[]), error: null };
    } catch (e) {
      return {
        data: null,
        error: { message: e instanceof Error ? e.message : "Could not load staff." },
      };
    }
  }

  let { data, error } = await supabase
    .from("users")
    .select(selectWithActive)
    .order("created_at", { ascending: false });

  if (error && /is_active/i.test(error.message)) {
    const fallback = await supabase
      .from("users")
      .select("id, full_name, email, phone, role, created_at")
      .order("created_at", { ascending: false });
    data = fallback.data?.map((row) => ({ ...row, is_active: true })) ?? null;
    error = fallback.error;
  }

  if (error) return { data: null, error: { message: error.message } };
  return { data: mapStaffRows(data as Record<string, unknown>[]), error: null };
}

/** Loads every staff profile for the admin workforce directory (server-side). */
export async function listStaffAccountsAction(): Promise<ListStaffResult> {
  const backend = getServerDataBackend();
  if (backend === "mssql") {
    const res = await mssqlListStaffAccountsAction();
    if (res.error) return { data: null, error: res.error };
    return { data: (res.data ?? []) as StaffAccountRow[], error: null };
  }
  if (backend === "demo") {
    return { data: [], error: null };
  }
  return listStaffFromSupabaseServer();
}
