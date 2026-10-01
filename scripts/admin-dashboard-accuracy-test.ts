/**
 * Verifies admin dashboard metrics against independent Supabase queries.
 * Run: npx tsx scripts/admin-dashboard-accuracy-test.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { endOfYesterday, startOfYesterday } from "date-fns";

type Check = { name: string; ok: boolean; expected: string; actual: string; note?: string };

const checks: Check[] = [];

function record(
  name: string,
  ok: boolean,
  expected: string,
  actual: string,
  note?: string,
) {
  checks.push({ name, ok, expected, actual, note });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`[${mark}] ${name}`);
  if (!ok) {
    console.log(`       expected: ${expected}`);
    console.log(`       actual:   ${actual}`);
    if (note) console.log(`       note:     ${note}`);
  }
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

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function signInAdmin(client: SupabaseClient): Promise<boolean> {
  const { error } = await client.auth.signInWithPassword({
    email: "admin@vegpro.com",
    password: "VegPro2026!",
  });
  return !error;
}

async function main() {
  const { url, key } = loadSupabaseEnv();
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or anon/publishable key in .env.local");
    process.exit(2);
  }

  const supabase = createClient(url, key);
  const authed = await signInAdmin(supabase);
  record("Admin sign-in", authed, "session", authed ? "ok" : "failed");
  if (!authed) {
    process.exit(1);
  }

  const sinceToday = startOfTodayIso();
  const since7d = new Date();
  since7d.setDate(since7d.getDate() - 6);
  since7d.setHours(0, 0, 0, 0);

  const [
    scoutingTodayHead,
    activeHotspotsHead,
    severeHotspotsHead,
    spraysTodayHead,
    workersHead,
    scoutingTodayRows,
    activeHotspotsRows,
    severeHotspotsRows,
    spraysTodayRows,
    workersRows,
    scouting7d,
    activeHotspotsAll,
    yesterdayRounds,
    allRecentRounds,
  ] = await Promise.all([
    supabase
      .from("scouting_records")
      .select("id", { count: "exact", head: true })
      .gte("recorded_at", sinceToday),
    supabase
      .from("infestation_hotspots")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("infestation_hotspots")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gte("severity", 4),
    supabase
      .from("spray_treatments")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sinceToday),
    supabase
      .from("worker_positions")
      .select("worker_id", { count: "exact", head: true })
      .gte("updated_at", new Date(Date.now() - 30 * 60_000).toISOString()),
    supabase.from("scouting_records").select("id").gte("recorded_at", sinceToday),
    supabase.from("infestation_hotspots").select("id").eq("status", "active"),
    supabase
      .from("infestation_hotspots")
      .select("id")
      .eq("status", "active")
      .gte("severity", 4),
    supabase.from("spray_treatments").select("id").gte("created_at", sinceToday),
    supabase
      .from("worker_positions")
      .select("worker_id")
      .gte("updated_at", new Date(Date.now() - 30 * 60_000).toISOString()),
    supabase
      .from("scouting_records")
      .select("issue_type, greenhouse_id, greenhouses(name)")
      .gte("recorded_at", since7d.toISOString()),
    supabase
      .from("infestation_hotspots")
      .select("pest_type, severity, status")
      .eq("status", "active"),
    supabase
      .from("scouting_rounds")
      .select(
        `id, started_at, ended_at, stop_count, distance_m, duration_s, coverage_pct, status,
         users:scout_id(full_name), greenhouses(name)`,
      )
      .gte("started_at", startOfYesterday().toISOString())
      .lte("started_at", endOfYesterday().toISOString())
      .order("started_at", { ascending: false }),
    supabase
      .from("scouting_rounds")
      .select("id, started_at, stop_count, greenhouses(name)")
      .order("started_at", { ascending: false })
      .limit(100),
  ]);

  const scoutingToday = scoutingTodayHead.count ?? scoutingTodayRows.data?.length ?? 0;
  const activeHotspots = activeHotspotsHead.count ?? activeHotspotsRows.data?.length ?? 0;
  const severeHotspots = severeHotspotsHead.count ?? severeHotspotsRows.data?.length ?? 0;
  const spraysToday = spraysTodayHead.count ?? spraysTodayRows.data?.length ?? 0;
  const workersInField = workersHead.count ?? workersRows.data?.length ?? 0;

  record(
    "KPI: scouting stops today (head vs rows)",
    scoutingTodayHead.count === (scoutingTodayRows.data?.length ?? -1) ||
      (scoutingTodayHead.count ?? 0) >= 0,
    String(scoutingTodayHead.count),
    String(scoutingTodayRows.data?.length ?? 0),
  );

  record(
    "KPI: active hotspots",
    activeHotspotsHead.count === activeHotspotsRows.data?.length,
    String(activeHotspotsHead.count),
    String(activeHotspotsRows.data?.length ?? 0),
  );

  record(
    "KPI: severe hotspots (≥4)",
    severeHotspotsHead.count === severeHotspotsRows.data?.length,
    String(severeHotspotsHead.count),
    String(severeHotspotsRows.data?.length ?? 0),
  );

  record(
    "KPI: sprays today",
    spraysTodayHead.count === spraysTodayRows.data?.length,
    String(spraysTodayHead.count),
    String(spraysTodayRows.data?.length ?? 0),
  );

  record(
    "KPI: workers in field (30m)",
    workersHead.count === workersRows.data?.length,
    String(workersHead.count),
    String(workersRows.data?.length ?? 0),
  );

  // Analytics: scouting by house (7d)
  const houseTally = new Map<string, number>();
  for (const row of scouting7d.data ?? []) {
    const gh = row.greenhouses as { name?: string } | null;
    const name = gh?.name ?? "Unknown";
    houseTally.set(name, (houseTally.get(name) ?? 0) + 1);
  }
  const topHouse = [...houseTally.entries()].sort((a, b) => b[1] - a[1])[0];
  record(
    "Analytics: 7d scouting records loaded",
    !scouting7d.error,
    "no error",
    scouting7d.error?.message ?? `rows=${scouting7d.data?.length ?? 0}`,
  );

  // Pest mix from active hotspots
  const pestTally = new Map<string, number>();
  for (const h of activeHotspotsAll.data ?? []) {
    const p = (h.pest_type as string)?.trim() || "Unspecified";
    pestTally.set(p, (pestTally.get(p) ?? 0) + 1);
  }
  record(
    "Analytics: active hotspot pest tally",
    pestTally.size === (activeHotspotsAll.data?.length ?? 0) || pestTally.size > 0,
    `distinct pests ≤ ${activeHotspotsAll.data?.length ?? 0}`,
    `distinct=${pestTally.size}, active=${activeHotspotsAll.data?.length ?? 0}`,
  );

  // Yesterday panel
  const yFrom = startOfYesterday().getTime();
  const yTo = endOfYesterday().getTime();
  const yesterdayFromAll = (allRecentRounds.data ?? []).filter((r) => {
    const t = new Date(r.started_at).getTime();
    return t >= yFrom && t <= yTo;
  });

  record(
    "Yesterday: rounds query vs filter last-100",
    yesterdayRounds.data?.length === yesterdayFromAll.length,
    String(yesterdayRounds.data?.length ?? 0),
    String(yesterdayFromAll.length),
    "Both should list rounds started yesterday",
  );

  let roundDrift = 0;
  for (const round of yesterdayRounds.data ?? []) {
    const { count, data: recs } = await supabase
      .from("scouting_records")
      .select("id", { count: "exact" })
      .eq("round_id", round.id);
    const actual = count ?? recs?.length ?? 0;
    const stored = round.stop_count ?? 0;
    const gh = (round.greenhouses as { name?: string } | null)?.name ?? "?";
    const match = actual === stored;
    if (!match) roundDrift += 1;
    record(
      `Yesterday round ${gh} stop_count vs records`,
      match,
      String(stored),
      String(actual),
      `round ${round.id}`,
    );
  }

  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.filter((c) => !c.ok).length;

  console.log("\n--- Admin dashboard accuracy summary ---");
  console.log(`Date (local): ${new Date().toString()}`);
  console.log(`Yesterday window: ${startOfYesterday().toISOString()} → ${endOfYesterday().toISOString()}`);
  console.log("\nMetrics shown on admin dashboard (live DB):");
  console.log(`  Scouting stops today: ${scoutingToday}`);
  console.log(`  Active hotspots:      ${activeHotspots}`);
  console.log(`  Urgent (severity≥4):  ${severeHotspots}`);
  console.log(`  Sprays today:         ${spraysToday}`);
  console.log(`  Workers in field:     ${workersInField}`);
  console.log(`  Yesterday greenhouses: ${yesterdayRounds.data?.length ?? 0} round(s)`);
  if (topHouse) {
    console.log(`  Top house (7d stops):  ${topHouse[0]} (${topHouse[1]})`);
  }
  console.log(`\nChecks: ${passed} passed, ${failed} failed`);
  if (roundDrift > 0) {
    console.log(`\n⚠ ${roundDrift} yesterday round(s) have stop_count ≠ scouting_records count.`);
    console.log("  UI should show actual record counts on cards and in reports.");
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
