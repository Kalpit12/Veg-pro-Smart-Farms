import sql from "mssql";

import { getMssqlConfig } from "@/lib/mssql/config";

let pool: sql.ConnectionPool | null = null;

export async function getMssqlPool() {
  const cfg = getMssqlConfig();
  if (!cfg) {
    throw new Error("MSSQL is not configured (set DATA_BACKEND=mssql and MSSQL_* env vars).");
  }

  if (!pool) {
    pool = await sql.connect({
      server: cfg.server,
      port: cfg.port,
      database: cfg.database,
      user: cfg.user,
      password: cfg.password,
      options: {
        encrypt: cfg.encrypt,
        trustServerCertificate: cfg.trustServerCertificate,
      },
    });
  }

  return pool;
}

export { sql };
