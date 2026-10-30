/*
  Kenya time (EAT, UTC+3) for database DEFAULT timestamps.

  WHY: the app stores Kenya wall-clock time (e.g. scouting stops), but every
  "DEFAULT SYSUTCDATETIME()" column still filled in UTC. Rows that rely on the
  default (infestation reports, sprays, activities, alerts ...) showed 3 hours
  early in the app (e.g. 05:04 PM instead of 08:04 PM).

  WHAT IT DOES
    Part A  Every dbo column whose default is SYSUTCDATETIME() / GETUTCDATE()
            gets DEFAULT DATEADD(HOUR, 3, SYSUTCDATETIME()) instead.
    Part B  (optional, @FixExistingRows = 1) adds 3 hours to EXISTING rows in
            columns that were ALWAYS filled by that UTC default, so old reports
            show the right time too:
              infestation_hotspots.created_at, spray_treatments.created_at,
              activities.created_at, alerts.created_at
            Scouting stops / rounds / GPS points are NOT touched (the app already
            wrote those in Kenya time).

  HOW TO RUN (SSMS, database Scouting)
    1. Run as-is            -> PREVIEW: lists the defaults it will change. Nothing changes.
    2. Optional backup:
         BACKUP DATABASE Scouting TO DISK = N'D:\Backups\Scouting_before_kenya_defaults.bak' WITH INIT;
    3. Set @Confirm = 1 (and @FixExistingRows = 1 to correct old rows) and run again.
    !! Run Part B only ONCE. Running it twice adds another 3 hours.
*/
USE Scouting;
GO
SET NOCOUNT ON;

DECLARE @Confirm         BIT = 0;  /* 1 = change defaults */
DECLARE @FixExistingRows BIT = 0;  /* 1 = also shift existing UTC rows +3h (once only!) */

IF OBJECT_ID('tempdb..#utc_defaults') IS NOT NULL DROP TABLE #utc_defaults;

SELECT t.name AS table_name, c.name AS column_name, dc.name AS constraint_name, dc.definition
INTO #utc_defaults
FROM sys.default_constraints dc
INNER JOIN sys.tables  t ON t.object_id = dc.parent_object_id
INNER JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
WHERE SCHEMA_NAME(t.schema_id) = N'dbo'
  AND (LOWER(dc.definition) LIKE N'%sysutcdatetime()%' OR LOWER(dc.definition) LIKE N'%getutcdate()%')
  AND LOWER(dc.definition) NOT LIKE N'%dateadd%';

SELECT table_name, column_name, constraint_name, definition AS current_default
FROM #utc_defaults ORDER BY table_name, column_name;

IF @FixExistingRows = 1
  SELECT N'rows that will shift +3h' AS note,
    (SELECT COUNT(*) FROM dbo.infestation_hotspots) AS infestation_hotspots,
    (SELECT COUNT(*) FROM dbo.spray_treatments)     AS spray_treatments,
    (SELECT CASE WHEN OBJECT_ID(N'dbo.activities', N'U') IS NULL THEN 0 ELSE (SELECT COUNT(*) FROM dbo.activities) END) AS activities,
    (SELECT COUNT(*) FROM dbo.alerts)               AS alerts;

IF @Confirm = 0
BEGIN
  PRINT N'Preview only. Set @Confirm = 1 and run again.';
  RETURN;
END;

BEGIN TRY
  BEGIN TRANSACTION;

  /* Part A: replace UTC defaults */
  DECLARE @t SYSNAME, @c SYSNAME, @dc SYSNAME, @sql NVARCHAR(MAX), @n INT = 0;
  DECLARE dcur CURSOR LOCAL FAST_FORWARD FOR
    SELECT table_name, column_name, constraint_name FROM #utc_defaults;
  OPEN dcur;
  FETCH NEXT FROM dcur INTO @t, @c, @dc;
  WHILE @@FETCH_STATUS = 0
  BEGIN
    SET @sql = N'ALTER TABLE dbo.' + QUOTENAME(@t) + N' DROP CONSTRAINT ' + QUOTENAME(@dc) + N'; '
             + N'ALTER TABLE dbo.' + QUOTENAME(@t) + N' ADD CONSTRAINT ' + QUOTENAME(@dc)
             + N' DEFAULT (DATEADD(HOUR, 3, SYSUTCDATETIME())) FOR ' + QUOTENAME(@c) + N';';
    EXEC sp_executesql @sql;
    SET @n += 1;
    FETCH NEXT FROM dcur INTO @t, @c, @dc;
  END;
  CLOSE dcur;
  DEALLOCATE dcur;
  PRINT N'Defaults changed to Kenya time: ' + CAST(@n AS NVARCHAR(20));

  /* Part B: correct existing UTC rows (once only) */
  IF @FixExistingRows = 1
  BEGIN
    UPDATE dbo.infestation_hotspots SET created_at = DATEADD(HOUR, 3, created_at);
    PRINT N'  infestation_hotspots: ' + CAST(@@ROWCOUNT AS NVARCHAR(20)) + N' row(s) +3h';
    UPDATE dbo.spray_treatments SET created_at = DATEADD(HOUR, 3, created_at);
    PRINT N'  spray_treatments: ' + CAST(@@ROWCOUNT AS NVARCHAR(20)) + N' row(s) +3h';
    IF OBJECT_ID(N'dbo.activities', N'U') IS NOT NULL
    BEGIN
      EXEC (N'UPDATE dbo.activities SET created_at = DATEADD(HOUR, 3, created_at);');
      PRINT N'  activities: ' + CAST(@@ROWCOUNT AS NVARCHAR(20)) + N' row(s) +3h';
    END;
    UPDATE dbo.alerts SET created_at = DATEADD(HOUR, 3, created_at);
    PRINT N'  alerts: ' + CAST(@@ROWCOUNT AS NVARCHAR(20)) + N' row(s) +3h';
  END;

  COMMIT TRANSACTION;
  PRINT N'Kenya time defaults applied.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  DECLARE @msg NVARCHAR(4000) = ERROR_MESSAGE();
  RAISERROR(N'Failed, nothing changed: %s', 16, 1, @msg);
END CATCH;
GO
