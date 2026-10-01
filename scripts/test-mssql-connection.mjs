/**
 * Test VegPro MS SQL credentials (run on VPN).
 * Usage: node scripts/test-mssql-connection.mjs
 * Reads MSSQL_* from .env.local (simple KEY=value lines).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import sql from "mssql";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
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

loadEnvLocal();

const server = process.env.MSSQL_SERVER;
const database = process.env.MSSQL_DATABASE ?? "Scouting";
const user = process.env.MSSQL_USER;
const password = process.env.MSSQL_PASSWORD;
const port = process.env.MSSQL_PORT ? Number(process.env.MSSQL_PORT) : 1433;

if (!server || !user || !password) {
  console.error(
    "Missing MSSQL_SERVER, MSSQL_USER, or MSSQL_PASSWORD in .env.local\n" +
      "See .env.example MSSQL section.",
  );
  process.exit(1);
}

const trustCert = process.env.MSSQL_TRUST_SERVER_CERTIFICATE !== "false";
const encrypt = process.env.MSSQL_ENCRYPT !== "false";

const pool = await sql.connect({
  server,
  port,
  database,
  user,
  password,
  options: {
    encrypt,
    trustServerCertificate: trustCert,
  },
});

const result = await pool.request().query("SELECT DB_NAME() AS db, @@VERSION AS version");
console.log(`OK: connected to ${result.recordset[0].db} on ${server}`);
console.log(String(result.recordset[0].version).split("\n")[0]);
await pool.close();
