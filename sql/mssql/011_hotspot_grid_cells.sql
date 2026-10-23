/*
  Store bay × column on field worker reports so heat maps can color cells
  without relying only on scouting_records.
*/
SET NOCOUNT ON;

IF COL_LENGTH(N'dbo.infestation_hotspots', N'column_no') IS NULL
BEGIN
  ALTER TABLE dbo.infestation_hotspots ADD column_no SMALLINT NULL;
END;

IF COL_LENGTH(N'dbo.infestation_hotspots', N'bay_no') IS NULL
BEGIN
  ALTER TABLE dbo.infestation_hotspots ADD bay_no SMALLINT NULL;
END;

PRINT N'Hotspot grid columns ready (011).';
