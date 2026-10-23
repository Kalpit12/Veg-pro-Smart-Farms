import {
  BEMACK_CATEGORIES,
  SCOUTING_PARAMETERS,
  varietyForBay,
} from "@/lib/bemack-master-data";
import { isNoIssueMarker, pestCountToSeverity } from "@/lib/plant-zones";
import {
  createScoutingRecord,
  listCropCategories,
  listCropVarieties,
  listScoutingParameters,
  type CreateScoutingRecordInput,
} from "@/services/supabase/scouting-service";

export type FieldReportLine =
  | { kind: "pest"; name: string; count: number }
  | { kind: "disease"; name: string; severity: 1 | 2 | 3 };

export type FieldReportScoutingSyncInput = {
  scoutId: string;
  farmId: string;
  greenhouseId: string;
  greenhouseName: string;
  mapCell: { column: number; bay: number } | null;
  lines: FieldReportLine[];
  zoneLabel: string;
  notes: string | null;
  roundId: string | null;
  latitude: number;
  longitude: number;
  recordedAt?: string;
};

function ratingForLine(line: FieldReportLine): number | null {
  if (line.kind === "pest") {
    const sev = pestCountToSeverity(line.count);
    return Math.min(5, Math.max(1, sev + 1));
  }
  return Math.min(5, Math.max(1, line.severity * 2));
}

function observationForLine(
  line: FieldReportLine,
  paramRows: { id: string; param_key: string }[],
): CreateScoutingRecordInput["observations"] {
  const def = SCOUTING_PARAMETERS.find((p) => p.name === line.name);
  if (!def) return [];
  const row = paramRows.find((r) => r.param_key === def.id);
  if (!row) return [];
  return [
    {
      parameter_id: row.id,
      present: true,
      rating: ratingForLine(line),
    },
  ];
}

export async function buildScoutingPayloadsFromFieldReport(
  input: FieldReportScoutingSyncInput,
): Promise<{ payloads: CreateScoutingRecordInput[]; error: string | null }> {
  if (!input.mapCell) {
    return { payloads: [], error: null };
  }

  const lines = input.lines.filter((l) => !isNoIssueMarker(l.name));
  if (!lines.length) {
    return { payloads: [], error: null };
  }

  const [cats, varieties, parameters] = await Promise.all([
    listCropCategories(),
    listCropVarieties(),
    listScoutingParameters(),
  ]);
  const svcErr = cats.error ?? varieties.error ?? parameters.error;
  if (svcErr) {
    const msg =
      typeof svcErr === "object" && svcErr && "message" in svcErr
        ? String((svcErr as { message: string }).message)
        : String(svcErr);
    return { payloads: [], error: msg };
  }

  const categoryName = BEMACK_CATEGORIES[0];
  const catRow = cats.data?.find((c) => c.name === categoryName);
  const varietyName = varietyForBay(input.greenhouseName, input.mapCell.bay);
  const varRow = varieties.data?.find(
    (v) => v.name === varietyName && v.category_id === catRow?.id,
  );
  if (!catRow || !varRow) {
    return {
      payloads: [],
      error: "Crop category or variety missing in SQL for this greenhouse bay.",
    };
  }

  const paramRows = parameters.data ?? [];
  const recordedAt = input.recordedAt ?? new Date().toISOString();
  const noteParts = [
    `Zone: ${input.zoneLabel}`,
    input.notes?.trim() ? input.notes.trim() : null,
  ].filter(Boolean);

  const payloads: CreateScoutingRecordInput[] = lines.map((line) => ({
    scout_id: input.scoutId,
    farm_id: input.farmId,
    greenhouse_id: input.greenhouseId,
    category_id: catRow.id,
    variety_id: varRow.id,
    beds: 11,
    column_no: input.mapCell!.column,
    bay_no: input.mapCell!.bay,
    issue_type: line.kind,
    issue_name: line.name,
    rating: ratingForLine(line),
    round_id: input.roundId,
    latitude: input.latitude,
    longitude: input.longitude,
    notes: noteParts.length ? noteParts.join(" · ") : null,
    recorded_at: recordedAt,
    image_url: null,
    observations: observationForLine(line, paramRows),
  }));

  return { payloads, error: null };
}

/** Mirror field “Log on the flower” into dbo.scouting_records (+ observations). */
export async function syncScoutingRecordsFromFieldReport(
  input: FieldReportScoutingSyncInput,
): Promise<{ saved: number; error: string | null }> {
  const { payloads, error: buildError } = await buildScoutingPayloadsFromFieldReport(input);
  if (buildError) return { saved: 0, error: buildError };
  if (!payloads.length) return { saved: 0, error: null };

  let saved = 0;
  for (const payload of payloads) {
    const { error } = await createScoutingRecord(payload);
    if (error) {
      const msg =
        typeof error === "object" && error && "message" in error
          ? String((error as { message: string }).message)
          : String(error);
      return { saved, error: msg };
    }
    saved += 1;
  }
  return { saved, error: null };
}
