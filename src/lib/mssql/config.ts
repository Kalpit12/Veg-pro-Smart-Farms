export type MssqlConfig = {
  server: string;
  database: string;
  user: string;
  password: string;
  port: number;
  encrypt: boolean;
  trustServerCertificate: boolean;
};

export function getMssqlConfig(): MssqlConfig | null {
  const server = process.env.MSSQL_SERVER;
  const user = process.env.MSSQL_USER;
  const password = process.env.MSSQL_PASSWORD;
  if (!server || !user || !password) return null;
  return {
    server,
    database: process.env.MSSQL_DATABASE ?? "Scouting",
    user,
    password,
    port: process.env.MSSQL_PORT ? Number(process.env.MSSQL_PORT) : 1433,
    encrypt: process.env.MSSQL_ENCRYPT !== "false",
    trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE !== "false",
  };
}
