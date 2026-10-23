/*
  Full VegPro scouting parameter list (matches app SCOUTING_PARAMETERS).
  Run on FDB Scouting DB if dbo.scouting_observations never fills — usually because
  dbo.scouting_parameters was only partially seeded (002_seed_bemack_core.sql).
*/
SET NOCOUNT ON;

INSERT INTO dbo.scouting_parameters (id, param_key, param_group, name, sort_order)
SELECT NEWID(), p.param_key, p.param_group, p.name, p.sort_order
FROM (VALUES
  (N'sp-mites', N'pest', N'Mites', 1),
  (N'sp-aphids', N'pest', N'Aphids', 2),
  (N'sp-thrips', N'pest', N'Thrips', 3),
  (N'sp-white-flies', N'pest', N'White Flies', 4),
  (N'sp-fcm', N'pest', N'False Codling Moth', 5),
  (N'sp-spondoptera', N'pest', N'Spondoptera', 6),
  (N'sp-helicoverpa', N'pest', N'Helicoverpa', 7),
  (N'sp-caterpillers', N'pest', N'Other Caterpillars', 8),
  (N'sd-powdery', N'disease', N'Powdery Mildew', 9),
  (N'sd-downey', N'disease', N'Downey Mildew', 10),
  (N'sd-botrytis', N'disease', N'Botrytis', 11),
  (N'sd-back-spot', N'disease', N'Back Spot', 12),
  (N'sd-stem-bot', N'disease', N'Stem Bot', 13),
  (N'sd-agrobacterium', N'disease', N'Agrobacterium', 14),
  (N'ch-vigor', N'crop_health', N'Crop vigor', 15),
  (N'ch-nutrient', N'crop_health', N'Nutrient stress signs', 16)
) AS p(param_key, param_group, name, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.scouting_parameters x WHERE x.param_key = p.param_key
);

PRINT N'Scouting parameters sync complete (010).';
