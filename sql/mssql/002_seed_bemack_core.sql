/*
  Minimal Bemack master data for MS SQL scouting (run after 001_schema.sql).
*/
SET NOCOUNT ON;

DECLARE @farmId UNIQUEIDENTIFIER = 'beee0001-0001-4001-8001-000000000001';
DECLARE @catCutRose UNIQUEIDENTIFIER = 'ccccccc1-1111-1111-1111-111111111111';

MERGE dbo.farms AS t
USING (SELECT @farmId AS id, N'Bemack' AS name, N'Protected floriculture' AS location, N'Greenhouse' AS type) AS s
ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (id, name, location, type) VALUES (s.id, s.name, s.location, s.type);

MERGE dbo.crop_categories AS t
USING (SELECT @catCutRose AS id, N'Cut Rose' AS name) AS s
ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (id, name) VALUES (s.id, s.name);

INSERT INTO dbo.crop_varieties (id, category_id, name)
SELECT NEWID(), @catCutRose, v.name
FROM (VALUES
  (N'ANNAKARINA'),(N'EVER RED'),(N'EXPLORER'),(N'MADAM RED')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.crop_varieties cv WHERE cv.category_id = @catCutRose AND cv.name = v.name
);

INSERT INTO dbo.scouting_parameters (id, param_key, param_group, name, sort_order)
SELECT NEWID(), p.param_key, p.param_group, p.name, p.sort_order
FROM (VALUES
  (N'sp-white-flies', N'pest', N'White Flies', 1),
  (N'sp-thrips', N'pest', N'Thrips', 2),
  (N'sd-botrytis', N'disease', N'Botrytis', 9),
  (N'ch-vigor', N'crop_health', N'Crop vigor', 14)
) AS p(param_key, param_group, name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM dbo.scouting_parameters x WHERE x.param_key = p.param_key);

INSERT INTO dbo.greenhouses (id, farm_id, name, crop_type, latitude, longitude, area_ha)
SELECT v.id, @farmId, v.name, N'Floriculture', v.lat, v.lng, v.area_ha
FROM (VALUES
  ('beeeee01-0001-0001-0001-000000000001', N'BEGH 01', -1.2921, 36.8219, 0.70),
  ('beeeee01-0001-0001-0001-000000000016', N'BEGH 16', -1.2945, 36.8243, 0.50),
  ('beeeee01-0001-0001-0001-000000000017', N'BEGH 17', -1.2933, 36.8251, 0.50)
) AS v(id, name, lat, lng, area_ha)
WHERE NOT EXISTS (SELECT 1 FROM dbo.greenhouses g WHERE g.id = v.id);

PRINT N'Bemack core seed applied (002).';
