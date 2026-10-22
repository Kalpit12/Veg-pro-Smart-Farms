/**
 * Apply sql/mssql/*.sql to VegPro Scouting DB (VPN required).
 * Usage: node scripts/apply-mssql-migrations.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { connectMssql } from "./mssql-connect.mjs";

function splitBatches(content) {
  return content
    .split(/^\s*GO\s*$/gim)
    .map((b) => b.trim())
    .filter(Boolean);
}

const { pool } = await connectMssql();

const dir = resolve(process.cwd(), "sql", "mssql");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

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
