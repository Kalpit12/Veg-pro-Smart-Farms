import type { Role } from "@/types/db";
import { getMssqlPool, sql } from "@/lib/mssql/pool";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function listSupervisorGreenhouseIds(userId: string): Promise<string[]> {
  const pool = await getMssqlPool();
  const result = await pool
    .request()
    .input("user_id", sql.UniqueIdentifier, userId)
    .query(`
      SELECT greenhouse_id FROM dbo.supervisor_greenhouse_access WHERE user_id = @user_id
    `);
  return result.recordset.map((r) => String(r.greenhouse_id));
}

/** SQL AND-clause fragment for supervisor-scoped reads (empty for admin/worker). */
export async function sqlSupervisorSiteFilter(
  role: Role,
  userId: string,
  greenhouseCol: string,
  farmCol: string,
): Promise<string> {
  if (role !== "supervisor") return "";
  const ids = await listSupervisorGreenhouseIds(userId);
  const safe = ids.filter((id) => UUID_RE.test(id));
  if (!safe.length) return " AND 1=0";
  const inList = safe.map((id) => `'${id}'`).join(",");
  return ` AND (
    ${greenhouseCol} IN (${inList})
    OR (${greenhouseCol} IS NULL AND ${farmCol} IN (
      SELECT farm_id FROM dbo.greenhouses WHERE id IN (${inList})
    ))
  )`;
}
