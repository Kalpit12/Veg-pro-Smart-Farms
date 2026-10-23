import { getServerDataBackend } from "@/lib/data-backend";
import { kenyaNowIso } from "@/lib/kenya-time";
import { parseChemicalsCsv, type ImportChemicalsResult } from "@/lib/chemicals-csv";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv, hasSupabaseServiceRole } from "@/lib/supabase/config";
import * as mssql from "@/services/mssql/chemical-queries";

export type { ChemicalRow } from "@/services/mssql/chemical-queries";

async function assertAdminSupabase() {
  if (!hasSupabaseEnv()) throw new Error("Database is not configured.");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in as an admin.");
  const { data: actor } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (actor?.role !== "admin") throw new Error("Only admins can manage chemicals.");
}

function adminClient() {
  if (!hasSupabaseServiceRole()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for chemical management.");
  }
  return createServiceRoleClient();
}

export async function listChemicalProducts() {
  if (getServerDataBackend() === "mssql") return mssql.mssqlListChemicals();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chemicals")
    .select("id, name, active_ingredient, is_active, created_at, updated_at")
    .eq("is_active", true)
    .order("name");
  if (error) return { data: null, error: { message: error.message } };
  return { data, error: null };
}

export async function listAdminChemicals() {
  if (getServerDataBackend() === "mssql") return mssql.mssqlListAdminChemicals();
  await assertAdminSupabase();
  const admin = adminClient();
  const { data, error } = await admin
    .from("chemicals")
    .select("id, name, active_ingredient, is_active, created_at, updated_at")
    .order("name");
  if (error) return { data: null, error: { message: error.message } };
  return { data, error: null };
}

export async function upsertChemical(input: { name: string; active_ingredient?: string }) {
  if (getServerDataBackend() === "mssql") {
    return mssql.mssqlUpsertChemical(input);
  }
  await assertAdminSupabase();
  const admin = adminClient();
  const name = input.name.trim();
  const { data: existing } = await admin
    .from("chemicals")
    .select("id")
    .ilike("name", name)
    .maybeSingle();

  const payload = {
    name,
    active_ingredient: input.active_ingredient?.trim() || null,
    is_active: true,
    updated_at: kenyaNowIso(),
  };

  if (existing?.id) {
    const { error } = await admin.from("chemicals").update(payload).eq("id", existing.id);
    if (error) return { data: null, error: { message: error.message } };
    return { data: { id: existing.id as string, updated: true }, error: null };
  }

  const { data, error } = await admin.from("chemicals").insert(payload).select("id").single();
  if (error) return { data: null, error: { message: error.message } };
  return { data: { id: data.id as string, updated: false }, error: null };
}

export async function importChemicalsCsv(csvText: string): Promise<ImportChemicalsResult> {
  const { rows, errors: parseErrors } = parseChemicalsCsv(csvText);
  if (getServerDataBackend() === "mssql") {
    const res = await mssql.mssqlImportChemicalsRows(rows);
    if (res.error) {
      return { added: 0, updated: 0, skipped: rows.length, errors: [res.error.message, ...parseErrors] };
    }
    return { ...res.data!, errors: parseErrors };
  }

  await assertAdminSupabase();
  let added = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [...parseErrors];

  for (const row of rows) {
    const res = await upsertChemical(row);
    if (res.error) {
      skipped++;
      errors.push(`${row.name}: ${res.error.message}`);
      continue;
    }
    if (res.data?.updated) updated++;
    else added++;
  }

  return { added, updated, skipped, errors };
}

export async function deactivateChemical(id: string) {
  if (getServerDataBackend() === "mssql") return mssql.mssqlDeactivateChemical(id);
  await assertAdminSupabase();
  const admin = adminClient();
  const { error } = await admin
    .from("chemicals")
    .update({ is_active: false, updated_at: kenyaNowIso() })
    .eq("id", id);
  if (error) return { data: null, error: { message: error.message } };
  return { data: true, error: null };
}
