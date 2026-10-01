import bcrypt from "bcryptjs";

import { getMssqlPool, sql } from "@/lib/mssql/pool";
import type { Role } from "@/types/db";

export type MssqlUserRow = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  password_hash: string | null;
};

export async function findUserByEmail(email: string): Promise<MssqlUserRow | null> {
  const pool = await getMssqlPool();
  const normalized = email.trim().toLowerCase();
  const result = await pool
    .request()
    .input("email", sql.NVarChar(320), normalized)
    .query<MssqlUserRow>(
      `SELECT id, email, full_name, role, password_hash
       FROM dbo.users
       WHERE LOWER(email) = @email`,
    );
  return result.recordset[0] ?? null;
}

export async function verifyMssqlPassword(
  user: MssqlUserRow,
  password: string,
): Promise<boolean> {
  if (!user.password_hash) return false;
  return bcrypt.compare(password, user.password_hash);
}
