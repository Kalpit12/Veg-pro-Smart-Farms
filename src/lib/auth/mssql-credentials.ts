import bcrypt from "bcryptjs";

import { getMssqlPool, sql } from "@/lib/mssql/pool";
import type { Role } from "@/types/db";

export type MssqlUserRow = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  password_hash: string | null;
  is_active: boolean;
};

export async function findUserByEmail(email: string): Promise<MssqlUserRow | null> {
  const pool = await getMssqlPool();
  const normalized = email.trim().toLowerCase();
  const result = await pool
    .request()
    .input("email", sql.NVarChar(320), normalized)
    .query(
      `SELECT id, email, full_name, role, password_hash,
              CAST(COALESCE(is_active, 1) AS bit) AS is_active
       FROM dbo.users
       WHERE LOWER(email) = @email`,
    );
  const row = result.recordset[0];
  if (!row) return null;
  return {
    id: String(row.id),
    email: row.email as string,
    full_name: row.full_name as string,
    role: row.role as Role,
    password_hash: row.password_hash as string | null,
    is_active: row.is_active === true || row.is_active === 1,
  };
}

export async function isMssqlUserActive(userId: string): Promise<boolean> {
  const pool = await getMssqlPool();
  const result = await pool
    .request()
    .input("id", sql.UniqueIdentifier, userId)
    .query(`SELECT CAST(COALESCE(is_active, 1) AS bit) AS is_active FROM dbo.users WHERE id = @id`);
  const row = result.recordset[0];
  if (!row) return false;
  return row.is_active === true || row.is_active === 1;
}

export async function verifyMssqlPassword(
  user: MssqlUserRow,
  password: string,
): Promise<boolean> {
  if (!user.password_hash) return false;
  return bcrypt.compare(password, user.password_hash);
}
