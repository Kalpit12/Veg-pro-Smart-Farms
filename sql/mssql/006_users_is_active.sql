IF COL_LENGTH('dbo.users', 'is_active') IS NULL
BEGIN
  ALTER TABLE dbo.users ADD is_active BIT NOT NULL CONSTRAINT DF_users_is_active DEFAULT 1;
END
GO
