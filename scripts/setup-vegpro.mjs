/**
 * VegPro FDB setup: test DB → migrations → seed users.
 * Prerequisites: VPN, .env.local MSSQL_* filled in.
 */
import { spawnSync } from "node:child_process";

function run(cmd, args) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: true, cwd: process.cwd() });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("npm", ["run", "test:mssql"]);
run("node", ["scripts/apply-mssql-migrations.mjs"]);
run("npm", ["run", "seed:mssql-users"]);
console.log("\nSetup complete. Start app: npm run dev");
console.log("Login: worker@vegpro.com / VegPro2026! (after seed)");
