import { listActivities } from "@/services/supabase/activity-service";
import { listHotspots, type HotspotRow } from "@/services/supabase/infestation-service";
import { listScoutingRecords, type ScoutingRecordRow } from "@/services/supabase/scouting-service";
import { listSprays } from "@/services/supabase/spray-service";
import {
  formatScoutingIssueLabel,
  sprayActivityNotes,
  sprayLocationFromHotspot,
} from "@/lib/spray-log-context";
import type { DemoSprayRow } from "@/store/field-ops-store";
import type { DemoScoutingRecord } from "@/store/scouting-store";

export type ActivityLogStatus = "pending" | "approved" | "resolved" | "rejected";

export type ActivityLogRow = {
  id: string;
  activity_type: string;
  status: ActivityLogStatus;
  created_at: string;
  notes?: string | null;
  image_url?: string | null;
  users?: { full_name?: string } | null;
  farms?: { name?: string } | null;
  greenhouses?: { name?: string } | null;
};

function hotspotLogStatus(status: string): ActivityLogStatus {
  if (status === "resolved") return "resolved";
  if (status === "sprayed") return "approved";
  if (status === "active") return "pending";
  return "pending";
}

function sprayLogStatus(
  spray: { hotspot_id?: string | null },
  hotspotsById: Map<string, HotspotRow>,
): ActivityLogStatus {
  if (!spray.hotspot_id) return "approved";
  const hotspot = hotspotsById.get(spray.hotspot_id);
  if (hotspot?.status === "resolved") return "resolved";
  if (hotspot?.status === "sprayed") return "approved";
  return "approved";
}

function matchesQuery(row: ActivityLogRow, q: string) {
  const needle = q.toLowerCase();
  return (
    row.activity_type.toLowerCase().includes(needle) ||
    (row.notes?.toLowerCase().includes(needle) ?? false) ||
    (row.users?.full_name?.toLowerCase().includes(needle) ?? false) ||
    (row.farms?.name?.toLowerCase().includes(needle) ?? false) ||
    (row.greenhouses?.name?.toLowerCase().includes(needle) ?? false)
  );
}

function sortAndFilter(
  rows: ActivityLogRow[],
  params: { q?: string; status?: ActivityLogStatus | ""; limit?: number },
) {
  let result = [...rows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  if (params.status) {
    result = result.filter((row) => row.status === params.status);
  }
  if (params.q) {
    const needle = params.q;
    result = result.filter((row) => matchesQuery(row, needle));
  }
  if (params.limit) {
    result = result.slice(0, params.limit);
  }

  return result;
}

export async function listUnifiedActivityLogs(params: {
  q?: string;
  status?: ActivityLogStatus | "";
  limit?: number;
}): Promise<{ data: ActivityLogRow[]; error: Error | null }> {
  const limit = params.limit ?? 100;

  const [activitiesRes, hotspotsRes, spraysRes, scoutingRes] = await Promise.all([
    listActivities({ limit: 200 }),
    listHotspots(200),
    listSprays(200),
    listScoutingRecords(200),
  ]);

  const firstError =
    activitiesRes.error ??
    hotspotsRes.error ??
    spraysRes.error ??
    scoutingRes.error;

  if (firstError) {
    return { data: [], error: firstError as Error };
  }

  const hotspots = (hotspotsRes.data as HotspotRow[]) ?? [];
  const hotspotsById = new Map(hotspots.map((h) => [h.id, h]));
  const rows: ActivityLogRow[] = [];

  for (const row of activitiesRes.data ?? []) {
    const activity = row as {
      id: string;
      activity_type: string;
      status: string;
      created_at: string;
      notes: string | null;
      image_url: string | null;
      users?: { full_name?: string } | null;
      farms?: { name?: string } | null;
      greenhouses?: { name?: string } | null;
    };
    rows.push({
      id: `activity-${activity.id}`,
      activity_type: activity.activity_type,
      status: activity.status as ActivityLogStatus,
      created_at: activity.created_at,
      notes: activity.notes,
      image_url: activity.image_url,
      users: activity.users,
      farms: activity.farms,
      greenhouses: activity.greenhouses,
    });
  }

  for (const hotspot of hotspots) {
    rows.push({
      id: `hotspot-${hotspot.id}`,
      activity_type: "Infestation report",
      status: hotspotLogStatus(hotspot.status),
      created_at: hotspot.created_at,
      notes: `${hotspot.pest_type}: ${hotspot.main_issue} (severity ${hotspot.severity}/5)`,
      image_url: null,
      users: hotspot.users,
      farms: hotspot.farms,
      greenhouses: hotspot.greenhouses,
    });
  }

  for (const row of spraysRes.data ?? []) {
    const spray = row as DemoSprayRow & {
      product_name: string;
      notes: string | null;
      created_at: string;
      hotspot_id: string | null;
      users?: { full_name?: string } | null;
      farms?: { name?: string } | null;
      greenhouses?: { name?: string } | null;
      infestation_hotspots?: HotspotRow | HotspotRow[] | null;
    };
    const { farms, greenhouses, hotspot } = sprayLocationFromHotspot(spray, hotspotsById);
    rows.push({
      id: `spray-${spray.id}`,
      activity_type: "Spray treatment",
      status: sprayLogStatus(spray, hotspotsById),
      created_at: spray.created_at,
      notes: sprayActivityNotes(spray.product_name, spray.notes, hotspot),
      image_url: null,
      users: spray.users,
      farms,
      greenhouses,
    });
  }

  for (const row of (scoutingRes.data as ScoutingRecordRow[]) ?? []) {
    rows.push({
      id: `scout-${row.id}`,
      activity_type: "Scouting stop",
      status: "approved",
      created_at: row.recorded_at,
      notes: formatScoutingIssueLabel(row.issue_type, row.issue_name, row.rating),
      image_url: null,
      users: row.users,
      farms: row.farms,
      greenhouses: row.greenhouses,
    });
  }

  return {
    data: sortAndFilter(rows, { ...params, limit }),
    error: null,
  };
}

export function buildDemoUnifiedActivityLogs(input: {
  hotspots: HotspotRow[];
  sprays: DemoSprayRow[];
  scouting: DemoScoutingRecord[];
  legacy?: ActivityLogRow[];
}): ActivityLogRow[] {
  const hotspotsById = new Map(input.hotspots.map((h) => [h.id, h]));
  const rows: ActivityLogRow[] = [...(input.legacy ?? [])];

  for (const hotspot of input.hotspots) {
    rows.push({
      id: `hotspot-${hotspot.id}`,
      activity_type: "Infestation report",
      status: hotspotLogStatus(hotspot.status),
      created_at: hotspot.created_at,
      notes: `${hotspot.pest_type}: ${hotspot.main_issue} (severity ${hotspot.severity}/5)`,
      image_url: null,
      users: hotspot.users,
      farms: hotspot.farms,
      greenhouses: hotspot.greenhouses,
    });
  }

  for (const spray of input.sprays) {
    const linkedHotspot = spray.hotspot_id
      ? hotspotsById.get(spray.hotspot_id)
      : null;
    rows.push({
      id: `spray-${spray.id}`,
      activity_type: "Spray treatment",
      status: sprayLogStatus(spray, hotspotsById),
      created_at: spray.created_at,
      notes: sprayActivityNotes(spray.product_name, spray.notes, linkedHotspot),
      image_url: null,
      users: spray.users,
      farms: linkedHotspot?.farms ?? spray.farms,
      greenhouses: linkedHotspot?.greenhouses ?? spray.greenhouses,
    });
  }

  for (const record of input.scouting) {
    rows.push({
      id: `scout-${record.id}`,
      activity_type: "Scouting stop",
      status: "approved",
      created_at: record.recordedAt,
      notes: formatScoutingIssueLabel(record.issueType, record.issue, record.rating),
      image_url: null,
      users: { full_name: record.scoutName },
      farms: { name: record.farmName },
      greenhouses: { name: record.greenhouseName },
    });
  }

  const seen = new Set<string>();
  return rows
    .filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}
