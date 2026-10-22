import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve("src/lib/star-greenhouse-rows.ts"), "utf8");
const re =
  /\{ id: "([^"]+)", name: "([^"]+)", areaSqm: ([0-9.]+), bayMax: (\d+), columnMax: (\d+)(?:,[^}]*)?, varieties: \["([^"]+)"\]/g;

const values = [];
let m;
while ((m = re.exec(src))) {
  values.push(`  (N'${m[2]}', N'${m[3]}')`);
}

const sql = `/*
  One-time fix: rename Cut Rose category to Super Premium and set greenhouse crop_type to variety names.
  Run on FDB Scouting DB after bad Star seed.
*/
SET NOCOUNT ON;

UPDATE dbo.crop_categories
SET name = N'Super Premium'
WHERE name = N'Cut Rose';

UPDATE g
SET g.crop_type = m.variety
FROM dbo.greenhouses g
INNER JOIN (
VALUES
${values.join(",\n")}
) AS m(gh_name, variety) ON g.name = m.gh_name
WHERE g.crop_type = N'Cut Rose' OR g.crop_type IS NULL OR LTRIM(RTRIM(g.crop_type)) = N'';

PRINT N'Updated crop category and greenhouse varieties (008).';
`;

writeFileSync(resolve("sql/mssql/008_super_premium_crop_fix.sql"), sql);
console.log("Wrote 008 with", values.length, "greenhouse mappings");
