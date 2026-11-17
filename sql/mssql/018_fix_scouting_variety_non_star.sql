/*
  Fix scouting stops saved with the wrong variety (e.g. "Red Calypso" on Galaxy).

  WHY: when a worker's field report was copied into scouting_records, the app
  took the variety from the built-in Star sheet first. For houses not on that
  sheet (GAGH…, BEGH…) it returned the Star default "Red Calypso" instead of
  the greenhouse's own variety (dbo.greenhouses.crop_type).

  WHAT IT DOES (only for greenhouses whose name does NOT start with STGH):
    1. Adds any greenhouse crop_type missing from dbo.crop_varieties.
    2. Sets scouting_records.variety_id to the greenhouse's own variety where
       it differs. Star (STGH…) houses are not touched.

  HOW TO RUN (SSMS, database Scouting)
    1. Run as-is            -> PREVIEW: lists the records that would change.
    2. Set @Confirm = 1 and run again. Safe to re-run (only fixes mismatches).
*/
USE Scouting;
GO
SET NOCOUNT ON;

DECLARE @Confirm BIT = 0;  /* 1 = apply */

/* Preview: records whose variety differs from their greenhouse's variety */
SELECT f.name AS farm, g.name AS greenhouse, g.crop_type AS correct_variety,
       v.name AS saved_variety, COUNT(*) AS records
FROM dbo.scouting_records r
JOIN dbo.greenhouses g ON g.id = r.greenhouse_id
JOIN dbo.farms f       ON f.id = g.farm_id
LEFT JOIN dbo.crop_varieties v ON v.id = r.variety_id
WHERE g.name NOT LIKE N'STGH%'
  AND NULLIF(LTRIM(RTRIM(g.crop_type)), N'') IS NOT NULL
  AND ISNULL(v.name, N'') <> LTRIM(RTRIM(g.crop_type))
GROUP BY f.name, g.name, g.crop_type, v.name
ORDER BY f.name, g.name;

IF @Confirm = 0
BEGIN
  PRINT N'Preview only. Set @Confirm = 1 and run again.';
  RETURN;
END;

BEGIN TRY
  BEGIN TRANSACTION;

  /* 1. Make sure every non-Star greenhouse variety exists in the catalog */
  DECLARE @cat UNIQUEIDENTIFIER =
    (SELECT TOP 1 v.category_id FROM dbo.crop_varieties v
     GROUP BY v.category_id ORDER BY COUNT(*) DESC);
  IF @cat IS NULL SET @cat = (SELECT TOP 1 id FROM dbo.crop_categories ORDER BY name);

  INSERT INTO dbo.crop_varieties (id, category_id, name)
  SELECT NEWID(), @cat, x.crop
  FROM (SELECT DISTINCT LTRIM(RTRIM(g.crop_type)) AS crop
        FROM dbo.greenhouses g
        WHERE g.name NOT LIKE N'STGH%'
          AND NULLIF(LTRIM(RTRIM(g.crop_type)), N'') IS NOT NULL) x
  WHERE @cat IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM dbo.crop_varieties v WHERE v.name = x.crop);
  PRINT N'Varieties added to catalog: ' + CAST(@@ROWCOUNT AS NVARCHAR(20));

  /* 2. Point the records at their greenhouse's own variety */
  UPDATE r
  SET r.variety_id  = vc.id,
      r.category_id = vc.category_id
  FROM dbo.scouting_records r
  JOIN dbo.greenhouses g ON g.id = r.greenhouse_id
  CROSS APPLY (SELECT TOP 1 v.id, v.category_id
               FROM dbo.crop_varieties v
               WHERE v.name = LTRIM(RTRIM(g.crop_type))) vc
  WHERE g.name NOT LIKE N'STGH%'
    AND r.variety_id <> vc.id;
  PRINT N'Scouting records corrected: ' + CAST(@@ROWCOUNT AS NVARCHAR(20));

  COMMIT TRANSACTION;
  PRINT N'Variety fix complete.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  DECLARE @msg NVARCHAR(4000) = ERROR_MESSAGE();
  RAISERROR(N'Failed, nothing changed: %s', 16, 1, @msg);
END CATCH;
GO
