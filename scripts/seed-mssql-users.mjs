/**
 * Create VegPro demo logins in MS SQL (run after 001_schema.sql, on VPN).
 * Usage: node scripts/seed-mssql-users.mjs
 * Optional: SEED_PASSWORD in .env.local (default VegPro2026!)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import sql from "mssql";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

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

const pool = await sql.connect({
  server: process.env.MSSQL_SERVER,
  port: process.env.MSSQL_PORT ? Number(process.env.MSSQL_PORT) : 1433,
  database: process.env.MSSQL_DATABASE ?? "Scouting",
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT !== "false",
    trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE !== "false",
  },
});

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
