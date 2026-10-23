/*
  One-time backfill: copy active hotspots (with grid cells) into scouting_records.
  Run after 011_hotspot_grid_cells.sql. Requires crop_varieties + scouting_parameters seeded.
*/
SET NOCOUNT ON;

DECLARE @catId UNIQUEIDENTIFIER = (
  SELECT TOP 1 id FROM dbo.crop_categories ORDER BY name
);
DECLARE @varId UNIQUEIDENTIFIER = (
  SELECT TOP 1 id FROM dbo.crop_varieties ORDER BY name
);

IF @catId IS NULL OR @varId IS NULL
BEGIN
  RAISERROR(N'Run 002/005 seed scripts for crop_categories and crop_varieties first.', 16, 1);
  RETURN;
END;

INSERT INTO dbo.scouting_records (
  id, scout_id, farm_id, greenhouse_id, category_id, variety_id, round_id,
  beds, column_no, bay_no, issue_type, issue_name, rating,
  latitude, longitude, notes, image_url, recorded_at
)
SELECT
  NEWID(),
  h.reported_by,
  h.farm_id,
  h.greenhouse_id,
  @catId,
  @varId,
  NULL,
  11,
  h.column_no,
  h.bay_no,
  CASE WHEN p.id IS NOT NULL THEN N'pest' ELSE N'pest' END,
  h.pest_type,
  h.severity,
  h.latitude,
  h.longitude,
  LEFT(h.main_issue, 4000),
  NULL,
  h.created_at
FROM dbo.infestation_hotspots h
LEFT JOIN dbo.scouting_parameters p ON p.name = h.pest_type OR p.param_key = h.pest_type
WHERE h.status = N'active'
  AND h.column_no IS NOT NULL
  AND h.bay_no IS NOT NULL
  AND h.pest_type NOT IN (N'NO Pest', N'NO Disease')
  AND NOT EXISTS (
    SELECT 1 FROM dbo.scouting_records r
    WHERE r.scout_id = h.reported_by
      AND r.greenhouse_id = h.greenhouse_id
      AND r.column_no = h.column_no
      AND r.bay_no = h.bay_no
      AND r.issue_name = h.pest_type
      AND r.recorded_at = h.created_at
  );

INSERT INTO dbo.scouting_observations (id, record_id, parameter_id, present, rating)
SELECT NEWID(), r.id, p.id, 1, r.rating
FROM dbo.scouting_records r
INNER JOIN dbo.scouting_parameters p ON p.name = r.issue_name
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.scouting_observations o
  WHERE o.record_id = r.id AND o.parameter_id = p.id
);

PRINT N'Backfill from hotspots complete (012).';
