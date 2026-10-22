SET NOCOUNT ON;
DECLARE @farmId UNIQUEIDENTIFIER = 'beee0001-0001-4001-8001-000000000001';
DECLARE @cat UNIQUEIDENTIFIER = 'ccccccc1-1111-1111-1111-111111111111';
MERGE dbo.farms AS t
USING (SELECT @farmId AS id, N'Star' AS name, N'Kongoni River Farm' AS location, N'Greenhouse' AS type) AS s
ON t.id = s.id
WHEN MATCHED THEN UPDATE SET name = s.name, location = s.location
WHEN NOT MATCHED THEN INSERT (id, name, location, type) VALUES (s.id, s.name, s.location, s.type);
MERGE dbo.crop_categories AS t
USING (SELECT @cat AS id, N'Super Premium' AS name) AS s
ON t.id = s.id
WHEN MATCHED AND t.name <> s.name THEN UPDATE SET name = s.name
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
SELECT v.id, @farmId, v.name, v.variety, v.area_sqm, v.bay_count, v.column_count
FROM (VALUES
  ('beeeee02-0001-4001-8001-000000000001', N'STGH01A', N'4840', 11, 11, Red Calypso),
  ('beeeee02-0001-4001-8001-000000000002', N'STGH01B', N'2433', 11, 6, Simply Orange),
  ('beeeee02-0001-4001-8001-000000000003', N'STGH01C', N'2875', 11, 7, Simply Orange),
  ('beeeee02-0001-4001-8001-000000000004', N'STGH01D', N'3232', 10, 8, Simply Orange),
  ('beeeee02-0001-4001-8001-000000000005', N'STGH02A', N'3447', 11, 8, Fuschiana),
  ('beeeee02-0001-4001-8001-000000000006', N'STGH02B', N'3447', 11, 8, Fuschiana),
  ('beeeee02-0001-4001-8001-000000000007', N'STGH02C', N'3447', 11, 8, Fuschiana),
  ('beeeee02-0001-4001-8001-000000000008', N'STGH02D', N'3446', 11, 9, Fuschiana),
  ('beeeee02-0001-4001-8001-000000000009', N'STGH02E', N'3446', 11, 8, Fuschiana),
  ('beeeee02-0001-4001-8001-000000000010', N'STGH02F', N'3447', 11, 8, Fuschiana),
  ('beeeee02-0001-4001-8001-000000000011', N'STGH03A', N'5280', 11, 11, Athena),
  ('beeeee02-0001-4001-8001-000000000012', N'STGH03B', N'5280', 11, 13, Athena),
  ('beeeee02-0001-4001-8001-000000000013', N'STGH03C', N'2530', 11, 6, Simply Pink),
  ('beeeee02-0001-4001-8001-000000000014', N'STGH03D', N'2530', 11, 5, Simply Pink),
  ('beeeee02-0001-4001-8001-000000000015', N'STGH03E', N'2530', 11, 6, Simply Pink),
  ('beeeee02-0001-4001-8001-000000000016', N'STGH03F', N'2530', 11, 6, Simply Pink),
  ('beeeee02-0001-4001-8001-000000000017', N'STGH04A', N'3877.5', 11, 11, Athena),
  ('beeeee02-0001-4001-8001-000000000018', N'STGH04B', N'3877.5', 11, 12, Athena),
  ('beeeee02-0001-4001-8001-000000000019', N'STGH04C', N'3877.5', 11, 8, Athena),
  ('beeeee02-0001-4001-8001-000000000020', N'STGH04D', N'3877.5', 11, 6, Athena),
  ('beeeee02-0001-4001-8001-000000000021', N'STGH04E', N'2585', 11, 6, Simply Orange),
  ('beeeee02-0001-4001-8001-000000000022', N'STGH04F', N'2585', 11, 6, Simply Orange),
  ('beeeee02-0001-4001-8001-000000000023', N'STGH05A', N'5060', 11, 11, Confidential),
  ('beeeee02-0001-4001-8001-000000000024', N'STGH05B', N'5060', 11, 12, Confidential),
  ('beeeee02-0001-4001-8001-000000000025', N'STGH06A', N'3850', 11, 9, Simply Pink),
  ('beeeee02-0001-4001-8001-000000000026', N'STGH06B', N'3850', 11, 9, Simply Pink),
  ('beeeee02-0001-4001-8001-000000000027', N'STGH06C', N'3850', 11, 9, Moonwalk),
  ('beeeee02-0001-4001-8001-000000000028', N'STGH06D', N'3850', 11, 9, Moonwalk),
  ('beeeee02-0001-4001-8001-000000000029', N'STGH07A', N'5198.25', 11, 12, Moonwalk),
  ('beeeee02-0001-4001-8001-000000000030', N'STGH07B', N'5198.25', 11, 12, Moonwalk),
  ('beeeee02-0001-4001-8001-000000000031', N'STGH07C', N'5198.25', 11, 11, Moonwalk),
  ('beeeee02-0001-4001-8001-000000000032', N'STGH07D', N'5198.25', 11, 12, Moonwalk),
  ('beeeee02-0001-4001-8001-000000000033', N'STGH08A', N'3901', 6, 10, Inka),
  ('beeeee02-0001-4001-8001-000000000034', N'STGH08B', N'3901', 11, 10, Inka),
  ('beeeee02-0001-4001-8001-000000000035', N'STGH08C', N'3901', 11, 10, Inka),
  ('beeeee02-0001-4001-8001-000000000036', N'STGH08D', N'3901', 11, 10, Inka),
  ('beeeee02-0001-4001-8001-000000000037', N'STGH09A', N'2330', 4, 8, Madam Red),
  ('beeeee02-0001-4001-8001-000000000038', N'STGH09B', N'2330', 8, 10, Madam Red),
  ('beeeee02-0001-4001-8001-000000000039', N'STGH10A', N'4290', 11, 10, Madam Red),
  ('beeeee02-0001-4001-8001-000000000040', N'STGH10B', N'4290', 11, 10, Madam Red),
  ('beeeee02-0001-4001-8001-000000000041', N'STGH10C', N'4290', 11, 10, Madam Red),
  ('beeeee02-0001-4001-8001-000000000042', N'STGH10D', N'4290', 11, 10, Madam Red),
  ('beeeee02-0001-4001-8001-000000000043', N'STGH11A', N'5610', 11, 13, Simply Pink),
  ('beeeee02-0001-4001-8001-000000000045', N'STGH11C', N'5610', 11, 12, Athena),
  ('beeeee02-0001-4001-8001-000000000046', N'STGH11D', N'5610', 11, 13, Athena),
  ('beeeee02-0001-4001-8001-000000000047', N'STGH12A', N'6600', 11, 15, Fuschiana),
  ('beeeee02-0001-4001-8001-000000000048', N'STGH12B', N'6600', 11, 15, Fuschiana),
  ('beeeee02-0001-4001-8001-000000000052', N'STGH13B', N'5543', 11, 11, Million Reason),
  ('beeeee02-0001-4001-8001-000000000053', N'STGH13C', N'5543', 11, 14, Million Reason),
  ('beeeee02-0001-4001-8001-000000000054', N'STGH13D', N'5543', 11, 12, Million Reason),
  ('beeeee02-0001-4001-8001-000000000055', N'STGH13E', N'5500', 11, 13, Moonwalk),
  ('beeeee02-0001-4001-8001-000000000056', N'STGH13F', N'5500', 11, 12, Moonwalk),
  ('beeeee02-0001-4001-8001-000000000057', N'STGH14A', N'5500', 11, 13, Moonwalk),
  ('beeeee02-0001-4001-8001-000000000058', N'STGH14B', N'5500', 11, 11, Moonwalk),
  ('beeeee02-0001-4001-8001-000000000059', N'STGH14C', N'5573', 11, 13, Fuschiana),
  ('beeeee02-0001-4001-8001-000000000060', N'STGH14D', N'5574', 11, 13, Fuschiana),
  ('beeeee02-0001-4001-8001-000000000061', N'STGH14E', N'5573', 11, 13, Fuschiana),
  ('beeeee02-0001-4001-8001-000000000062', N'STGH14F', N'5280', 11, 12, Orange Candy),
  ('beeeee02-0001-4001-8001-000000000063', N'STGH15A', N'6640', 14, 13, Natures White),
  ('beeeee02-0001-4001-8001-000000000064', N'STGH15B', N'6640', 14, 13, Natures White),
  ('beeeee02-0001-4001-8001-000000000065', N'STGH15C', N'6640', 14, 13, Natures White),
  ('beeeee02-0001-4001-8001-000000000066', N'STGH15D', N'2490', 5, 10, Natures White),
  ('beeeee02-0001-4001-8001-000000000067', N'STGH15E', N'2490', 5, 11, Natures White)
) AS v(id, name, variety, area_sqm, bay_count, column_count)
WHERE NOT EXISTS (SELECT 1 FROM dbo.greenhouses g WHERE g.id = v.id);
SELECT COUNT(*) AS greenhouse_count FROM dbo.greenhouses WHERE farm_id = @farmId;
PRINT N'Star greenhouses seed applied (005).';
