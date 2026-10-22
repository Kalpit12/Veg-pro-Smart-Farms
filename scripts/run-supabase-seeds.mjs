/**
 * Apply Supabase seed SQL (remote project).
 *
 * Prerequisites:
 * - .env.local with NEXT_PUBLIC_SUPABASE_URL
 * - Supabase CLI logged in: npx supabase login
 *   OR set SUPABASE_ACCESS_TOKEN
 *
 * Optional: SUPABASE_DB_URL (postgres connection string) skips Management API.
 *
 * Usage: node scripts/run-supabase-seeds.mjs
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvLocal } from "./mssql-connect.mjs";

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const refMatch = url.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectRef = process.env.SUPABASE_PROJECT_REF ?? refMatch?.[1];

const seedFiles = [
  "supabase/migrations/007_seed_bemack.sql",
  "supabase/migrations/016_seed_star_farm.sql",
  "supabase/migrations/012_sample_bemack_demo.sql",
  "supabase/migrations/017_seed_five_worker_star_flow.sql",
  "supabase/link-auth-users.sql",
];

function runQuery(file) {
  const full = resolve(process.cwd(), file);
  if (!existsSync(full)) {
    console.error(`Missing ${file}`);
    process.exit(1);
  }
  console.log(`\n>> ${file}`);
  const args = ["supabase", "db", "query", "-f", full, "--yes"];
  if (process.env.SUPABASE_DB_URL) {
    args.push("--db-url", process.env.SUPABASE_DB_URL);
  } else if (projectRef) {
    args.push("--linked", "--project-ref", projectRef);
  } else {
    console.error(
      "Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_PROJECT_REF) or SUPABASE_DB_URL in .env.local",
    );
    process.exit(1);
  }
  const r = spawnSync("npx", args, {
    stdio: "inherit",
    shell: true,
    cwd: process.cwd(),
    env: process.env,
  });
  if (r.status !== 0) {
    console.error(`Failed on ${file}`);
    process.exit(r.status ?? 1);
  }
  console.log("   OK");
}

if (!projectRef && !process.env.SUPABASE_DB_URL) {
  console.error("Could not resolve Supabase project ref from NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

console.log(
  projectRef
    ? `Seeding Supabase project ${projectRef}…`
    : "Seeding via SUPABASE_DB_URL…",
);

for (const file of seedFiles) {
  runQuery(file);
}

console.log("\nSupabase seed scripts finished.");
