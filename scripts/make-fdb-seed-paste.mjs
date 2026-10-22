import { readFileSync, writeFileSync } from "node:fs";

const t = readFileSync("src/lib/star-greenhouse-rows.ts", "utf8");
const rows = [
  ...t.matchAll(
    /name: "([^"]+)", areaSqm: ([0-9.]+), bayMax: (\d+), columnMax: (\d+)/g,
  ),
].map((m) => [m[1], Number(m[2]), Number(m[3]), Number(m[4])]);

const script = `@echo off
REM Paste-created seed — run on FDB as Scouting
cd /d C:\\Users\\Scouting\\Veg-pro-Smart-Farms-master
node -e "const{connectMssql}=await import('./scripts/mssql-connect.mjs');const farm='beee0001-0001-4001-8001-000000000001';const cat='ccccccc1-1111-1111-1111-111111111111';const rows=${JSON.stringify(rows)};const vars=['Red Calypso','Simply Orange','Fuschiana','Athena','Simply Pink','Confidential','Moonwalk','Inka','Madam Red','Pink Arrow','Escape','Million Reason','Revolution','Orange Candy','Natures White'];const{pool,sql}=await connectMssql();await pool.request().input('id',sql.UniqueIdentifier,farm).query(\\"MERGE dbo.farms AS t USING (SELECT @id AS id, N'Star' AS name, N'Kongoni River Farm' AS location, N'Greenhouse' AS type) AS s ON t.id=s.id WHEN MATCHED THEN UPDATE SET name=s.name,location=s.location WHEN NOT MATCHED THEN INSERT (id,name,location,type) VALUES (s.id,s.name,s.location,s.type);\\");await pool.request().input('id',sql.UniqueIdentifier,cat).query(\\"MERGE dbo.crop_categories AS t USING (SELECT @id AS id, N'Cut Rose' AS name) AS s ON t.id=s.id WHEN NOT MATCHED THEN INSERT (id,name) VALUES (s.id,s.name);\\");for (const name of vars){await pool.request().input('cat',sql.UniqueIdentifier,cat).input('name',sql.NVarChar(200),name).query(\\"IF NOT EXISTS (SELECT 1 FROM dbo.crop_varieties WHERE category_id=@cat AND name=@name) INSERT INTO dbo.crop_varieties (id,category_id,name) VALUES (NEWID(),@cat,@name);\\");}let n=0;for (let i=0;i<rows.length;i++){const[name,area,bay,col]=rows[i];const id='beeeee02-0001-4001-8001-'+String(i+1).padStart(12,'0');const r=await pool.request().input('id',sql.UniqueIdentifier,id).input('farm',sql.UniqueIdentifier,farm).input('name',sql.NVarChar(200),name).input('area',sql.Decimal(12,2),area).input('bay',sql.SmallInt,bay).input('col',sql.SmallInt,col).query(\\"IF NOT EXISTS (SELECT 1 FROM dbo.greenhouses WHERE id=@id) BEGIN INSERT INTO dbo.greenhouses (id,farm_id,name,crop_type,area_sqm,bay_count,column_count) VALUES (@id,@farm,@name,N'Cut Rose',@area,@bay,@col); SELECT 1 AS d; END ELSE SELECT 0 AS d;\\");if(r.recordset?.[0]?.d===1)n++;}const c=await pool.request().input('farm',sql.UniqueIdentifier,farm).query('SELECT COUNT(*) AS c FROM dbo.greenhouses WHERE farm_id=@farm');console.log('OK inserted '+n+' total '+c.recordset[0].c);await pool.close();"
pause
`;

writeFileSync("scripts/fdb-seed-star.cmd", script, "utf8");
writeFileSync(
  "scripts/fdb-seed-star-body.js",
  `const{connectMssql}=await import('./scripts/mssql-connect.mjs');
const farm='beee0001-0001-4001-8001-000000000001';
const cat='ccccccc1-1111-1111-1111-111111111111';
const rows=${JSON.stringify(rows)};
const vars=['Red Calypso','Simply Orange','Fuschiana','Athena','Simply Pink','Confidential','Moonwalk','Inka','Madam Red','Pink Arrow','Escape','Million Reason','Revolution','Orange Candy','Natures White'];
const{pool,sql}=await connectMssql();
await pool.request().input('id',sql.UniqueIdentifier,farm).query("MERGE dbo.farms AS t USING (SELECT @id AS id, N'Star' AS name, N'Kongoni River Farm' AS location, N'Greenhouse' AS type) AS s ON t.id=s.id WHEN MATCHED THEN UPDATE SET name=s.name,location=s.location WHEN NOT MATCHED THEN INSERT (id,name,location,type) VALUES (s.id,s.name,s.location,s.type);");
await pool.request().input('id',sql.UniqueIdentifier,cat).query("MERGE dbo.crop_categories AS t USING (SELECT @id AS id, N'Cut Rose' AS name) AS s ON t.id=s.id WHEN NOT MATCHED THEN INSERT (id,name) VALUES (s.id,s.name);");
for (const name of vars){
  await pool.request().input('cat',sql.UniqueIdentifier,cat).input('name',sql.NVarChar(200),name).query("IF NOT EXISTS (SELECT 1 FROM dbo.crop_varieties WHERE category_id=@cat AND name=@name) INSERT INTO dbo.crop_varieties (id,category_id,name) VALUES (NEWID(),@cat,@name);");
}
let n=0;
for (let i=0;i<rows.length;i++){
  const[name,area,bay,col]=rows[i];
  const id='beeeee02-0001-4001-8001-'+String(i+1).padStart(12,'0');
  const r=await pool.request().input('id',sql.UniqueIdentifier,id).input('farm',sql.UniqueIdentifier,farm).input('name',sql.NVarChar(200),name).input('area',sql.Decimal(12,2),area).input('bay',sql.SmallInt,bay).input('col',sql.SmallInt,col).query("IF NOT EXISTS (SELECT 1 FROM dbo.greenhouses WHERE id=@id) BEGIN INSERT INTO dbo.greenhouses (id,farm_id,name,crop_type,area_sqm,bay_count,column_count) VALUES (@id,@farm,@name,N'Cut Rose',@area,@bay,@col); SELECT 1 AS d; END ELSE SELECT 0 AS d;");
  if(r.recordset?.[0]?.d===1)n++;
}
const c=await pool.request().input('farm',sql.UniqueIdentifier,farm).query('SELECT COUNT(*) AS c FROM dbo.greenhouses WHERE farm_id=@farm');
console.log('OK inserted '+n+' total '+c.recordset[0].c);
await pool.close();
`,
  "utf8",
);
console.log("rows", rows.length);
console.log("body bytes", readFileSync("scripts/fdb-seed-star-body.js").length);
