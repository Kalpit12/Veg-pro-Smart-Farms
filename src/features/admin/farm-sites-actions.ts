"use server";

import {
  createFarm,
  importSitesCsv,
  listAdminFarms,
  listAdminGreenhouses,
  updateFarm,
  upsertGreenhouse,
  type AdminFarmRow,
  type AdminGreenhouseRow,
  type ImportSitesResult,
} from "@/services/farm-greenhouse-admin-service";

export type { AdminFarmRow, AdminGreenhouseRow, ImportSitesResult };

export async function listAdminFarmsAction() {
  return listAdminFarms();
}

export async function listAdminGreenhousesAction(farmId?: string) {
  return listAdminGreenhouses(farmId);
}

export async function createFarmAction(input: {
  name: string;
  location: string;
  type: string;
}) {
  const name = input.name.trim();
  const location = input.location.trim();
  const type = input.type.trim();
  if (name.length < 2) return { ok: false as const, error: "Enter a farm name." };
  if (!location) return { ok: false as const, error: "Enter a location." };
  if (!type) return { ok: false as const, error: "Enter a farm type." };
  const res = await createFarm({ name, location, type });
  if (res.error) return { ok: false as const, error: res.error.message };
  return { ok: true as const };
}

export async function updateFarmAction(
  id: string,
  input: { name: string; location: string; type: string },
) {
  const res = await updateFarm(id, {
    name: input.name.trim(),
    location: input.location.trim(),
    type: input.type.trim(),
  });
  if (res.error) return { ok: false as const, error: res.error.message };
  return { ok: true as const };
}

export async function saveGreenhouseAction(input: {
  id?: string;
  farm_id: string;
  name: string;
  crop_type: string;
  latitude: string;
  longitude: string;
  area_sqm: string;
  area_ha: string;
  bay_count: string;
  column_count: string;
}) {
  const name = input.name.trim();
  const crop_type = input.crop_type.trim();
  if (!input.farm_id) return { ok: false as const, error: "Select a farm." };
  if (name.length < 1) return { ok: false as const, error: "Enter a greenhouse name." };
  if (!crop_type) return { ok: false as const, error: "Select a variety." };

  const num = (s: string) => (s.trim() ? Number(s) : null);
  const res = await upsertGreenhouse({
    id: input.id,
    farm_id: input.farm_id,
    name,
    crop_type,
    latitude: num(input.latitude),
    longitude: num(input.longitude),
    area_sqm: num(input.area_sqm),
    area_ha: num(input.area_ha),
    bay_count: num(input.bay_count) != null ? Math.round(Number(input.bay_count)) : null,
    column_count:
      num(input.column_count) != null ? Math.round(Number(input.column_count)) : null,
  });
  if (res.error) return { ok: false as const, error: res.error.message };
  return { ok: true as const };
}

export async function importSitesCsvAction(csvText: string) {
  return importSitesCsv(csvText);
}
