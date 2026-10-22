import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const t = readFileSync(resolve("src/lib/star-greenhouse-rows.ts"), "utf8");
const rows = [
  ...t.matchAll(
    /\{ id: "([^"]+)", name: "([^"]+)", areaSqm: ([0-9.]+), bayMax: (\d+), columnMax: (\d+)(?:,[^}]*)?, varieties: \["([^"]+)"\]/g,
  ),
];

const farm = "beee0001-0001-4001-8001-000000000001";
const cat = "ccccccc1-1111-1111-1111-111111111111";
const vars = [
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

const sql = [];
sql.push("SET NOCOUNT ON;");
sql.push(`DECLARE @farmId UNIQUEIDENTIFIER = '${farm}';`);
sql.push(`DECLARE @cat UNIQUEIDENTIFIER = '${cat}';`);
sql.push(`MERGE dbo.farms AS t
USING (SELECT @farmId AS id, N'Star' AS name, N'Kongoni River Farm' AS location, N'Greenhouse' AS type) AS s
ON t.id = s.id
WHEN MATCHED THEN UPDATE SET name = s.name, location = s.location
WHEN NOT MATCHED THEN INSERT (id, name, location, type) VALUES (s.id, s.name, s.location, s.type);`);
sql.push(`MERGE dbo.crop_categories AS t
USING (SELECT @cat AS id, N'Super Premium' AS name) AS s
ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (id, name) VALUES (s.id, s.name);`);

for (const v of vars) {
  const safe = v.replace(/'/g, "''");
  sql.push(
    `IF NOT EXISTS (SELECT 1 FROM dbo.crop_varieties WHERE category_id = @cat AND name = N'${safe}')
  INSERT INTO dbo.crop_varieties (id, category_id, name) VALUES (NEWID(), @cat, N'${safe}');`,
  );
}

sql.push(`INSERT INTO dbo.greenhouses (id, farm_id, name, crop_type, area_sqm, bay_count, column_count)
SELECT v.id, @farmId, v.name, v.variety, v.area_sqm, v.bay_count, v.column_count
FROM (VALUES`);
sql.push(
  rows
    .map(
      ([, id, name, area, bay, col, variety]) =>
        `  ('${id}', N'${name}', N'${variety}', ${area}, ${bay}, ${col})`,
    )
    .join(",\n"),
);
sql.push(`) AS v(id, name, variety, area_sqm, bay_count, column_count)
WHERE NOT EXISTS (SELECT 1 FROM dbo.greenhouses g WHERE g.id = v.id);`);
sql.push(
  `SELECT COUNT(*) AS greenhouse_count FROM dbo.greenhouses WHERE farm_id = @farmId;`,
);
sql.push(`PRINT N'Star greenhouses seed applied (005).';`);

const out = resolve("sql/mssql/005_seed_star_greenhouses.sql");
writeFileSync(out, sql.join("\n") + "\n", "utf8");
console.log(`Wrote ${out} (${rows.length} greenhouses)`);
