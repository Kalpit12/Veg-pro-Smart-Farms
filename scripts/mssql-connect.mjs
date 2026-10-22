/**
 * Shared MS SQL connection for VegPro setup scripts.
 * MSSQL_AUTH=windows uses the current Windows user (FDB\Scouting on the office PC).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import sql from "mssql";

export function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    if (t.startsWith("git config")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

export async function connectMssql() {
  loadEnvLocal();

  const server = process.env.MSSQL_SERVER;
  const database = process.env.MSSQL_DATABASE ?? "Scouting";
  const port = process.env.MSSQL_PORT ? Number(process.env.MSSQL_PORT) : 1433;
  const auth = process.env.MSSQL_AUTH === "windows" ? "windows" : "sql";
  const trustServerCertificate = process.env.MSSQL_TRUST_SERVER_CERTIFICATE !== "false";
  const encrypt = process.env.MSSQL_ENCRYPT !== "false";

  if (!server) {
    console.error("Set MSSQL_SERVER in .env.local");
    process.exit(1);
  }

  if (auth === "windows") {
    const windowsSql = (await import("mssql/msnodesqlv8.js")).default;
    const connectionString = [
      "Driver={ODBC Driver 17 for SQL Server}",
      `Server=${server},${port}`,
      `Database=${database}`,
      "Trusted_Connection=Yes",
      trustServerCertificate ? "TrustServerCertificate=Yes" : "TrustServerCertificate=No",
    ].join(";");
    const pool = await windowsSql.connect({
      connectionString,
      driver: "msnodesqlv8",
    });
    console.log(`Connecting with Windows login to ${database} on ${server}`);
    return { sql: windowsSql, pool };
  }

  const user = process.env.MSSQL_USER;
  const password = process.env.MSSQL_PASSWORD;
  if (!user || !password) {
    console.error("Set MSSQL_USER and MSSQL_PASSWORD in .env.local, or set MSSQL_AUTH=windows");
    process.exit(1);
  }

  const pool = await sql.connect({
    server,
    port,
    database,
    user,
    password,
    options: { encrypt, trustServerCertificate },
  });
  return { sql, pool };
}
