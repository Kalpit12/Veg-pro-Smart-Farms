import { randomUUID } from "crypto";

import { fail, ok, toIso } from "@/lib/mssql/result";
import { requireServerSession } from "@/lib/mssql/session-server";
import { getMssqlPool, sql } from "@/lib/mssql/pool";

async function requireAdmin() {
  const session = await requireServerSession();
  if (session.role !== "admin") throw new Error("Only admins can manage farms and greenhouses.");
  return session;
}

export type AdminFarmRow = {
  id: string;
  name: string;
  location: string;
  type: string;
  created_at: string;
  greenhouse_count: number;
};

export type AdminGreenhouseRow = {
  id: string;
  farm_id: string;
  farm_name: string;
  name: string;
  crop_type: string;
  latitude: number | null;
  longitude: number | null;
  area_sqm: number | null;
  area_ha: number | null;
  bay_count: number | null;
  column_count: number | null;
  created_at: string;
};

export async function mssqlListAdminFarms() {
  await requireAdmin();
  const pool = await getMssqlPool();
  const result = await pool.request().query(`
    SELECT f.id, f.name, f.location, f.type, f.created_at,
           (SELECT COUNT(*) FROM dbo.greenhouses g WHERE g.farm_id = f.id) AS greenhouse_count
    FROM dbo.farms f
    ORDER BY f.name
  `);
  return ok(
    result.recordset.map((r) => ({
      id: String(r.id),
      name: r.name as string,
      location: r.location as string,
      type: r.type as string,
      created_at: toIso(r.created_at),
      greenhouse_count: Number(r.greenhouse_count ?? 0),
    })) as AdminFarmRow[],
  );
}

export async function mssqlListAdminGreenhouses(farmId?: string) {
  await requireAdmin();
  const pool = await getMssqlPool();
  const req = pool.request();
  let where = "";
  if (farmId) {
    req.input("farm_id", sql.UniqueIdentifier, farmId);
    where = "WHERE g.farm_id = @farm_id";
  }
  const result = await req.query(`
    SELECT g.id, g.farm_id, f.name AS farm_name, g.name, g.crop_type,
           g.latitude, g.longitude, g.area_sqm, g.area_ha, g.bay_count, g.column_count, g.created_at
    FROM dbo.greenhouses g
    INNER JOIN dbo.farms f ON f.id = g.farm_id
    ${where}
    ORDER BY f.name, g.name
  `);
  return ok(
    result.recordset.map((r) => ({
      id: String(r.id),
      farm_id: String(r.farm_id),
      farm_name: r.farm_name as string,
      name: r.name as string,
      crop_type: r.crop_type as string,
      latitude: r.latitude as number | null,
      longitude: r.longitude as number | null,
      area_sqm: r.area_sqm as number | null,
      area_ha: r.area_ha as number | null,
      bay_count: r.bay_count as number | null,
      column_count: r.column_count as number | null,
      created_at: toIso(r.created_at),
    })) as AdminGreenhouseRow[],
  );
}

export async function mssqlCreateFarm(input: {
  name: string;
  location: string;
  type: string;
}) {
  await requireAdmin();
  const pool = await getMssqlPool();
  const id = randomUUID();
  await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .input("name", sql.NVarChar(200), input.name)
    .input("location", sql.NVarChar(500), input.location)
    .input("type", sql.NVarChar(100), input.type)
    .query(`
      INSERT INTO dbo.farms (id, name, location, type) VALUES (@id, @name, @location, @type)
    `);
  return ok({ id });
}

export async function mssqlUpdateFarm(
  id: string,
  input: { name: string; location: string; type: string },
) {
  await requireAdmin();
  const pool = await getMssqlPool();
  const result = await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .input("name", sql.NVarChar(200), input.name)
    .input("location", sql.NVarChar(500), input.location)
    .input("type", sql.NVarChar(100), input.type)
    .query(`
      UPDATE dbo.farms SET name = @name, location = @location, type = @type WHERE id = @id;
      SELECT CAST(@@ROWCOUNT AS int) AS affected;
    `);
  if (!result.recordset[0]?.affected) return fail("Farm not found.");
  return ok(null);
}

export async function mssqlUpsertGreenhouse(input: {
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
  await requireAdmin();
  const pool = await getMssqlPool();
  let area_ha = input.area_ha ?? null;
  const area_sqm = input.area_sqm ?? null;
  if (area_ha == null && area_sqm != null) {
    area_ha = Math.round((area_sqm / 10000) * 10000) / 10000;
  }

  const id = input.id ?? randomUUID();
  if (input.id) {
    const result = await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("farm_id", sql.UniqueIdentifier, input.farm_id)
      .input("name", sql.NVarChar(200), input.name)
      .input("crop_type", sql.NVarChar(100), input.crop_type)
      .input("latitude", sql.Float, input.latitude ?? null)
      .input("longitude", sql.Float, input.longitude ?? null)
      .input("area_sqm", sql.Decimal(12, 2), area_sqm)
      .input("area_ha", sql.Decimal(10, 4), area_ha)
      .input("bay_count", sql.SmallInt, input.bay_count ?? null)
      .input("column_count", sql.SmallInt, input.column_count ?? null)
      .query(`
        UPDATE dbo.greenhouses SET
          farm_id = @farm_id, name = @name, crop_type = @crop_type,
          latitude = @latitude, longitude = @longitude,
          area_sqm = @area_sqm, area_ha = @area_ha,
          bay_count = @bay_count, column_count = @column_count
        WHERE id = @id;
        SELECT CAST(@@ROWCOUNT AS int) AS affected;
      `);
    if (!result.recordset[0]?.affected) return fail("Greenhouse not found.");
    return ok({ id });
  }

  await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .input("farm_id", sql.UniqueIdentifier, input.farm_id)
    .input("name", sql.NVarChar(200), input.name)
    .input("crop_type", sql.NVarChar(100), input.crop_type)
    .input("latitude", sql.Float, input.latitude ?? null)
    .input("longitude", sql.Float, input.longitude ?? null)
    .input("area_sqm", sql.Decimal(12, 2), area_sqm)
    .input("area_ha", sql.Decimal(10, 4), area_ha)
    .input("bay_count", sql.SmallInt, input.bay_count ?? null)
    .input("column_count", sql.SmallInt, input.column_count ?? null)
    .query(`
      INSERT INTO dbo.greenhouses (
        id, farm_id, name, crop_type, latitude, longitude, area_sqm, area_ha, bay_count, column_count
      ) VALUES (
        @id, @farm_id, @name, @crop_type, @latitude, @longitude, @area_sqm, @area_ha, @bay_count, @column_count
      )
    `);
  return ok({ id });
}

export async function mssqlFindFarmIdByName(name: string): Promise<string | null> {
  const pool = await getMssqlPool();
  const result = await pool
    .request()
    .input("name", sql.NVarChar(200), name.trim())
    .query(`SELECT TOP 1 id FROM dbo.farms WHERE name = @name`);
  const row = result.recordset[0];
  return row ? String(row.id) : null;
}
