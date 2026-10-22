import { getServerDataBackend } from "@/lib/data-backend";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv, hasSupabaseServiceRole } from "@/lib/supabase/config";
import {
  parseOptionalInt,
  parseOptionalNumber,
  parseSitesCsv,
  type SitesCsvRow,
} from "@/lib/sites-csv";
import * as mssql from "@/services/mssql/farm-admin-queries";
import type { AdminFarmRow, AdminGreenhouseRow } from "@/services/mssql/farm-admin-queries";

export type { AdminFarmRow, AdminGreenhouseRow };

async function assertAdminSupabase() {
  if (!hasSupabaseEnv()) throw new Error("Database is not configured.");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in as an admin.");
  const { data: actor } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (actor?.role !== "admin") throw new Error("Only admins can manage farms and greenhouses.");
}

function adminClient() {
  if (!hasSupabaseServiceRole()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for site management.");
  }
  return createServiceRoleClient();
}

function computeAreaHa(area_sqm: number | null, area_ha: number | null) {
  if (area_ha != null) return area_ha;
  if (area_sqm != null) return Math.round((area_sqm / 10000) * 10000) / 10000;
  return null;
}

export async function listAdminFarms() {
  if (getServerDataBackend() === "mssql") return mssql.mssqlListAdminFarms();
  await assertAdminSupabase();
  const admin = adminClient();
  const { data: farms, error } = await admin.from("farms").select("id, name, location, type, created_at").order("name");
  if (error) return { data: null, error: { message: error.message } };
  const withCounts: AdminFarmRow[] = await Promise.all(
    (farms ?? []).map(async (f) => {
      const { count } = await admin
        .from("greenhouses")
        .select("id", { count: "exact", head: true })
        .eq("farm_id", f.id);
      return {
        id: f.id as string,
        name: f.name as string,
        location: f.location as string,
        type: f.type as string,
        created_at: f.created_at as string,
        greenhouse_count: count ?? 0,
      };
    }),
  );
  return { data: withCounts, error: null };
}

export async function listAdminGreenhouses(farmId?: string) {
  if (getServerDataBackend() === "mssql") return mssql.mssqlListAdminGreenhouses(farmId);
  await assertAdminSupabase();
  const admin = adminClient();
  let query = admin
    .from("greenhouses")
    .select(
      "id, farm_id, name, crop_type, latitude, longitude, area_sqm, area_ha, bay_count, column_count, created_at, farms(name)",
    )
    .order("name");
  if (farmId) query = query.eq("farm_id", farmId);
  const { data, error } = await query;
  if (error) return { data: null, error: { message: error.message } };
  const rows: AdminGreenhouseRow[] = (data ?? []).map((g) => ({
    id: g.id as string,
    farm_id: g.farm_id as string,
    farm_name: (g.farms as { name?: string } | null)?.name ?? "Farm",
    name: g.name as string,
    crop_type: g.crop_type as string,
    latitude: g.latitude as number | null,
    longitude: g.longitude as number | null,
    area_sqm: g.area_sqm as number | null,
    area_ha: g.area_ha as number | null,
    bay_count: g.bay_count as number | null,
    column_count: g.column_count as number | null,
    created_at: g.created_at as string,
  }));
  return { data: rows, error: null };
}

export async function createFarm(input: { name: string; location: string; type: string }) {
  if (getServerDataBackend() === "mssql") {
    return mssql.mssqlCreateFarm(input);
  }
  await assertAdminSupabase();
  const admin = adminClient();
  const { data, error } = await admin
    .from("farms")
    .insert({ name: input.name, location: input.location, type: input.type })
    .select("id")
    .single();
  if (error) return { data: null, error: { message: error.message } };
  return { data: { id: data.id as string }, error: null };
}

export async function updateFarm(
  id: string,
  input: { name: string; location: string; type: string },
) {
  if (getServerDataBackend() === "mssql") {
    const res = await mssql.mssqlUpdateFarm(id, input);
    if (res.error) return { error: res.error };
    return { error: null };
  }
  await assertAdminSupabase();
  const admin = adminClient();
  const { error } = await admin.from("farms").update(input).eq("id", id);
  if (error) return { error: { message: error.message } };
  return { error: null };
}

export async function upsertGreenhouse(input: {
  id?: string;
  farm_id: string;
  name: string;
  crop_type: string;
  latitude?: number | null;
  longitude?: number | null;
  area_sqm?: number | null;
  area_ha?: number | null;
  bay_count?: number | null;
  column_count?: number | null;
}) {
  const area_ha = computeAreaHa(input.area_sqm ?? null, input.area_ha ?? null);
  const payload = { ...input, area_ha };

  if (getServerDataBackend() === "mssql") {
    return mssql.mssqlUpsertGreenhouse(payload);
  }
  await assertAdminSupabase();
  const admin = adminClient();
  if (input.id) {
    const { error } = await admin
      .from("greenhouses")
      .update({
        farm_id: input.farm_id,
        name: input.name,
        crop_type: input.crop_type,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        area_sqm: input.area_sqm ?? null,
        area_ha,
        bay_count: input.bay_count ?? null,
        column_count: input.column_count ?? null,
      })
      .eq("id", input.id);
    if (error) return { data: null, error: { message: error.message } };
    return { data: { id: input.id }, error: null };
  }
  const { data, error } = await admin
    .from("greenhouses")
    .insert({
      farm_id: input.farm_id,
      name: input.name,
      crop_type: input.crop_type,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      area_sqm: input.area_sqm ?? null,
      area_ha,
      bay_count: input.bay_count ?? null,
      column_count: input.column_count ?? null,
    })
    .select("id")
    .single();
  if (error) return { data: null, error: { message: error.message } };
  return { data: { id: data.id as string }, error: null };
}

async function resolveFarmIdByName(farmName: string): Promise<string | null> {
  if (getServerDataBackend() === "mssql") {
    return mssql.mssqlFindFarmIdByName(farmName);
  }
  const admin = adminClient();
  const { data } = await admin.from("farms").select("id").eq("name", farmName.trim()).maybeSingle();
  return data?.id ?? null;
}

export type ImportSitesResult = {
  farmsCreated: number;
  greenhousesCreated: number;
  greenhousesUpdated: number;
  errors: string[];
};

async function importFarmRow(row: SitesCsvRow, line: number, result: ImportSitesResult) {
  const name = row.farm_name?.trim();
  if (!name) {
    result.errors.push(`Row ${line}: farm row needs farm_name.`);
    return;
  }
  const location = row.farm_location?.trim() || "—";
  const type = row.farm_type?.trim() || "Greenhouse";
  const existing = await resolveFarmIdByName(name);
  if (existing) return;
  const created = await createFarm({ name, location, type });
  if (created.error) {
    result.errors.push(`Row ${line}: ${created.error.message}`);
    return;
  }
  result.farmsCreated++;
}

async function importGreenhouseRow(row: SitesCsvRow, line: number, result: ImportSitesResult) {
  const farmName = row.farm_name?.trim();
  const ghName = row.greenhouse_name?.trim();
  if (!farmName || !ghName) {
    result.errors.push(`Row ${line}: greenhouse row needs farm_name and greenhouse_name.`);
    return;
  }
  let farmId = await resolveFarmIdByName(farmName);
  if (!farmId) {
    const created = await createFarm({
      name: farmName,
      location: row.farm_location?.trim() || "—",
      type: row.farm_type?.trim() || "Greenhouse",
    });
    if (created.error || !created.data) {
      result.errors.push(`Row ${line}: ${created.error?.message ?? "Could not create farm."}`);
      return;
    }
    farmId = created.data.id;
    result.farmsCreated++;
  }
  const crop = row.crop_type?.trim() || "Mixed";
  const payload = {
    id: row.greenhouse_id?.trim() || undefined,
    farm_id: farmId,
    name: ghName,
    crop_type: crop,
    latitude: parseOptionalNumber(row.latitude),
    longitude: parseOptionalNumber(row.longitude),
    area_sqm: parseOptionalNumber(row.area_sqm),
    area_ha: parseOptionalNumber(row.area_ha),
    bay_count: parseOptionalInt(row.bay_count),
    column_count: parseOptionalInt(row.column_count),
  };
  const res = await upsertGreenhouse(payload);
  if (res.error) {
    result.errors.push(`Row ${line}: ${res.error.message}`);
    return;
  }
  if (payload.id) result.greenhousesUpdated++;
  else result.greenhousesCreated++;
}

export async function importSitesCsv(csvText: string): Promise<ImportSitesResult> {
  if (getServerDataBackend() === "demo") {
    return {
      farmsCreated: 0,
      greenhousesCreated: 0,
      greenhousesUpdated: 0,
      errors: ["Database is not configured."],
    };
  }
  if (getServerDataBackend() !== "mssql") {
    await assertAdminSupabase();
  } else {
    await mssql.mssqlListAdminFarms().then((r) => {
      if (r.error) throw new Error(r.error.message);
    });
  }

  const { rows, errors: parseErrors } = parseSitesCsv(csvText);
  const result: ImportSitesResult = {
    farmsCreated: 0,
    greenhousesCreated: 0,
    greenhousesUpdated: 0,
    errors: [...parseErrors],
  };
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const line = i + 2;
    const kind = (row.record_type ?? "").trim().toLowerCase();
    if (kind === "farm") {
      await importFarmRow(row, line, result);
    } else if (kind === "greenhouse") {
      await importGreenhouseRow(row, line, result);
    } else {
      result.errors.push(`Row ${line}: record_type must be farm or greenhouse.`);
    }
  }
  return result;
}
