SET NOCOUNT ON;
DECLARE @farmId UNIQUEIDENTIFIER = 'beee0001-0001-4001-8001-000000000001';
DECLARE @cat UNIQUEIDENTIFIER = 'ccccccc1-1111-1111-1111-111111111111';
MERGE dbo.farms AS t
USING (SELECT @farmId AS id, N'Star' AS name, N'Kongoni River Farm' AS location, N'Greenhouse' AS type) AS s
ON t.id = s.id
WHEN MATCHED THEN UPDATE SET name = s.name, location = s.location
WHEN NOT MATCHED THEN INSERT (id, name, location, type) VALUES (s.id, s.name, s.location, s.type);
MERGE dbo.crop_categories AS t
USING (SELECT @cat AS id, N'Cut Rose' AS name) AS s
ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (id, name) VALUES (s.id, s.name);
IF NOT EXISTS (SELECT 1 FROM dbo.crop_varieties WHERE category_id = @cat AND name = N'Red Calypso')
  INSERT INTO dbo.crop_varieties (id, category_id, name) VALUES (NEWID(), @cat, N'Red Calypso');
IF NOT EXISTS (SELECT 1 FROM dbo.crop_varieties WHERE category_id = @cat AND name = N'Simply Orange')
  INSERT INTO dbo.crop_varieties (id, category_id, name) VALUES (NEWID(), @cat, N'Simply Orange');
IF NOT EXISTS (SELECT 1 FROM dbo.crop_varieties WHERE category_id = @cat AND name = N'Fuschiana')
  INSERT INTO dbo.crop_varieties (id, category_id, name) VALUES (NEWID(), @cat, N'Fuschiana');
IF NOT EXISTS (SELECT 1 FROM dbo.crop_varieties WHERE category_id = @cat AND name = N'Athena')
  INSERT INTO dbo.crop_varieties (id, category_id, name) VALUES (NEWID(), @cat, N'Athena');
IF NOT EXISTS (SELECT 1 FROM dbo.crop_varieties WHERE category_id = @cat AND name = N'Simply Pink')
  INSERT INTO dbo.crop_varieties (id, category_id, name) VALUES (NEWID(), @cat, N'Simply Pink');
IF NOT EXISTS (SELECT 1 FROM dbo.crop_varieties WHERE category_id = @cat AND name = N'Confidential')
  INSERT INTO dbo.crop_varieties (id, category_id, name) VALUES (NEWID(), @cat, N'Confidential');
IF NOT EXISTS (SELECT 1 FROM dbo.crop_varieties WHERE category_id = @cat AND name = N'Moonwalk')
  INSERT INTO dbo.crop_varieties (id, category_id, name) VALUES (NEWID(), @cat, N'Moonwalk');
IF NOT EXISTS (SELECT 1 FROM dbo.crop_varieties WHERE category_id = @cat AND name = N'Inka')
  INSERT INTO dbo.crop_varieties (id, category_id, name) VALUES (NEWID(), @cat, N'Inka');
IF NOT EXISTS (SELECT 1 FROM dbo.crop_varieties WHERE category_id = @cat AND name = N'Madam Red')
  INSERT INTO dbo.crop_varieties (id, category_id, name) VALUES (NEWID(), @cat, N'Madam Red');
IF NOT EXISTS (SELECT 1 FROM dbo.crop_varieties WHERE category_id = @cat AND name = N'Pink Arrow')
  INSERT INTO dbo.crop_varieties (id, category_id, name) VALUES (NEWID(), @cat, N'Pink Arrow');
IF NOT EXISTS (SELECT 1 FROM dbo.crop_varieties WHERE category_id = @cat AND name = N'Escape')
  INSERT INTO dbo.crop_varieties (id, category_id, name) VALUES (NEWID(), @cat, N'Escape');
IF NOT EXISTS (SELECT 1 FROM dbo.crop_varieties WHERE category_id = @cat AND name = N'Million Reason')
  INSERT INTO dbo.crop_varieties (id, category_id, name) VALUES (NEWID(), @cat, N'Million Reason');
IF NOT EXISTS (SELECT 1 FROM dbo.crop_varieties WHERE category_id = @cat AND name = N'Revolution')
  INSERT INTO dbo.crop_varieties (id, category_id, name) VALUES (NEWID(), @cat, N'Revolution');
IF NOT EXISTS (SELECT 1 FROM dbo.crop_varieties WHERE category_id = @cat AND name = N'Orange Candy')
  INSERT INTO dbo.crop_varieties (id, category_id, name) VALUES (NEWID(), @cat, N'Orange Candy');
IF NOT EXISTS (SELECT 1 FROM dbo.crop_varieties WHERE category_id = @cat AND name = N'Natures White')
  INSERT INTO dbo.crop_varieties (id, category_id, name) VALUES (NEWID(), @cat, N'Natures White');
INSERT INTO dbo.greenhouses (id, farm_id, name, crop_type, area_sqm, bay_count, column_count)
SELECT v.id, @farmId, v.name, N'Cut Rose', v.area_sqm, v.bay_count, v.column_count
FROM (VALUES
  ('beeeee02-0001-4001-8001-000000000001', N'STGH01A', 4840, 11, 11),
  ('beeeee02-0001-4001-8001-000000000002', N'STGH01B', 2433, 11, 6),
  ('beeeee02-0001-4001-8001-000000000003', N'STGH01C', 2875, 11, 7),
  ('beeeee02-0001-4001-8001-000000000004', N'STGH01D', 3232, 10, 8),
  ('beeeee02-0001-4001-8001-000000000005', N'STGH02A', 3447, 11, 8),
  ('beeeee02-0001-4001-8001-000000000006', N'STGH02B', 3447, 11, 8),
  ('beeeee02-0001-4001-8001-000000000007', N'STGH02C', 3447, 11, 8),
  ('beeeee02-0001-4001-8001-000000000008', N'STGH02D', 3446, 11, 9),
  ('beeeee02-0001-4001-8001-000000000009', N'STGH02E', 3446, 11, 8),
  ('beeeee02-0001-4001-8001-000000000010', N'STGH02F', 3447, 11, 8),
  ('beeeee02-0001-4001-8001-000000000011', N'STGH03A', 5280, 11, 11),
  ('beeeee02-0001-4001-8001-000000000012', N'STGH03B', 5280, 11, 13),
  ('beeeee02-0001-4001-8001-000000000013', N'STGH03C', 2530, 11, 6),
  ('beeeee02-0001-4001-8001-000000000014', N'STGH03D', 2530, 11, 5),
  ('beeeee02-0001-4001-8001-000000000015', N'STGH03E', 2530, 11, 6),
  ('beeeee02-0001-4001-8001-000000000016', N'STGH03F', 2530, 11, 6),
  ('beeeee02-0001-4001-8001-000000000017', N'STGH04A', 3877.5, 11, 11),
  ('beeeee02-0001-4001-8001-000000000018', N'STGH04B', 3877.5, 11, 12),
  ('beeeee02-0001-4001-8001-000000000019', N'STGH04C', 3877.5, 11, 8),
  ('beeeee02-0001-4001-8001-000000000020', N'STGH04D', 3877.5, 11, 6),
  ('beeeee02-0001-4001-8001-000000000021', N'STGH04E', 2585, 11, 6),
  ('beeeee02-0001-4001-8001-000000000022', N'STGH04F', 2585, 11, 6),
  ('beeeee02-0001-4001-8001-000000000023', N'STGH05A', 5060, 11, 11),
  ('beeeee02-0001-4001-8001-000000000024', N'STGH05B', 5060, 11, 12),
  ('beeeee02-0001-4001-8001-000000000025', N'STGH06A', 3850, 11, 9),
  ('beeeee02-0001-4001-8001-000000000026', N'STGH06B', 3850, 11, 9),
  ('beeeee02-0001-4001-8001-000000000027', N'STGH06C', 3850, 11, 9),
  ('beeeee02-0001-4001-8001-000000000028', N'STGH06D', 3850, 11, 9),
  ('beeeee02-0001-4001-8001-000000000029', N'STGH07A', 5198.25, 11, 12),
  ('beeeee02-0001-4001-8001-000000000030', N'STGH07B', 5198.25, 11, 12),
  ('beeeee02-0001-4001-8001-000000000031', N'STGH07C', 5198.25, 11, 11),
  ('beeeee02-0001-4001-8001-000000000032', N'STGH07D', 5198.25, 11, 12),
  ('beeeee02-0001-4001-8001-000000000033', N'STGH08A', 3901, 6, 10),
  ('beeeee02-0001-4001-8001-000000000034', N'STGH08B', 3901, 11, 10),
  ('beeeee02-0001-4001-8001-000000000035', N'STGH08C', 3901, 11, 10),
  ('beeeee02-0001-4001-8001-000000000036', N'STGH08D', 3901, 11, 10),
  ('beeeee02-0001-4001-8001-000000000037', N'STGH09A', 2330, 4, 8),
  ('beeeee02-0001-4001-8001-000000000038', N'STGH09B', 2330, 8, 10),
  ('beeeee02-0001-4001-8001-000000000039', N'STGH10A', 4290, 11, 10),
  ('beeeee02-0001-4001-8001-000000000040', N'STGH10B', 4290, 11, 10),
  ('beeeee02-0001-4001-8001-000000000041', N'STGH10C', 4290, 11, 10),
  ('beeeee02-0001-4001-8001-000000000042', N'STGH10D', 4290, 11, 10),
  ('beeeee02-0001-4001-8001-000000000043', N'STGH11A', 5610, 11, 13),
  ('beeeee02-0001-4001-8001-000000000044', N'STGH11B', 5610, 11, 13),
  ('beeeee02-0001-4001-8001-000000000045', N'STGH11C', 5610, 11, 12),
  ('beeeee02-0001-4001-8001-000000000046', N'STGH11D', 5610, 11, 13),
  ('beeeee02-0001-4001-8001-000000000047', N'STGH12A', 6600, 11, 15),
  ('beeeee02-0001-4001-8001-000000000048', N'STGH12B', 6600, 11, 15),
  ('beeeee02-0001-4001-8001-000000000049', N'STGH12C', 6600, 11, 15),
  ('beeeee02-0001-4001-8001-000000000050', N'STGH12D', 6600, 11, 15),
  ('beeeee02-0001-4001-8001-000000000051', N'STGH13A', 5543, 11, 13),
  ('beeeee02-0001-4001-8001-000000000052', N'STGH13B', 5543, 11, 11),
  ('beeeee02-0001-4001-8001-000000000053', N'STGH13C', 5543, 11, 14),
  ('beeeee02-0001-4001-8001-000000000054', N'STGH13D', 5543, 11, 12),
  ('beeeee02-0001-4001-8001-000000000055', N'STGH13E', 5500, 11, 13),
  ('beeeee02-0001-4001-8001-000000000056', N'STGH13F', 5500, 11, 12),
  ('beeeee02-0001-4001-8001-000000000057', N'STGH14A', 5500, 11, 13),
  ('beeeee02-0001-4001-8001-000000000058', N'STGH14B', 5500, 11, 11),
  ('beeeee02-0001-4001-8001-000000000059', N'STGH14C', 5573, 11, 13),
  ('beeeee02-0001-4001-8001-000000000060', N'STGH14D', 5574, 11, 13),
  ('beeeee02-0001-4001-8001-000000000061', N'STGH14E', 5573, 11, 13),
  ('beeeee02-0001-4001-8001-000000000062', N'STGH14F', 5280, 11, 12),
  ('beeeee02-0001-4001-8001-000000000063', N'STGH15A', 6640, 14, 13),
  ('beeeee02-0001-4001-8001-000000000064', N'STGH15B', 6640, 14, 13),
  ('beeeee02-0001-4001-8001-000000000065', N'STGH15C', 6640, 14, 13),
  ('beeeee02-0001-4001-8001-000000000066', N'STGH15D', 2490, 5, 10),
  ('beeeee02-0001-4001-8001-000000000067', N'STGH15E', 2490, 5, 11)
) AS v(id, name, area_sqm, bay_count, column_count)
WHERE NOT EXISTS (SELECT 1 FROM dbo.greenhouses g WHERE g.id = v.id);
SELECT COUNT(*) AS greenhouse_count FROM dbo.greenhouses WHERE farm_id = @farmId;
PRINT N'Star greenhouses seed applied (005).';
