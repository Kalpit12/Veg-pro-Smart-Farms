IF OBJECT_ID(N'dbo.chemicals', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.chemicals (
    id                UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_chemicals_id DEFAULT NEWSEQUENTIALID(),
    name              NVARCHAR(200)    NOT NULL,
    active_ingredient NVARCHAR(200)    NULL,
    is_active         BIT              NOT NULL CONSTRAINT DF_chemicals_active DEFAULT 1,
    created_at        DATETIME2(3)     NOT NULL CONSTRAINT DF_chemicals_created DEFAULT SYSUTCDATETIME(),
    updated_at        DATETIME2(3)     NOT NULL CONSTRAINT DF_chemicals_updated DEFAULT SYSUTCDATETIME(),
    name_key          AS LOWER(LTRIM(RTRIM([name]))) PERSISTED,
    CONSTRAINT PK_chemicals PRIMARY KEY (id)
  );
END;

IF OBJECT_ID(N'dbo.chemicals', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.chemicals', N'name_key') IS NULL
BEGIN
  ALTER TABLE dbo.chemicals
    ADD name_key AS LOWER(LTRIM(RTRIM([name]))) PERSISTED;
END;

IF OBJECT_ID(N'dbo.chemicals', N'U') IS NOT NULL
   AND NOT EXISTS (
     SELECT 1
     FROM sys.indexes
     WHERE name = N'UX_chemicals_name_lower'
       AND object_id = OBJECT_ID(N'dbo.chemicals')
   )
BEGIN
  CREATE UNIQUE INDEX UX_chemicals_name_lower ON dbo.chemicals (name_key);
END;
