import sql from "mssql";

import {
  getMssqlConfig,
  getMssqlPoolOptions,
  type MssqlConfig,
} from "@/lib/mssql/config";

let pool: sql.ConnectionPool | null = null;

function windowsConnectionString(cfg: MssqlConfig) {
  return [
    "Driver={ODBC Driver 17 for SQL Server}",
    `Server=${cfg.server},${cfg.port}`,
    `Database=${cfg.database}`,
    "Trusted_Connection=Yes",
    cfg.trustServerCertificate ? "TrustServerCertificate=Yes" : "TrustServerCertificate=No",
  ].join(";");
}

export async function getMssqlPool() {
  const cfg = getMssqlConfig();
  if (!cfg) {
    throw new Error(
      "MSSQL is not configured. Set DATA_BACKEND=mssql and either MSSQL_AUTH=windows or MSSQL_USER and MSSQL_PASSWORD.",
    );
  }

  if (!pool) {
    const poolOpts = getMssqlPoolOptions();
    const connected =
      cfg.auth === "windows"
        ? await connectWindows(cfg, poolOpts)
        : await sql.connect({
            server: cfg.server,
            port: cfg.port,
            database: cfg.database,
            user: cfg.user,
            password: cfg.password,
            requestTimeout: poolOpts.requestTimeout,
            connectionTimeout: poolOpts.connectionTimeout,
            pool: poolOpts.pool,
            options: {
              encrypt: cfg.encrypt,
              trustServerCertificate: cfg.trustServerCertificate,
            },
          });
    if (!connected) {
      throw new Error("MS SQL connection failed.");
    }
    pool = connected;
  }

  if (!pool) {
    throw new Error("MS SQL connection failed.");
  }
  return pool;
}

async function connectWindows(
  cfg: MssqlConfig,
  poolOpts: ReturnType<typeof getMssqlPoolOptions>,
): Promise<sql.ConnectionPool> {
  const windowsSql = (await import("mssql/msnodesqlv8.js")).default as typeof sql;
  return (await windowsSql.connect({
    connectionString: windowsConnectionString(cfg),
    driver: "msnodesqlv8",
    requestTimeout: poolOpts.requestTimeout,
    connectionTimeout: poolOpts.connectionTimeout,
    pool: poolOpts.pool,
  } as unknown as sql.config)) as sql.ConnectionPool;
}

export { sql };
