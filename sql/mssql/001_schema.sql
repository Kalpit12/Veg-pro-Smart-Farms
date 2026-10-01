/*
  VegPro scouting — MS SQL schema (Phase 1)
  Target database: Scouting on FDB (e.g. 192.168.16.14)
  Run once in SSMS while connected to Scouting.
*/
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.users', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.users (
    id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_users_id DEFAULT NEWSEQUENTIALID(),
    email           NVARCHAR(320)    NOT NULL,
    full_name       NVARCHAR(200)    NOT NULL,
    phone           NVARCHAR(40)     NULL,
    role            NVARCHAR(20)     NOT NULL CONSTRAINT CK_users_role CHECK (role IN (N'admin', N'supervisor', N'worker')),
    password_hash   NVARCHAR(255)    NULL,
    created_at      DATETIME2(3)     NOT NULL CONSTRAINT DF_users_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_users PRIMARY KEY (id),
    CONSTRAINT UQ_users_email UNIQUE (email)
  );
END;

IF OBJECT_ID(N'dbo.farms', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.farms (
    id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_farms_id DEFAULT NEWSEQUENTIALID(),
    name        NVARCHAR(200)    NOT NULL,
    location    NVARCHAR(500)    NOT NULL,
    type        NVARCHAR(100)    NOT NULL,
    created_at  DATETIME2(3)     NOT NULL CONSTRAINT DF_farms_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_farms PRIMARY KEY (id)
  );
END;

IF OBJECT_ID(N'dbo.greenhouses', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.greenhouses (
    id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_greenhouses_id DEFAULT NEWSEQUENTIALID(),
    farm_id       UNIQUEIDENTIFIER NOT NULL,
    name          NVARCHAR(200)    NOT NULL,
    crop_type     NVARCHAR(100)    NOT NULL,
    latitude      FLOAT            NULL,
    longitude     FLOAT            NULL,
    area_ha       DECIMAL(10, 4)   NULL,
    area_sqm      DECIMAL(12, 2)   NULL,
    bay_count     SMALLINT         NULL,
    column_count  SMALLINT         NULL,
    created_at    DATETIME2(3)     NOT NULL CONSTRAINT DF_greenhouses_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_greenhouses PRIMARY KEY (id),
    CONSTRAINT FK_greenhouses_farm FOREIGN KEY (farm_id) REFERENCES dbo.farms (id)
  );
END;

IF OBJECT_ID(N'dbo.alerts', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.alerts (
    id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_alerts_id DEFAULT NEWSEQUENTIALID(),
    type        NVARCHAR(100)    NOT NULL,
    message     NVARCHAR(MAX)    NOT NULL,
    status      NVARCHAR(20)     NOT NULL CONSTRAINT CK_alerts_status CHECK (status IN (N'open', N'resolved')),
    created_at  DATETIME2(3)     NOT NULL CONSTRAINT DF_alerts_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_alerts PRIMARY KEY (id)
  );
END;

IF OBJECT_ID(N'dbo.infestation_hotspots', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.infestation_hotspots (
    id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_hotspots_id DEFAULT NEWSEQUENTIALID(),
    farm_id         UNIQUEIDENTIFIER NOT NULL,
    greenhouse_id   UNIQUEIDENTIFIER NULL,
    reported_by     UNIQUEIDENTIFIER NOT NULL,
    latitude        FLOAT            NOT NULL,
    longitude       FLOAT            NOT NULL,
    pest_type       NVARCHAR(100)    NOT NULL,
    problem         NVARCHAR(500)    NOT NULL,
    main_issue      NVARCHAR(200)    NOT NULL,
    severity        SMALLINT         NOT NULL,
    status          NVARCHAR(20)     NOT NULL CONSTRAINT CK_hotspots_status CHECK (status IN (N'active', N'sprayed', N'resolved')),
    created_at      DATETIME2(3)     NOT NULL CONSTRAINT DF_hotspots_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_infestation_hotspots PRIMARY KEY (id),
    CONSTRAINT FK_hotspots_farm FOREIGN KEY (farm_id) REFERENCES dbo.farms (id),
    CONSTRAINT FK_hotspots_gh FOREIGN KEY (greenhouse_id) REFERENCES dbo.greenhouses (id),
    CONSTRAINT FK_hotspots_user FOREIGN KEY (reported_by) REFERENCES dbo.users (id),
    CONSTRAINT CK_hotspots_severity CHECK (severity BETWEEN 1 AND 5)
  );
END;

IF OBJECT_ID(N'dbo.spray_treatments', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.spray_treatments (
    id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_sprays_id DEFAULT NEWSEQUENTIALID(),
    worker_id       UNIQUEIDENTIFIER NOT NULL,
    hotspot_id      UNIQUEIDENTIFIER NULL,
    farm_id         UNIQUEIDENTIFIER NOT NULL,
    greenhouse_id   UNIQUEIDENTIFIER NULL,
    latitude        FLOAT            NOT NULL,
    longitude       FLOAT            NOT NULL,
    product_name    NVARCHAR(200)    NOT NULL,
    notes           NVARCHAR(MAX)    NULL,
    image_url       NVARCHAR(1000)   NULL,
    severity_before SMALLINT         NULL,
    severity_after  SMALLINT         NULL,
    created_at      DATETIME2(3)     NOT NULL CONSTRAINT DF_sprays_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_spray_treatments PRIMARY KEY (id),
    CONSTRAINT FK_sprays_worker FOREIGN KEY (worker_id) REFERENCES dbo.users (id),
    CONSTRAINT FK_sprays_hotspot FOREIGN KEY (hotspot_id) REFERENCES dbo.infestation_hotspots (id),
    CONSTRAINT FK_sprays_farm FOREIGN KEY (farm_id) REFERENCES dbo.farms (id),
    CONSTRAINT FK_sprays_gh FOREIGN KEY (greenhouse_id) REFERENCES dbo.greenhouses (id)
  );
END;

IF OBJECT_ID(N'dbo.worker_positions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.worker_positions (
    worker_id   UNIQUEIDENTIFIER NOT NULL,
    latitude    FLOAT            NOT NULL,
    longitude   FLOAT            NOT NULL,
    updated_at  DATETIME2(3)     NOT NULL CONSTRAINT DF_positions_updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_worker_positions PRIMARY KEY (worker_id),
    CONSTRAINT FK_positions_worker FOREIGN KEY (worker_id) REFERENCES dbo.users (id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID(N'dbo.crop_categories', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.crop_categories (
    id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_crop_cat_id DEFAULT NEWSEQUENTIALID(),
    name        NVARCHAR(200)    NOT NULL,
    created_at  DATETIME2(3)     NOT NULL CONSTRAINT DF_crop_cat_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_crop_categories PRIMARY KEY (id),
    CONSTRAINT UQ_crop_categories_name UNIQUE (name)
  );
END;

IF OBJECT_ID(N'dbo.crop_varieties', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.crop_varieties (
    id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_crop_var_id DEFAULT NEWSEQUENTIALID(),
    category_id UNIQUEIDENTIFIER NOT NULL,
    name        NVARCHAR(200)    NOT NULL,
    created_at  DATETIME2(3)     NOT NULL CONSTRAINT DF_crop_var_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_crop_varieties PRIMARY KEY (id),
    CONSTRAINT FK_crop_varieties_cat FOREIGN KEY (category_id) REFERENCES dbo.crop_categories (id) ON DELETE CASCADE,
    CONSTRAINT UQ_crop_varieties_cat_name UNIQUE (category_id, name)
  );
END;

IF OBJECT_ID(N'dbo.scouting_parameters', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.scouting_parameters (
    id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_scout_param_id DEFAULT NEWSEQUENTIALID(),
    param_key   NVARCHAR(100)    NOT NULL,
    param_group NVARCHAR(20)     NOT NULL CONSTRAINT CK_scout_param_group CHECK (param_group IN (N'pest', N'disease', N'crop_health')),
    name        NVARCHAR(200)    NOT NULL,
    sort_order  SMALLINT         NOT NULL CONSTRAINT DF_scout_param_sort DEFAULT 0,
    created_at  DATETIME2(3)     NOT NULL CONSTRAINT DF_scout_param_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_scouting_parameters PRIMARY KEY (id),
    CONSTRAINT UQ_scouting_parameters_key UNIQUE (param_key)
  );
END;

IF OBJECT_ID(N'dbo.scouting_rounds', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.scouting_rounds (
    id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_scout_round_id DEFAULT NEWSEQUENTIALID(),
    scout_id      UNIQUEIDENTIFIER NOT NULL,
    farm_id       UNIQUEIDENTIFIER NOT NULL,
    greenhouse_id UNIQUEIDENTIFIER NOT NULL,
    status        NVARCHAR(20)     NOT NULL CONSTRAINT CK_scout_round_status CHECK (status IN (N'active', N'completed')),
    started_at    DATETIME2(3)     NOT NULL CONSTRAINT DF_scout_round_started DEFAULT SYSUTCDATETIME(),
    ended_at      DATETIME2(3)     NULL,
    stop_count    SMALLINT         NOT NULL CONSTRAINT DF_scout_round_stops DEFAULT 0,
    distance_m    DECIMAL(12, 2)   NOT NULL CONSTRAINT DF_scout_round_dist DEFAULT 0,
    duration_s    INT              NULL,
    point_count   INT              NOT NULL CONSTRAINT DF_scout_round_pts DEFAULT 0,
    coverage_pct  DECIMAL(5, 2)    NULL,
    created_at    DATETIME2(3)     NOT NULL CONSTRAINT DF_scout_round_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_scouting_rounds PRIMARY KEY (id),
    CONSTRAINT FK_scout_rounds_scout FOREIGN KEY (scout_id) REFERENCES dbo.users (id),
    CONSTRAINT FK_scout_rounds_farm FOREIGN KEY (farm_id) REFERENCES dbo.farms (id),
    CONSTRAINT FK_scout_rounds_gh FOREIGN KEY (greenhouse_id) REFERENCES dbo.greenhouses (id)
  );
END;

IF OBJECT_ID(N'dbo.scouting_records', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.scouting_records (
    id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_scout_rec_id DEFAULT NEWSEQUENTIALID(),
    scout_id        UNIQUEIDENTIFIER NOT NULL,
    farm_id         UNIQUEIDENTIFIER NOT NULL,
    greenhouse_id   UNIQUEIDENTIFIER NOT NULL,
    category_id     UNIQUEIDENTIFIER NOT NULL,
    variety_id      UNIQUEIDENTIFIER NOT NULL,
    round_id        UNIQUEIDENTIFIER NULL,
    beds            SMALLINT         NOT NULL,
    column_no       SMALLINT         NOT NULL,
    bay_no          SMALLINT         NOT NULL,
    issue_type      NVARCHAR(20)     NOT NULL CONSTRAINT CK_scout_rec_issue CHECK (issue_type IN (N'disease', N'pest')),
    issue_name      NVARCHAR(200)    NOT NULL,
    rating          SMALLINT         NULL,
    latitude        FLOAT            NULL,
    longitude       FLOAT            NULL,
    notes           NVARCHAR(MAX)    NULL,
    image_url       NVARCHAR(1000)   NULL,
    recorded_at     DATETIME2(3)     NOT NULL CONSTRAINT DF_scout_rec_recorded DEFAULT SYSUTCDATETIME(),
    created_at      DATETIME2(3)     NOT NULL CONSTRAINT DF_scout_rec_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_scouting_records PRIMARY KEY (id),
    CONSTRAINT FK_scout_rec_scout FOREIGN KEY (scout_id) REFERENCES dbo.users (id),
    CONSTRAINT FK_scout_rec_farm FOREIGN KEY (farm_id) REFERENCES dbo.farms (id),
    CONSTRAINT FK_scout_rec_gh FOREIGN KEY (greenhouse_id) REFERENCES dbo.greenhouses (id),
    CONSTRAINT FK_scout_rec_cat FOREIGN KEY (category_id) REFERENCES dbo.crop_categories (id),
    CONSTRAINT FK_scout_rec_var FOREIGN KEY (variety_id) REFERENCES dbo.crop_varieties (id),
    CONSTRAINT FK_scout_rec_round FOREIGN KEY (round_id) REFERENCES dbo.scouting_rounds (id)
  );
  CREATE INDEX IX_scouting_records_farm_gh ON dbo.scouting_records (farm_id, greenhouse_id, recorded_at DESC);
END;

IF OBJECT_ID(N'dbo.scouting_observations', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.scouting_observations (
    id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_scout_obs_id DEFAULT NEWSEQUENTIALID(),
    record_id     UNIQUEIDENTIFIER NOT NULL,
    parameter_id  UNIQUEIDENTIFIER NOT NULL,
    present       BIT              NOT NULL CONSTRAINT DF_scout_obs_present DEFAULT 0,
    rating        SMALLINT         NULL,
    CONSTRAINT PK_scouting_observations PRIMARY KEY (id),
    CONSTRAINT FK_scout_obs_rec FOREIGN KEY (record_id) REFERENCES dbo.scouting_records (id) ON DELETE CASCADE,
    CONSTRAINT FK_scout_obs_param FOREIGN KEY (parameter_id) REFERENCES dbo.scouting_parameters (id),
    CONSTRAINT UQ_scout_obs_rec_param UNIQUE (record_id, parameter_id)
  );
END;

IF OBJECT_ID(N'dbo.scouting_route_points', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.scouting_route_points (
    id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_route_pt_id DEFAULT NEWSEQUENTIALID(),
    round_id    UNIQUEIDENTIFIER NOT NULL,
    latitude    FLOAT            NOT NULL,
    longitude   FLOAT            NOT NULL,
    accuracy_m  DECIMAL(8, 2)    NULL,
    recorded_at DATETIME2(3)     NOT NULL CONSTRAINT DF_route_pt_recorded DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_scouting_route_points PRIMARY KEY (id),
    CONSTRAINT FK_route_pt_round FOREIGN KEY (round_id) REFERENCES dbo.scouting_rounds (id) ON DELETE CASCADE
  );
  CREATE INDEX IX_scouting_route_points_round ON dbo.scouting_route_points (round_id, recorded_at);
END;

GO
IF OBJECT_ID(N'dbo.trg_scouting_records_round_stop', N'TR') IS NULL
EXEC(N'
CREATE TRIGGER dbo.trg_scouting_records_round_stop
ON dbo.scouting_records
AFTER INSERT
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE r
  SET stop_count = r.stop_count + 1
  FROM dbo.scouting_rounds r
  INNER JOIN inserted i ON i.round_id = r.id
  WHERE i.round_id IS NOT NULL;
END;
');

PRINT N'VegPro scouting MS SQL schema applied (001).';
