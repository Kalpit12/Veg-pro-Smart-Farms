-- Use this if 014_dashboard_performance_indexes.sql fails (e.g. INCLUDE not supported).
USE Scouting;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_scouting_records_recorded_at'
    AND object_id = OBJECT_ID(N'dbo.scouting_records')
)
CREATE INDEX IX_scouting_records_recorded_at ON dbo.scouting_records (recorded_at DESC);
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_infestation_hotspots_status_created'
    AND object_id = OBJECT_ID(N'dbo.infestation_hotspots')
)
CREATE INDEX IX_infestation_hotspots_status_created
  ON dbo.infestation_hotspots (status, created_at DESC);
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_scouting_rounds_started_at'
    AND object_id = OBJECT_ID(N'dbo.scouting_rounds')
)
CREATE INDEX IX_scouting_rounds_started_at ON dbo.scouting_rounds (started_at DESC);
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_scouting_route_points_round_recorded'
    AND object_id = OBJECT_ID(N'dbo.scouting_route_points')
)
CREATE INDEX IX_scouting_route_points_round_recorded
  ON dbo.scouting_route_points (round_id, recorded_at);
GO
