import { readFileSync } from "node:fs";
const{connectMssql}=await import('./mssql-connect.mjs');
const starSrc=readFileSync('src/lib/star-greenhouse-rows.ts','utf8');
const varietyByGh=new Map([...starSrc.matchAll(/\{ id: "[^"]+", name: "([^"]+)"[^}]*, varieties: \["([^"]+)"\]/g)].map((m)=>[m[1],m[2]]));
const farm='beee0001-0001-4001-8001-000000000001';
const cat='ccccccc1-1111-1111-1111-111111111111';
const rows=[["STGH01A",4840,11,11],["STGH01B",2433,11,6],["STGH01C",2875,11,7],["STGH01D",3232,10,8],["STGH02A",3447,11,8],["STGH02B",3447,11,8],["STGH02C",3447,11,8],["STGH02D",3446,11,9],["STGH02E",3446,11,8],["STGH02F",3447,11,8],["STGH03A",5280,11,11],["STGH03B",5280,11,13],["STGH03C",2530,11,6],["STGH03D",2530,11,5],["STGH03E",2530,11,6],["STGH03F",2530,11,6],["STGH04A",3877.5,11,11],["STGH04B",3877.5,11,12],["STGH04C",3877.5,11,8],["STGH04D",3877.5,11,6],["STGH04E",2585,11,6],["STGH04F",2585,11,6],["STGH05A",5060,11,11],["STGH05B",5060,11,12],["STGH06A",3850,11,9],["STGH06B",3850,11,9],["STGH06C",3850,11,9],["STGH06D",3850,11,9],["STGH07A",5198.25,11,12],["STGH07B",5198.25,11,12],["STGH07C",5198.25,11,11],["STGH07D",5198.25,11,12],["STGH08A",3901,6,10],["STGH08B",3901,11,10],["STGH08C",3901,11,10],["STGH08D",3901,11,10],["STGH09A",2330,4,8],["STGH09B",2330,8,10],["STGH10A",4290,11,10],["STGH10B",4290,11,10],["STGH10C",4290,11,10],["STGH10D",4290,11,10],["STGH11A",5610,11,13],["STGH11B",5610,11,13],["STGH11C",5610,11,12],["STGH11D",5610,11,13],["STGH12A",6600,11,15],["STGH12B",6600,11,15],["STGH12C",6600,11,15],["STGH12D",6600,11,15],["STGH13A",5543,11,13],["STGH13B",5543,11,11],["STGH13C",5543,11,14],["STGH13D",5543,11,12],["STGH13E",5500,11,13],["STGH13F",5500,11,12],["STGH14A",5500,11,13],["STGH14B",5500,11,11],["STGH14C",5573,11,13],["STGH14D",5574,11,13],["STGH14E",5573,11,13],["STGH14F",5280,11,12],["STGH15A",6640,14,13],["STGH15B",6640,14,13],["STGH15C",6640,14,13],["STGH15D",2490,5,10],["STGH15E",2490,5,11]];
const vars=['Red Calypso','Simply Orange','Fuschiana','Athena','Simply Pink','Confidential','Moonwalk','Inka','Madam Red','Pink Arrow','Escape','Million Reason','Revolution','Orange Candy','Natures White'];
const{pool,sql}=await connectMssql();
await pool.request().input('id',sql.UniqueIdentifier,farm).query("MERGE dbo.farms AS t USING (SELECT @id AS id, N'Star' AS name, N'Kongoni River Farm' AS location, N'Greenhouse' AS type) AS s ON t.id=s.id WHEN MATCHED THEN UPDATE SET name=s.name,location=s.location WHEN NOT MATCHED THEN INSERT (id,name,location,type) VALUES (s.id,s.name,s.location,s.type);");
await pool.request().input('id',sql.UniqueIdentifier,cat).query("MERGE dbo.crop_categories AS t USING (SELECT @id AS id, N'Super Premium' AS name) AS s ON t.id=s.id WHEN NOT MATCHED THEN INSERT (id,name) VALUES (s.id,s.name);");
for (const name of vars){
  await pool.request().input('cat',sql.UniqueIdentifier,cat).input('name',sql.NVarChar(200),name).query("IF NOT EXISTS (SELECT 1 FROM dbo.crop_varieties WHERE category_id=@cat AND name=@name) INSERT INTO dbo.crop_varieties (id,category_id,name) VALUES (NEWID(),@cat,@name);");
}
let n=0;
for (let i=0;i<rows.length;i++){
  const[name,area,bay,col]=rows[i];
  const id='beeeee02-0001-4001-8001-'+String(i+1).padStart(12,'0');
  const variety=varietyByGh.get(name)??'';
  const r=await pool.request().input('id',sql.UniqueIdentifier,id).input('farm',sql.UniqueIdentifier,farm).input('name',sql.NVarChar(200),name).input('variety',sql.NVarChar(200),variety).input('area',sql.Decimal(12,2),area).input('bay',sql.SmallInt,bay).input('col',sql.SmallInt,col).query("IF NOT EXISTS (SELECT 1 FROM dbo.greenhouses WHERE id=@id) BEGIN INSERT INTO dbo.greenhouses (id,farm_id,name,crop_type,area_sqm,bay_count,column_count) VALUES (@id,@farm,@name,@variety,@area,@bay,@col); SELECT 1 AS d; END ELSE SELECT 0 AS d;");
  if(r.recordset?.[0]?.d===1)n++;
}
const c=await pool.request().input('farm',sql.UniqueIdentifier,farm).query('SELECT COUNT(*) AS c FROM dbo.greenhouses WHERE farm_id=@farm');
console.log('OK inserted '+n+' total '+c.recordset[0].c);
await pool.close();
