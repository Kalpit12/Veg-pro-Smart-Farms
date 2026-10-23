-- Kenya (EAT, UTC+3) wall-clock timestamps for new SQL defaults.
-- Existing rows keep prior UTC values; app writes Kenya time from 2026-10 onward.
USE Scouting;
GO

IF OBJECT_ID(N'dbo.KenyaLocalNow', N'FN') IS NULL
EXEC(N'
CREATE FUNCTION dbo.KenyaLocalNow()
RETURNS DATETIME2(3)
AS
BEGIN
  RETURN CAST(DATEADD(HOUR, 3, SYSUTCDATETIME()) AS DATETIME2(3));
END;
');
GO
