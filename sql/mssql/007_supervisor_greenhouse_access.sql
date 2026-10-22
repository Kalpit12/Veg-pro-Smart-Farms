IF OBJECT_ID(N'dbo.supervisor_greenhouse_access', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.supervisor_greenhouse_access (
    user_id       UNIQUEIDENTIFIER NOT NULL,
    greenhouse_id UNIQUEIDENTIFIER NOT NULL,
    created_at    DATETIME2(3)     NOT NULL CONSTRAINT DF_supervisor_gh_access_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_supervisor_greenhouse_access PRIMARY KEY (user_id, greenhouse_id),
    CONSTRAINT FK_supervisor_gh_access_user FOREIGN KEY (user_id) REFERENCES dbo.users (id) ON DELETE CASCADE,
    CONSTRAINT FK_supervisor_gh_access_gh FOREIGN KEY (greenhouse_id) REFERENCES dbo.greenhouses (id) ON DELETE CASCADE
  );
END
GO

-- Existing supervisors: assign all greenhouses until an admin narrows access.
INSERT INTO dbo.supervisor_greenhouse_access (user_id, greenhouse_id)
SELECT u.id, g.id
FROM dbo.users u
CROSS JOIN dbo.greenhouses g
WHERE u.role = N'supervisor'
  AND NOT EXISTS (
    SELECT 1 FROM dbo.supervisor_greenhouse_access a WHERE a.user_id = u.id
  );
GO
