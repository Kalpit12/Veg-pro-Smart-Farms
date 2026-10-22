import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve("src/lib/star-greenhouse-rows.ts"), "utf8");
const re =
  /\{ id: "([^"]+)", name: "([^"]+)", areaSqm: ([0-9.]+), bayMax: (\d+), columnMax: (\d+)(?:,[^}]*)?, varieties: \["([^"]+)"\]/g;

const values = [];
let m;
while ((m = re.exec(src))) {
  values.push(
    `  ('${m[1]}', N'${m[2]}', N'${m[3]}', ${m[4]}, ${m[5]}, ${m[6]})`,
  );
}

if (values.length < 50) {
  console.error("Expected 50+ rows, got", values.length);
  process.exit(1);
}

const sqlPath = resolve("sql/mssql/005_seed_star_greenhouses.sql");
let sql = readFileSync(sqlPath, "utf8");
const start = sql.indexOf("FROM (VALUES");
const end = sql.indexOf(") AS v(id, name, area_sqm, bay_count, column_count)");
if (start < 0 || end < 0) {
  console.error("Could not find VALUES block in 005");
  process.exit(1);
}

const block = `FROM (VALUES\n${values.join(",\n")}\n) AS v(id, name, variety, area_sqm, bay_count, column_count)`;
sql = sql.slice(0, start) + block + sql.slice(end + ") AS v(id, name, area_sqm, bay_count, column_count)".length);
writeFileSync(sqlPath, sql);
console.log("Patched", values.length, "greenhouse rows in 005");
