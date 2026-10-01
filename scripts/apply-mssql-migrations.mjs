/**
 * Apply sql/mssql/*.sql to VegPro Scouting DB (VPN required).
 * Usage: node scripts/apply-mssql-migrations.mjs
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import sql from "mssql";

function loadEnvLocal() {
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

function splitBatches(content) {
  return content
    .split(/^\s*GO\s*$/gim)
    .map((b) => b.trim())
    .filter(Boolean);
}

loadEnvLocal();

const server = process.env.MSSQL_SERVER;
const database = process.env.MSSQL_DATABASE ?? "Scouting";
const user = process.env.MSSQL_USER;
const password = process.env.MSSQL_PASSWORD;

if (!server || !user || !password) {
  console.error("Set MSSQL_SERVER, MSSQL_USER, MSSQL_PASSWORD in .env.local (VPN on).");
  process.exit(1);
}

const dir = resolve(process.cwd(), "sql", "mssql");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const pool = await sql.connect({
  server,
  port: process.env.MSSQL_PORT ? Number(process.env.MSSQL_PORT) : 1433,
  database,
  user,
  password,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT !== "false",
    trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE !== "false",
  },
});

console.log(`Connected to ${database} on ${server}`);

for (const file of files) {
  const full = join(dir, file);
  const content = readFileSync(full, "utf8");
  const batches = splitBatches(content);
  console.log(`\n>> ${file} (${batches.length} batch(es))`);
  for (const batch of batches) {
    await pool.request().query(batch);
  }
  console.log(`   OK`);
}

await pool.close();
console.log("\nAll MS SQL migrations applied.");
