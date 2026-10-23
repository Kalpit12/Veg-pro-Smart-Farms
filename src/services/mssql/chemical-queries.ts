import { randomUUID } from "crypto";

import { SQL_KENYA_NOW } from "@/lib/mssql/datetime";
import { fail, ok, toIso } from "@/lib/mssql/result";
import { requireServerSession } from "@/lib/mssql/session-server";
import { getMssqlPool, sql } from "@/lib/mssql/pool";
import type { ChemicalsCsvRow } from "@/lib/chemicals-csv";

export type ChemicalRow = {
  id: string;
  name: string;
  active_ingredient: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

async function requireAdmin() {
  const session = await requireServerSession();
  if (session.role !== "admin") throw new Error("Only admins can manage chemicals.");
  return session;
}

function mapRow(r: Record<string, unknown>): ChemicalRow {
  return {
    id: String(r.id),
    name: r.name as string,
    active_ingredient: (r.active_ingredient as string | null) ?? null,
    is_active: Boolean(r.is_active),
    created_at: toIso(r.created_at),
    updated_at: toIso(r.updated_at),
  };
}

export async function mssqlListChemicals(options?: { includeInactive?: boolean }) {
  await requireServerSession();
  const pool = await getMssqlPool();
  const where = options?.includeInactive ? "" : "WHERE is_active = 1";
  const result = await pool.request().query(`
    SELECT id, name, active_ingredient, is_active, created_at, updated_at
    FROM dbo.chemicals
    ${where}
    ORDER BY name
  `);
  return ok(result.recordset.map((r) => mapRow(r as Record<string, unknown>)));
}

export async function mssqlListAdminChemicals() {
  await requireAdmin();
  return mssqlListChemicals({ includeInactive: true });
}

export async function mssqlUpsertChemical(input: {
  name: string;
  active_ingredient?: string | null;
}) {
  await requireAdmin();
  const name = input.name.trim();
  if (name.length < 2) return fail("Product name is too short.");
  const pool = await getMssqlPool();
  const existing = await pool
    .request()
    .input("name", sql.NVarChar(200), name)
    .query(`
      SELECT TOP 1 id FROM dbo.chemicals
      WHERE LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(@name)))
    `);

  if (existing.recordset[0]) {
    const id = String(existing.recordset[0].id);
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("name", sql.NVarChar(200), name)
      .input("ai", sql.NVarChar(200), input.active_ingredient?.trim() || null)
      .query(`
        UPDATE dbo.chemicals
        SET name = @name,
            active_ingredient = @ai,
            is_active = 1,
            updated_at = ${SQL_KENYA_NOW}
        WHERE id = @id
      `);
    return ok({ id, updated: true as const });
  }

  const id = randomUUID();
  await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .input("name", sql.NVarChar(200), name)
    .input("ai", sql.NVarChar(200), input.active_ingredient?.trim() || null)
    .query(`
      INSERT INTO dbo.chemicals (id, name, active_ingredient)
      VALUES (@id, @name, @ai)
    `);
  return ok({ id, updated: false as const });
}

export async function mssqlImportChemicalsRows(rows: ChemicalsCsvRow[]) {
  await requireAdmin();
  let added = 0;
  let updated = 0;
  let skipped = 0;
  for (const row of rows) {
    const res = await mssqlUpsertChemical(row);
    if (res.error) {
      skipped++;
      continue;
    }
    if (res.data?.updated) updated++;
    else added++;
  }
  return ok({ added, updated, skipped, errors: [] as string[] });
}

export async function mssqlDeactivateChemical(id: string) {
  await requireAdmin();
  const pool = await getMssqlPool();
  await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .query(`
      UPDATE dbo.chemicals
      SET is_active = 0, updated_at = ${SQL_KENYA_NOW}
      WHERE id = @id
    `);
  return ok(true);
}
