import type { Role } from "@/types/db";
import { getMssqlPool, sql } from "@/lib/mssql/pool";
import { isMssqlMissingObjectError } from "@/lib/mssql/sql-errors";
import { isSqlGuid } from "@/lib/uuid";

export async function listSupervisorGreenhouseIds(userId: string): Promise<string[]> {
  try {
    const pool = await getMssqlPool();
    const result = await pool
      .request()
      .input("user_id", sql.UniqueIdentifier, userId)
      .query(`
        SELECT greenhouse_id FROM dbo.supervisor_greenhouse_access WHERE user_id = @user_id
      `);
    return result.recordset.map((r) => String(r.greenhouse_id));
  } catch (e) {
    if (isMssqlMissingObjectError(e, "supervisor_greenhouse_access")) {
      return [];
    }
    throw e;
  }
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
  const safe = ids.filter((id) => isSqlGuid(id));
  if (!safe.length) return " AND 1=0";
  const inList = safe.map((id) => `'${id}'`).join(",");
  return ` AND (
    ${greenhouseCol} IN (${inList})
    OR (${greenhouseCol} IS NULL AND ${farmCol} IN (
      SELECT farm_id FROM dbo.greenhouses WHERE id IN (${inList})
    ))
  )`;
}
