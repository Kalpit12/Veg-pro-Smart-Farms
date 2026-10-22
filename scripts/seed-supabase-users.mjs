/**
 * Upsert demo app users in Supabase public.users (service role).
 * Does not replace full SQL seeds — run npm run seed:supabase after `supabase login`.
 *
 * Usage: node scripts/seed-supabase-users.mjs
 */
import { loadEnvLocal } from "./mssql-connect.mjs";

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

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

const res = await fetch(`${url}/rest/v1/users?on_conflict=id`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify(users),
});

if (!res.ok) {
  const body = await res.text();
  console.error("users upsert failed:", res.status, body);
  process.exit(1);
}

console.log("Upserted demo users in public.users (admin, manager, worker).");
