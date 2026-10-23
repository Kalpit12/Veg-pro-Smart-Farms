export type MssqlAuth = "sql" | "windows";

export type MssqlConfig = {
  auth: MssqlAuth;
  server: string;
  database: string;
  user: string;
  password: string;
  port: number;
  encrypt: boolean;
  trustServerCertificate: boolean;
};

export function getMssqlPoolOptions() {
  const requestTimeout = process.env.MSSQL_REQUEST_TIMEOUT_MS
    ? Number(process.env.MSSQL_REQUEST_TIMEOUT_MS)
    : 60_000;
  const connectionTimeout = process.env.MSSQL_CONNECTION_TIMEOUT_MS
    ? Number(process.env.MSSQL_CONNECTION_TIMEOUT_MS)
    : 30_000;
  return {
    requestTimeout: Number.isFinite(requestTimeout) ? requestTimeout : 60_000,
    connectionTimeout: Number.isFinite(connectionTimeout) ? connectionTimeout : 30_000,
    pool: {
      max: 20,
      min: 0,
      idleTimeoutMillis: 30_000,
    },
  };
}

export function getMssqlConfig(): MssqlConfig | null {
  const server = process.env.MSSQL_SERVER?.trim();
  if (!server) return null;

  const auth: MssqlAuth = process.env.MSSQL_AUTH === "windows" ? "windows" : "sql";
  const user = process.env.MSSQL_USER?.trim() ?? "";
  const password = process.env.MSSQL_PASSWORD ?? "";
  if (auth === "sql" && (!user || !password)) return null;

  return {
    auth,
    server,
    database: process.env.MSSQL_DATABASE?.trim() || "Scouting",
    user,
    password,
    port: process.env.MSSQL_PORT ? Number(process.env.MSSQL_PORT) : 1433,
    encrypt: process.env.MSSQL_ENCRYPT !== "false",
    trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE !== "false",
  };
}
