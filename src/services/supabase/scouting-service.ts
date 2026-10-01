import { routeDataThroughMssql } from "@/lib/mssql/client-routing";
import { createClient } from "@/lib/supabase/client";
import type { ScoutingIssueType, ScoutingRecord } from "@/types/db";
import * as mssql from "@/services/mssql/scouting-actions";

export type ScoutingObservationInput = {
  parameter_id: string;
  present: boolean;
  rating: number | null;
};

export type CreateScoutingRecordInput = {
  scout_id: string;
  farm_id: string;
  greenhouse_id: string;
  category_id: string;
  variety_id: string;
  beds: number;
  column_no: number;
  bay_no: number;
  issue_type: ScoutingIssueType;
  issue_name: string;
  rating: number | null;
  round_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  recorded_at?: string;
  image_url?: string | null;
  observations: ScoutingObservationInput[];
};

export async function listCropCategories() {
  if (routeDataThroughMssql()) return mssql.mssqlListCropCategoriesAction();
  const supabase = createClient();
  return supabase.from("crop_categories").select("*").order("name");
}

export async function listCropVarieties(categoryId?: string) {
  if (routeDataThroughMssql()) return mssql.mssqlListCropVarietiesAction(categoryId);
  const supabase = createClient();
  let q = supabase
    .from("crop_varieties")
    .select("*, crop_categories(name)")
    .order("name");
  if (categoryId) q = q.eq("category_id", categoryId);
  return q;
}

export async function listScoutingParameters() {
  if (routeDataThroughMssql()) return mssql.mssqlListScoutingParametersAction();
  const supabase = createClient();
  return supabase
    .from("scouting_parameters")
    .select("*")
    .order("sort_order");
}

export async function createScoutingRecord(input: CreateScoutingRecordInput) {
  if (routeDataThroughMssql()) return mssql.mssqlCreateScoutingRecordAction(input);
  const supabase = createClient();
  const { observations, ...record } = input;
  const insertRow = {
    ...record,
    recorded_at: record.recorded_at ?? new Date().toISOString(),
  };

  const { data: row, error } = await supabase
    .from("scouting_records")
    .insert(insertRow)
    .select()
    .single();

  if (error || !row) return { data: null, error };

  if (observations.length) {
    const { error: obsError } = await supabase.from("scouting_observations").insert(
      observations.map((o) => ({
        record_id: row.id,
        parameter_id: o.parameter_id,
        present: o.present,
        rating: o.rating,
      })),
    );
    if (obsError) {
      await supabase.from("scouting_records").delete().eq("id", row.id);
      return { data: null, error: obsError };
    }
  }

  return { data: row as ScoutingRecord, error: null };
}

export type ScoutingRecordRow = ScoutingRecord & {
  farms?: { name?: string } | null;
  greenhouses?: { name?: string; area_ha?: number | null } | null;
  crop_categories?: { name?: string } | null;
  crop_varieties?: { name?: string } | null;
  users?: { full_name?: string } | null;
};

export async function listScoutingRecords(limit = 200) {
  if (routeDataThroughMssql()) return mssql.mssqlListScoutingRecordsAction(limit);
  const supabase = createClient();
  return supabase
    .from("scouting_records")
    .select(
      `*,
      farms(name),
      greenhouses(name, area_ha),
      crop_categories(name),
      crop_varieties(name),
      users:scout_id(full_name)`,
    )
    .order("recorded_at", { ascending: false })
    .limit(limit);
}

export async function listScoutingRecordsSince(since: Date) {
  if (routeDataThroughMssql()) return mssql.mssqlListScoutingRecordsSinceAction(since.toISOString());
  const supabase = createClient();
  return supabase
    .from("scouting_records")
    .select(
      `*,
      farms(name),
      greenhouses(name),
      crop_categories(name),
      crop_varieties(name),
      users:scout_id(full_name)`,
    )
    .gte("recorded_at", since.toISOString())
    .order("recorded_at", { ascending: false });
}

export async function listScoutingForGreenhouseSince(
  greenhouseId: string,
  since: Date,
) {
  if (routeDataThroughMssql()) {
    return mssql.mssqlListScoutingForGreenhouseSinceAction(
      greenhouseId,
      since.toISOString(),
    );
  }
  const supabase = createClient();
  return supabase
    .from("scouting_records")
    .select("id, latitude, longitude, issue_name, recorded_at, users:scout_id(full_name)")
    .eq("greenhouse_id", greenhouseId)
    .gte("recorded_at", since.toISOString())
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("recorded_at", { ascending: true });
}

export type ScoutingPressureRow = {
  greenhouse: string;
  variety: string;
  issue_type: ScoutingIssueType;
  issue_name: string;
  avg_rating: number;
  count: number;
};

export async function getScoutingPressureByGreenhouse(since?: Date) {
  if (routeDataThroughMssql()) {
    return mssql.mssqlGetScoutingPressureByGreenhouseAction(since?.toISOString());
  }
  const supabase = createClient();
  let q = supabase
    .from("scouting_records")
    .select(
      "issue_type, issue_name, rating, greenhouses(name), crop_varieties(name)",
    );

  if (since) q = q.gte("recorded_at", since.toISOString());

  const { data, error } = await q;
  if (error) return { data: [], error };

  const map = new Map<string, ScoutingPressureRow & { sum: number }>();

  for (const row of data ?? []) {
    const gh = (row.greenhouses as { name?: string } | null)?.name ?? "Unknown";
    const variety =
      (row.crop_varieties as { name?: string } | null)?.name ?? "Unknown";
    const key = `${gh}|${variety}|${row.issue_type}|${row.issue_name}`;
    const existing = map.get(key);
    if (row.rating == null) continue;
    if (!row.issue_name || row.issue_name.trim().toLowerCase() === "none found") continue;
    const rating = row.rating;
    if (existing) {
      existing.count += 1;
      existing.sum += rating;
      existing.avg_rating = existing.sum / existing.count;
    } else {
      map.set(key, {
        greenhouse: gh,
        variety,
        issue_type: row.issue_type as ScoutingIssueType,
        issue_name: row.issue_name,
        avg_rating: rating,
        count: 1,
        sum: rating,
      });
    }
  }

  return {
    data: Array.from(map.values()).map(({ sum, ...rest }) => {
      void sum;
      return rest;
    }),
    error: null,
  };
}
