-- Fallback if 009_chemicals.sql fails: paste in SSMS with database Scouting selected.
USE Scouting;
GO

IF OBJECT_ID(N'dbo.chemicals', N'U') IS NULL
CREATE TABLE dbo.chemicals (
  id                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
  name              NVARCHAR(200)    NOT NULL,
  active_ingredient NVARCHAR(200)    NULL,
  is_active         BIT              NOT NULL DEFAULT 1,
  created_at        DATETIME2(3)     NOT NULL DEFAULT SYSUTCDATETIME(),
  updated_at        DATETIME2(3)     NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
