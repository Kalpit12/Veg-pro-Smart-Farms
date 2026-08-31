import { createClient } from "@/lib/supabase/client";
import { listScoutingRecordsSince } from "@/services/supabase/scouting-service";
import { listHotspots } from "@/services/supabase/infestation-service";
import { listSprays } from "@/services/supabase/spray-service";

/** Unified shape for manager Live Activity Feed */
export type FieldFeedItem = {
  id: string;
  activity_type: string;
  status: string;
  created_at: string;
  problem?: string;
  users?: { full_name?: string } | null;
  farms?: { name?: string } | null;
  greenhouses?: { name?: string } | null;
};

export async function listFieldFeed(limit = 24): Promise<{
  data: FieldFeedItem[];
  error: Error | null;
}> {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - 14);

  const [spraysRes, hotspotsRes, scoutingRes, activitiesRes] = await Promise.all([
    listSprays(limit),
    listHotspots(limit),
    listScoutingRecordsSince(since),
    supabase
      .from("activities")
      .select(
        "id, activity_type, status, created_at, notes, users:worker_id(full_name), farms(name), greenhouses(name)",
      )
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const firstError =
    spraysRes.error ?? hotspotsRes.error ?? scoutingRes.error ?? activitiesRes.error;
  if (firstError) {
    return { data: [], error: firstError as Error };
  }

  const items: FieldFeedItem[] = [];

  for (const row of spraysRes.data ?? []) {
    const s = row as {
      id: string;
      product_name: string;
      notes: string | null;
      created_at: string;
      users?: { full_name?: string } | null;
      farms?: { name?: string } | null;
      greenhouses?: { name?: string } | null;
    };
    items.push({
      id: `spray-${s.id}`,
      activity_type: "Spray treatment",
      status: "approved",
      created_at: s.created_at,
      problem: s.notes
        ? `${s.product_name} — ${s.notes}`
        : s.product_name,
      users: s.users,
      farms: s.farms,
      greenhouses: s.greenhouses,
    });
  }

  for (const row of hotspotsRes.data ?? []) {
    const h = row as {
      id: string;
      pest_type: string;
      problem: string;
      main_issue: string;
      status: string;
      created_at: string;
      users?: { full_name?: string } | null;
      farms?: { name?: string } | null;
      greenhouses?: { name?: string } | null;
    };
    items.push({
      id: `hotspot-${h.id}`,
      activity_type: "Infestation report",
      status: h.status === "active" ? "pending" : h.status,
      created_at: h.created_at,
      problem: `${h.pest_type}: ${h.main_issue}`,
      users: h.users,
      farms: h.farms,
      greenhouses: h.greenhouses,
    });
  }

  for (const row of scoutingRes.data ?? []) {
    const r = row as {
      id: string;
      issue_type: string;
      issue_name: string;
      rating: number | null;
      recorded_at: string;
      crop_varieties?: { name?: string } | null;
      users?: { full_name?: string } | null;
      farms?: { name?: string } | null;
      greenhouses?: { name?: string } | null;
    };
    items.push({
      id: `scout-${r.id}`,
      activity_type: "Scouting stop",
      status: "approved",
      created_at: r.recorded_at,
      problem: `${r.issue_type}: ${r.issue_name}${r.rating != null ? ` (${r.rating}/5)` : ""} · ${r.crop_varieties?.name ?? "—"}`,
      users: r.users,
      farms: r.farms,
      greenhouses: r.greenhouses,
    });
  }

  for (const row of activitiesRes.data ?? []) {
    const a = row as {
      id: string;
      activity_type: string;
      status: string;
      created_at: string;
      notes: string | null;
      users?: { full_name?: string } | null;
      farms?: { name?: string } | null;
      greenhouses?: { name?: string } | null;
    };
    items.push({
      id: `activity-${a.id}`,
      activity_type: a.activity_type,
      status: a.status,
      created_at: a.created_at,
      problem: a.notes ?? undefined,
      users: a.users,
      farms: a.farms,
      greenhouses: a.greenhouses,
    });
  }

  items.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return { data: items.slice(0, limit), error: null };
}
