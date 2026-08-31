import { createClient } from "@/lib/supabase/client";
import { getHotspotKpis } from "@/services/supabase/infestation-service";
import { getSpraysTodayCount } from "@/services/supabase/spray-service";
import { getWorkersInFieldCount } from "@/services/supabase/position-service";

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getDashboardKpis() {
  const supabase = createClient();

  const farms = await supabase.from("farms").select("id", { count: "exact", head: true });
  const openAlerts = await supabase
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  const since = startOfTodayIso();
  const scoutingToday = await supabase
    .from("scouting_records")
    .select("id", { count: "exact", head: true })
    .gte("recorded_at", since);

  const [hotspots, spraysToday, workersInField] = await Promise.all([
    getHotspotKpis(),
    getSpraysTodayCount(),
    getWorkersInFieldCount(),
  ]);

  if (spraysToday.error) throw spraysToday.error;
  if (workersInField.error) throw workersInField.error;

  return {
    farms: farms.count ?? 0,
    openAlerts: openAlerts.count ?? 0,
    activeHotspots: hotspots.activeHotspots,
    severeHotspots: hotspots.severeHotspots,
    spraysToday: spraysToday.count ?? 0,
    workersInField: workersInField.count ?? 0,
    scoutingStopsToday: scoutingToday.count ?? 0,
  };
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function buildTrendSeries(rows: { created_at: string }[], days = 7) {
  const counts = Array.from({ length: days }, () => 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  rows.forEach((row) => {
    const created = new Date(row.created_at);
    created.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff < days) {
      counts[days - 1 - diff] += 1;
    }
  });

  return counts.map((value, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return {
      day: weekdayLabels[date.getDay()],
      value,
    };
  });
}

export async function getWeeklyInfestationTrends() {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const [reports, sprays, scouting] = await Promise.all([
    supabase
      .from("infestation_hotspots")
      .select("created_at")
      .gte("created_at", since.toISOString()),
    supabase
      .from("spray_treatments")
      .select("created_at")
      .gte("created_at", since.toISOString()),
    supabase
      .from("scouting_records")
      .select("recorded_at")
      .gte("recorded_at", since.toISOString()),
  ]);

  if (reports.error) throw reports.error;
  if (sprays.error) throw sprays.error;
  if (scouting.error) throw scouting.error;

  return {
    reports: buildTrendSeries(reports.data ?? []),
    sprays: buildTrendSeries(sprays.data ?? []),
    scouting: buildTrendSeries(
      (scouting.data ?? []).map((row) => ({ created_at: row.recorded_at })),
    ),
  };
}

export type NamedCount = { name: string; value: number };

export type AdminDailyAnalytics = {
  pestMix: NamedCount[];
  severityMix: NamedCount[];
  issueTypeMix: NamedCount[];
  scoutingByHouse: { greenhouse: string; stops: number }[];
};

function tally(values: string[]): NamedCount[] {
  const map = new Map<string, number>();
  for (const raw of values) {
    const name = raw.trim() || "Unknown";
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return Array.from(map, ([name, value]) => ({ name, value })).sort(
    (a, b) => b.value - a.value,
  );
}

function topWithOther(rows: NamedCount[], limit: number): NamedCount[] {
  if (rows.length <= limit) return rows;
  const head = rows.slice(0, limit - 1);
  const rest = rows.slice(limit - 1).reduce((sum, row) => sum + row.value, 0);
  return [...head, { name: "Other", value: rest }];
}

export async function getAdminDailyAnalytics(): Promise<AdminDailyAnalytics> {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const [hotspots, scouting] = await Promise.all([
    supabase
      .from("infestation_hotspots")
      .select("pest_type, severity, status")
      .eq("status", "active"),
    supabase
      .from("scouting_records")
      .select("issue_type, greenhouses(name)")
      .gte("recorded_at", since.toISOString()),
  ]);

  if (hotspots.error) throw hotspots.error;
  if (scouting.error) throw scouting.error;

  const active = hotspots.data ?? [];
  const stops = scouting.data ?? [];

  const severityMix = [1, 2, 3, 4, 5].map((level) => ({
    name: `${level}/5`,
    value: active.filter((row) => row.severity === level).length,
  }));

  const houseTally = tally(
    stops.map((row) => {
      const gh = row.greenhouses as { name?: string } | { name?: string }[] | null;
      const name = Array.isArray(gh) ? gh[0]?.name : gh?.name;
      return name ?? "Unknown";
    }),
  );

  return {
    pestMix: topWithOther(
      tally(active.map((row) => row.pest_type || "Unspecified")),
      6,
    ),
    severityMix,
    issueTypeMix: tally(
      stops.map((row) => (row.issue_type === "disease" ? "Disease" : "Pest")),
    ),
    scoutingByHouse: houseTally.slice(0, 10).map((row) => ({
      greenhouse: row.name,
      stops: row.value,
    })),
  };
}

export { startOfTodayIso };
