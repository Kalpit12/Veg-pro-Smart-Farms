/**
 * Seed Star (STGH*) greenhouses + varieties into MS SQL Scouting DB.
 * Run on FDB as FDB\Scouting:
 *   node scripts/seed-star-greenhouses.mjs
 */
import { connectMssql } from "./mssql-connect.mjs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const farmId = "beee0001-0001-4001-8001-000000000001";
const catId = "ccccccc1-1111-1111-1111-111111111111";
const varieties = [
  "Red Calypso",
  "Simply Orange",
  "Fuschiana",
  "Athena",
  "Simply Pink",
  "Confidential",
  "Moonwalk",
  "Inka",
  "Madam Red",
  "Pink Arrow",
  "Escape",
  "Million Reason",
  "Revolution",
  "Orange Candy",
  "Natures White",
];

const src = readFileSync(resolve("src/lib/star-greenhouse-rows.ts"), "utf8");
const rowRe =
  /\{ id: "([^"]+)", name: "([^"]+)", areaSqm: ([0-9.]+), bayMax: (\d+), columnMax: (\d+)(?:,[^}]*)?, varieties: \["([^"]+)"\]/g;
const rows = [...src.matchAll(rowRe)].map((m) => ({
  id: m[1],
  name: m[2],
  areaSqm: Number(m[3]),
  bayMax: Number(m[4]),
  columnMax: Number(m[5]),
  variety: m[6],
}));

if (rows.length < 50) {
  console.error("Could not read STAR_GREENHOUSE_ROWS from star-greenhouse-rows.ts");
  process.exit(1);
}

const { pool, sql } = await connectMssql();

await pool
  .request()
  .input("id", sql.UniqueIdentifier, farmId)
  .query(`
    MERGE dbo.farms AS t
    USING (SELECT @id AS id, N'Star' AS name, N'Kongoni River Farm' AS location, N'Greenhouse' AS type) AS s
    ON t.id = s.id
    WHEN MATCHED THEN UPDATE SET name = s.name, location = s.location
    WHEN NOT MATCHED THEN INSERT (id, name, location, type) VALUES (s.id, s.name, s.location, s.type);
  `);

await pool
  .request()
  .input("id", sql.UniqueIdentifier, catId)
  .query(`
    MERGE dbo.crop_categories AS t
    USING (SELECT @id AS id, N'Super Premium' AS name) AS s
    ON t.id = s.id
    WHEN MATCHED AND t.name <> s.name THEN UPDATE SET name = s.name
    WHEN NOT MATCHED THEN INSERT (id, name) VALUES (s.id, s.name);
    UPDATE dbo.crop_categories SET name = N'Super Premium' WHERE name = N'Cut Rose';
  `);

for (const name of varieties) {
  await pool
    .request()
    .input("cat", sql.UniqueIdentifier, catId)
    .input("name", sql.NVarChar(200), name)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.crop_varieties WHERE category_id = @cat AND name = @name)
        INSERT INTO dbo.crop_varieties (id, category_id, name) VALUES (NEWID(), @cat, @name);
    `);
}

let inserted = 0;
let updated = 0;
for (const row of rows) {
  const result = await pool
    .request()
    .input("id", sql.UniqueIdentifier, row.id)
    .input("farm", sql.UniqueIdentifier, farmId)
    .input("name", sql.NVarChar(200), row.name)
    .input("variety", sql.NVarChar(200), row.variety)
    .input("area", sql.Decimal(12, 2), row.areaSqm)
    .input("bay", sql.SmallInt, row.bayMax)
    .input("col", sql.SmallInt, row.columnMax)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.greenhouses WHERE id = @id)
      BEGIN
        INSERT INTO dbo.greenhouses (id, farm_id, name, crop_type, area_sqm, bay_count, column_count)
        VALUES (@id, @farm, @name, @variety, @area, @bay, @col);
        SELECT 1 AS did_insert;
      END
      ELSE
      BEGIN
        UPDATE dbo.greenhouses
        SET crop_type = @variety
        WHERE id = @id AND (crop_type IS NULL OR crop_type = N'' OR crop_type = N'Cut Rose');
        SELECT 0 AS did_insert;
      END
    `);
  if (result.recordset[0]?.did_insert === 1) inserted += 1;
  else updated += 1;
}

const count = await pool
  .request()
  .input("farm", sql.UniqueIdentifier, farmId)
  .query(`SELECT COUNT(*) AS n FROM dbo.greenhouses WHERE farm_id = @farm`);

console.log(
  `Star seed done: ${inserted} inserted, ${updated} existing rows touched, ${count.recordset[0].n} greenhouses on farm.`,
);
await pool.close();
