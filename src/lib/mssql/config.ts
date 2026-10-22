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
