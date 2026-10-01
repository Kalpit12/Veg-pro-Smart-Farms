/*
  Demo app logins for VegPro scouting.
  Run in SSMS on database Scouting, after 001_schema.sql.
  Password for all three accounts: VegPro2026!
*/
SET NOCOUNT ON;

DECLARE @hash NVARCHAR(255) = N'$2b$10$cJL4UBTuVTRcdy4JDmqZeOcZo61EAgv2.Wj0mt/WDaAB4JHtvXc42';

MERGE dbo.users AS t
USING (SELECT
  CAST('de8dcff5-7166-406a-b76a-d2ddda7ab8d2' AS UNIQUEIDENTIFIER) AS id,
  N'admin@vegpro.com' AS email,
  N'Admin User' AS full_name,
  N'+919000000001' AS phone,
  N'admin' AS role
) AS s ON t.id = s.id
WHEN MATCHED THEN
  UPDATE SET email = s.email, full_name = s.full_name, phone = s.phone, role = s.role, password_hash = @hash
WHEN NOT MATCHED THEN
  INSERT (id, email, full_name, phone, role, password_hash)
  VALUES (s.id, s.email, s.full_name, s.phone, s.role, @hash);

MERGE dbo.users AS t
USING (SELECT
  CAST('c3d4e5f6-0001-4001-8001-000000000001' AS UNIQUEIDENTIFIER) AS id,
  N'manager@vegpro.com' AS email,
  N'Farm Manager' AS full_name,
  N'+254700000002' AS phone,
  N'supervisor' AS role
) AS s ON t.id = s.id
WHEN MATCHED THEN
  UPDATE SET email = s.email, full_name = s.full_name, phone = s.phone, role = s.role, password_hash = @hash
WHEN NOT MATCHED THEN
  INSERT (id, email, full_name, phone, role, password_hash)
  VALUES (s.id, s.email, s.full_name, s.phone, s.role, @hash);

MERGE dbo.users AS t
USING (SELECT
  CAST('49b389f8-8113-4773-b92c-b52c498284a2' AS UNIQUEIDENTIFIER) AS id,
  N'worker@vegpro.com' AS email,
  N'Worker User' AS full_name,
  N'+919000000003' AS phone,
  N'worker' AS role
) AS s ON t.id = s.id
WHEN MATCHED THEN
  UPDATE SET email = s.email, full_name = s.full_name, phone = s.phone, role = s.role, password_hash = @hash
WHEN NOT MATCHED THEN
  INSERT (id, email, full_name, phone, role, password_hash)
  VALUES (s.id, s.email, s.full_name, s.phone, s.role, @hash);
