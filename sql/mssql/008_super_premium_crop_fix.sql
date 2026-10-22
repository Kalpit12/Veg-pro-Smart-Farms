/*
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
  (N'STGH01A', N'4840'),
  (N'STGH01B', N'2433'),
  (N'STGH01C', N'2875'),
  (N'STGH01D', N'3232'),
  (N'STGH02A', N'3447'),
  (N'STGH02B', N'3447'),
  (N'STGH02C', N'3447'),
  (N'STGH02D', N'3446'),
  (N'STGH02E', N'3446'),
  (N'STGH02F', N'3447'),
  (N'STGH03A', N'5280'),
  (N'STGH03B', N'5280'),
  (N'STGH03C', N'2530'),
  (N'STGH03D', N'2530'),
  (N'STGH03E', N'2530'),
  (N'STGH03F', N'2530'),
  (N'STGH04A', N'3877.5'),
  (N'STGH04B', N'3877.5'),
  (N'STGH04C', N'3877.5'),
  (N'STGH04D', N'3877.5'),
  (N'STGH04E', N'2585'),
  (N'STGH04F', N'2585'),
  (N'STGH05A', N'5060'),
  (N'STGH05B', N'5060'),
  (N'STGH06A', N'3850'),
  (N'STGH06B', N'3850'),
  (N'STGH06C', N'3850'),
  (N'STGH06D', N'3850'),
  (N'STGH07A', N'5198.25'),
  (N'STGH07B', N'5198.25'),
  (N'STGH07C', N'5198.25'),
  (N'STGH07D', N'5198.25'),
  (N'STGH08A', N'3901'),
  (N'STGH08B', N'3901'),
  (N'STGH08C', N'3901'),
  (N'STGH08D', N'3901'),
  (N'STGH09A', N'2330'),
  (N'STGH09B', N'2330'),
  (N'STGH10A', N'4290'),
  (N'STGH10B', N'4290'),
  (N'STGH10C', N'4290'),
  (N'STGH10D', N'4290'),
  (N'STGH11A', N'5610'),
  (N'STGH11C', N'5610'),
  (N'STGH11D', N'5610'),
  (N'STGH12A', N'6600'),
  (N'STGH12B', N'6600'),
  (N'STGH13B', N'5543'),
  (N'STGH13C', N'5543'),
  (N'STGH13D', N'5543'),
  (N'STGH13E', N'5500'),
  (N'STGH13F', N'5500'),
  (N'STGH14A', N'5500'),
  (N'STGH14B', N'5500'),
  (N'STGH14C', N'5573'),
  (N'STGH14D', N'5574'),
  (N'STGH14E', N'5573'),
  (N'STGH14F', N'5280'),
  (N'STGH15A', N'6640'),
  (N'STGH15B', N'6640'),
  (N'STGH15C', N'6640'),
  (N'STGH15D', N'2490'),
  (N'STGH15E', N'2490')
) AS m(gh_name, variety) ON g.name = m.gh_name
WHERE g.crop_type = N'Cut Rose' OR g.crop_type IS NULL OR LTRIM(RTRIM(g.crop_type)) = N'';

PRINT N'Updated crop category and greenhouse varieties (008).';
