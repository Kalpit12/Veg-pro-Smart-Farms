/*
  Merge duplicate greenhouses (same farm + same name, e.g. GAGH17A x2).

  For each duplicate set it KEEPS one row (the one with most scouting data,
  then the one with GPS coordinates, then the oldest) and:
    - moves every row that points at the extra copy (scouting_records,
      scouting_rounds, infestation_hotspots, spray_treatments, activities,
      qr_codes, and any other dbo table with a greenhouse_id column)
      onto the kept greenhouse
    - moves staff "Monitored sites" access onto the kept greenhouse
    - deletes the extra greenhouse row
    - adds a unique index so the same farm can't get the same name twice again

  HOW TO RUN (SSMS, database Scouting):
    1. Run as-is first  -> PREVIEW only, shows what will be merged. Nothing changes.
    2. Optional backup:
         BACKUP DATABASE Scouting TO DISK = N'D:\Backups\Scouting_before_gh_merge.bak' WITH INIT;
    3. Set @Confirm = 1 below and run again.
    4. Re-run the check: should return no rows.
         SELECT farm_id, name, COUNT(*) FROM dbo.greenhouses GROUP BY farm_id, name HAVING COUNT(*) > 1;
*/
USE Scouting;
GO
SET NOCOUNT ON;

DECLARE @Confirm BIT = 0;   /* 0 = preview only, 1 = merge */

IF OBJECT_ID('tempdb..#gh_map') IS NOT NULL DROP TABLE #gh_map;

;WITH usage AS (
  SELECT g.id, g.farm_id, LTRIM(RTRIM(g.name)) AS clean_name, g.latitude, g.longitude, g.created_at,
         ISNULL(rc.c, 0) + ISNULL(sr.c, 0) AS used_rows
  FROM dbo.greenhouses g
  LEFT JOIN (SELECT greenhouse_id, COUNT(*) AS c FROM dbo.scouting_records GROUP BY greenhouse_id) rc
         ON rc.greenhouse_id = g.id
  LEFT JOIN (SELECT greenhouse_id, COUNT(*) AS c FROM dbo.scouting_rounds GROUP BY greenhouse_id) sr
         ON sr.greenhouse_id = g.id
),
ranked AS (
  SELECT *,
         ROW_NUMBER() OVER (
           PARTITION BY farm_id, clean_name
           ORDER BY used_rows DESC,
                    CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 0 ELSE 1 END,
                    created_at, id
         ) AS rn
  FROM usage
)
SELECT d.id AS dup_id, k.id AS keep_id, d.farm_id, d.clean_name AS name, d.used_rows AS dup_used_rows
INTO #gh_map
FROM ranked d
INNER JOIN ranked k ON k.farm_id = d.farm_id AND k.clean_name = d.clean_name AND k.rn = 1
WHERE d.rn > 1;

IF NOT EXISTS (SELECT 1 FROM #gh_map)
BEGIN
  PRINT N'No duplicate greenhouses found. Nothing to do.';
  RETURN;
END;

/* --- Preview --- */
SELECT f.name AS farm, m.name AS greenhouse, m.keep_id, m.dup_id AS remove_id,
       m.dup_used_rows AS scouting_rows_moving
FROM #gh_map m
INNER JOIN dbo.farms f ON f.id = m.farm_id
ORDER BY f.name, m.name;

IF @Confirm = 0
BEGIN
  PRINT N'Preview only. Set @Confirm = 1 and run again to merge.';
  RETURN;
END;

BEGIN TRY
  BEGIN TRANSACTION;

  /* Monitored-sites access (PK user_id + greenhouse_id): copy to keep, then drop dup rows */
  IF OBJECT_ID(N'dbo.supervisor_greenhouse_access', N'U') IS NOT NULL
  BEGIN
    INSERT INTO dbo.supervisor_greenhouse_access (user_id, greenhouse_id)
    SELECT DISTINCT a.user_id, m.keep_id
    FROM dbo.supervisor_greenhouse_access a
    INNER JOIN #gh_map m ON m.dup_id = a.greenhouse_id
    WHERE NOT EXISTS (
      SELECT 1 FROM dbo.supervisor_greenhouse_access a2
      WHERE a2.user_id = a.user_id AND a2.greenhouse_id = m.keep_id
    );

    DELETE a
    FROM dbo.supervisor_greenhouse_access a
    INNER JOIN #gh_map m ON m.dup_id = a.greenhouse_id;
  END;

  /* Every other dbo table with a greenhouse_id column */
  DECLARE @t SYSNAME, @sql NVARCHAR(MAX), @n INT;
  DECLARE tcur CURSOR LOCAL FAST_FORWARD FOR
    SELECT t.name
    FROM sys.columns c
    INNER JOIN sys.tables t ON t.object_id = c.object_id
    WHERE SCHEMA_NAME(t.schema_id) = N'dbo'
      AND c.name = N'greenhouse_id'
      AND TYPE_NAME(c.user_type_id) = N'uniqueidentifier'
      AND t.name NOT IN (N'greenhouses', N'supervisor_greenhouse_access');
  OPEN tcur;
  FETCH NEXT FROM tcur INTO @t;
  WHILE @@FETCH_STATUS = 0
  BEGIN
    SET @sql = N'UPDATE x SET x.greenhouse_id = m.keep_id FROM dbo.' + QUOTENAME(@t)
             + N' x INNER JOIN #gh_map m ON m.dup_id = x.greenhouse_id; SET @n = @@ROWCOUNT;';
    EXEC sp_executesql @sql, N'@n INT OUTPUT', @n = @n OUTPUT;
    PRINT N'  ' + @t + N': ' + CAST(@n AS NVARCHAR(20)) + N' row(s) moved';
    FETCH NEXT FROM tcur INTO @t;
  END;
  CLOSE tcur;
  DEALLOCATE tcur;

  DELETE g
  FROM dbo.greenhouses g
  INNER JOIN #gh_map m ON m.dup_id = g.id;
  PRINT N'Removed duplicate greenhouses: ' + CAST(@@ROWCOUNT AS NVARCHAR(20));

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  DECLARE @msg NVARCHAR(4000) = ERROR_MESSAGE();
  RAISERROR(N'Merge failed, nothing changed: %s', 16, 1, @msg);
  RETURN;
END CATCH;

/* Stop it happening again */
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'UX_greenhouses_farm_name' AND object_id = OBJECT_ID(N'dbo.greenhouses')
)
  CREATE UNIQUE INDEX UX_greenhouses_farm_name ON dbo.greenhouses (farm_id, name);

PRINT N'Duplicate greenhouse merge complete.';
GO
