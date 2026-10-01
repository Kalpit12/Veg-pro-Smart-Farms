/*
  Activities + QR codes (optional modules) — run after 001_schema.sql
*/
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.activities', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.activities (
    id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_activities_id DEFAULT NEWSEQUENTIALID(),
    worker_id       UNIQUEIDENTIFIER NOT NULL,
    farm_id         UNIQUEIDENTIFIER NOT NULL,
    greenhouse_id   UNIQUEIDENTIFIER NULL,
    activity_type   NVARCHAR(100)    NOT NULL,
    notes           NVARCHAR(MAX)    NULL,
    image_url       NVARCHAR(1000)   NULL,
    gps_location    NVARCHAR(200)    NULL,
    status          NVARCHAR(20)     NOT NULL CONSTRAINT CK_activities_status CHECK (status IN (N'pending', N'approved', N'rejected')),
    created_at      DATETIME2(3)     NOT NULL CONSTRAINT DF_activities_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_activities PRIMARY KEY (id),
    CONSTRAINT FK_activities_worker FOREIGN KEY (worker_id) REFERENCES dbo.users (id),
    CONSTRAINT FK_activities_farm FOREIGN KEY (farm_id) REFERENCES dbo.farms (id),
    CONSTRAINT FK_activities_gh FOREIGN KEY (greenhouse_id) REFERENCES dbo.greenhouses (id)
  );
END;

IF OBJECT_ID(N'dbo.qr_codes', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.qr_codes (
    id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_qr_codes_id DEFAULT NEWSEQUENTIALID(),
    farm_id         UNIQUEIDENTIFIER NOT NULL,
    greenhouse_id   UNIQUEIDENTIFIER NULL,
    qr_value        NVARCHAR(500)    NOT NULL,
    created_at      DATETIME2(3)     NOT NULL CONSTRAINT DF_qr_codes_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_qr_codes PRIMARY KEY (id),
    CONSTRAINT UQ_qr_codes_value UNIQUE (qr_value),
    CONSTRAINT FK_qr_codes_farm FOREIGN KEY (farm_id) REFERENCES dbo.farms (id),
    CONSTRAINT FK_qr_codes_gh FOREIGN KEY (greenhouse_id) REFERENCES dbo.greenhouses (id)
  );
END;

PRINT N'Activities schema applied (003).';
