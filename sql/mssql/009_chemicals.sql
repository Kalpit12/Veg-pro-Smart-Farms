IF OBJECT_ID(N'dbo.chemicals', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.chemicals (
    id                UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_chemicals_id DEFAULT NEWSEQUENTIALID(),
    name              NVARCHAR(200)    NOT NULL,
    active_ingredient NVARCHAR(200)    NULL,
    is_active         BIT              NOT NULL CONSTRAINT DF_chemicals_active DEFAULT 1,
    created_at        DATETIME2(3)     NOT NULL CONSTRAINT DF_chemicals_created DEFAULT SYSUTCDATETIME(),
    updated_at        DATETIME2(3)     NOT NULL CONSTRAINT DF_chemicals_updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_chemicals PRIMARY KEY (id)
  );

  CREATE UNIQUE INDEX UX_chemicals_name_lower ON dbo.chemicals (LOWER(LTRIM(RTRIM(name))));
END;
