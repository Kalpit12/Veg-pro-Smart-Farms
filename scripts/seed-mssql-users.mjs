/**
 * Create VegPro demo logins in MS SQL (run after 001_schema.sql, on VPN).
 * Usage: node scripts/seed-mssql-users.mjs
 * Optional: SEED_PASSWORD in .env.local (default VegPro2026!)
 */
import bcrypt from "bcryptjs";
import { connectMssql, loadEnvLocal } from "./mssql-connect.mjs";

loadEnvLocal();

const password = process.env.SEED_PASSWORD ?? "VegPro2026!";
const hash = await bcrypt.hash(password, 10);

const users = [
  {
    id: "de8dcff5-7166-406a-b76a-d2ddda7ab8d2",
    email: "admin@vegpro.com",
    full_name: "Admin User",
    phone: "+919000000001",
    role: "admin",
  },
  {
    id: "c3d4e5f6-0001-4001-8001-000000000001",
    email: "manager@vegpro.com",
    full_name: "Farm Manager",
    phone: "+254700000002",
    role: "supervisor",
  },
  {
    id: "49b389f8-8113-4773-b92c-b52c498284a2",
    email: "worker@vegpro.com",
    full_name: "Worker User",
    phone: "+919000000003",
    role: "worker",
  },
];

const { sql, pool } = await connectMssql();

for (const u of users) {
  await pool
    .request()
    .input("id", sql.UniqueIdentifier, u.id)
    .input("email", sql.NVarChar(320), u.email)
    .input("full_name", sql.NVarChar(200), u.full_name)
    .input("phone", sql.NVarChar(40), u.phone)
    .input("role", sql.NVarChar(20), u.role)
    .input("password_hash", sql.NVarChar(255), hash)
    .query(`
      MERGE dbo.users AS t
      USING (SELECT @id AS id) AS s ON t.id = s.id
      WHEN MATCHED THEN
        UPDATE SET email = @email, full_name = @full_name, phone = @phone, role = @role, password_hash = @password_hash
      WHEN NOT MATCHED THEN
        INSERT (id, email, full_name, phone, role, password_hash)
        VALUES (@id, @email, @full_name, @phone, @role, @password_hash);
    `);
  console.log(`Upserted ${u.email} (${u.role})`);
}

console.log(`Password for all seeded users: ${password}`);
await pool.close();
