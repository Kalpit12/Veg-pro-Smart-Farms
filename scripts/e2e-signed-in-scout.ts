/**
 * Signed-in E2E: worker login → round → scouting stop → manager reads same row.
 * Run: npx tsx scripts/e2e-signed-in-scout.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Step = { step: string; ok: boolean; detail: string };

const steps: Step[] = [];
const DEMO_PASSWORD = "VegPro2026!";

function log(step: string, ok: boolean, detail: string) {
  steps.push({ step, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`[${mark}] ${step}: ${detail}`);
}

function loadSupabaseEnv() {
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      env[k] = v;
    }
  } catch {
    /* optional */
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return { url, key };
}

async function signIn(
  client: SupabaseClient,
  email: string,
): Promise<string | null> {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: DEMO_PASSWORD,
  });
  if (error || !data.user) {
    log(`Sign in ${email}`, false, error?.message ?? "no user");
    return null;
  }
  log(`Sign in ${email}`, true, `user ${data.user.id.slice(0, 8)}…`);
  return data.user.id;
}

async function main() {
  const { url, key } = loadSupabaseEnv();
  if (!url || !key) {
    log("Env", false, "Missing NEXT_PUBLIC_SUPABASE_URL or anon/publishable key");
    process.exit(1);
  }

  const marker = `E2E_AGENT_${Date.now()}`;
  console.log(`\n=== Signed-in scouting E2E (marker: ${marker}) ===\n`);

  const workerClient = createClient(url, key);
  const workerId = await signIn(workerClient, "worker@vegpro.com");
  if (!workerId) process.exit(1);

  const { data: profile, error: profileErr } = await workerClient
    .from("users")
    .select("id, role, full_name")
    .eq("id", workerId)
    .single();
  log(
    "Worker profile (RLS)",
    !profileErr && profile?.role === "worker",
    profileErr?.message ?? `role=${profile?.role}`,
  );
  if (profileErr || profile?.role !== "worker") process.exit(1);

  const { data: greenhouse, error: ghErr } = await workerClient
    .from("greenhouses")
    .select("id, name, farm_id, latitude, longitude")
    .eq("name", "STGH01A")
    .single();
  log(
    "Read greenhouse STGH01A",
    !ghErr && Boolean(greenhouse),
    ghErr?.message ?? `${greenhouse?.name} gps=${greenhouse?.latitude != null}`,
  );
  if (ghErr || !greenhouse) process.exit(1);

  const { data: cat, error: catErr } = await workerClient
    .from("crop_categories")
    .select("id, name")
    .eq("name", "Cut Rose")
    .maybeSingle();
  const { data: variety, error: varErr } = await workerClient
    .from("crop_varieties")
    .select("id, name, category_id")
    .eq("name", "Red Calypso")
    .eq("category_id", cat?.id ?? "")
    .maybeSingle();
  log(
    "Master data (category + variety)",
    !catErr && !varErr && Boolean(cat && variety),
    catErr?.message ?? varErr?.message ?? `${cat?.name} / ${variety?.name}`,
  );
  if (!cat || !variety) process.exit(1);

  const { data: existingRound } = await workerClient
    .from("scouting_rounds")
    .select("id")
    .eq("scout_id", workerId)
    .eq("status", "active")
    .maybeSingle();

  let roundId = existingRound?.id as string | undefined;
  if (!roundId) {
    const { data: newRound, error: roundErr } = await workerClient
      .from("scouting_rounds")
      .insert({
        scout_id: workerId,
        farm_id: greenhouse.farm_id,
        greenhouse_id: greenhouse.id,
        status: "active",
      })
      .select("id")
      .single();
    roundId = newRound?.id;
    log("Start scouting round", !roundErr && Boolean(roundId), roundErr?.message ?? roundId ?? "");
  } else {
    log("Start scouting round", true, `reused active round ${roundId.slice(0, 8)}…`);
  }
  if (!roundId) process.exit(1);

  const lat = greenhouse.latitude ?? -1.017;
  const lng = greenhouse.longitude ?? 37.074;
  const recordedAt = new Date().toISOString();

  const { data: record, error: recErr } = await workerClient
    .from("scouting_records")
    .insert({
      scout_id: workerId,
      farm_id: greenhouse.farm_id,
      greenhouse_id: greenhouse.id,
      category_id: cat.id,
      variety_id: variety.id,
      beds: 11,
      column_no: 3,
      bay_no: 4,
      issue_type: "pest",
      issue_name: "E2E False Codling Moth",
      rating: 3,
      round_id: roundId,
      latitude: lat,
      longitude: lng,
      notes: marker,
      recorded_at: recordedAt,
    })
    .select("id, greenhouse_id, column_no, bay_no, notes")
    .single();

  log(
    "Worker save scouting stop",
    !recErr && Boolean(record),
    recErr?.message ?? `record ${record?.id?.slice(0, 8)}… col ${record?.column_no} bay ${record?.bay_no}`,
  );
  if (recErr || !record) process.exit(1);

  await workerClient.auth.signOut();

  const managerClient = createClient(url, key);
  const managerId = await signIn(managerClient, "manager@vegpro.com");
  if (!managerId) process.exit(1);

  const { data: mgrProfile, error: mgrProfErr } = await managerClient
    .from("users")
    .select("role")
    .eq("id", managerId)
    .single();
  log(
    "Manager profile",
    !mgrProfErr && mgrProfile?.role === "supervisor",
    mgrProfErr?.message ?? `role=${mgrProfile?.role}`,
  );

  const { data: managerRow, error: mgrReadErr } = await managerClient
    .from("scouting_records")
    .select(
      `id, notes, issue_name, column_no, bay_no, recorded_at,
      greenhouses(name),
      users:scout_id(full_name)`,
    )
    .eq("id", record.id)
    .single();

  log(
    "Manager sees worker stop",
    !mgrReadErr && managerRow?.notes === marker,
    mgrReadErr?.message ??
      `notes match=${managerRow?.notes === marker} gh=${(managerRow as { greenhouses?: { name?: string } })?.greenhouses?.name}`,
  );

  const { data: recent, error: recentErr } = await managerClient
    .from("scouting_records")
    .select("id, notes, recorded_at")
    .order("recorded_at", { ascending: false })
    .limit(5);

  const inRecent = Boolean(recent?.some((r) => r.notes === marker));
  log(
    "Manager recent list includes stop",
    !recentErr && inRecent,
    recentErr?.message ?? `top-${recent?.length ?? 0} contains marker=${inRecent}`,
  );

  // Cleanup test row (worker session again)
  await managerClient.auth.signOut();
  const workerCleanup = createClient(url, key);
  await signIn(workerCleanup, "worker@vegpro.com");
  const { error: delErr } = await workerCleanup
    .from("scouting_records")
    .delete()
    .eq("id", record.id);
  log(
    "Cleanup test record",
    !delErr,
    delErr?.message ?? "deleted",
  );
  await workerCleanup.auth.signOut();

  const failed = steps.filter((s) => !s.ok).length;
  console.log(`\n=== Result: ${failed === 0 ? "ALL PASSED" : `${failed} FAILED`} (${steps.length} steps) ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

void main();
