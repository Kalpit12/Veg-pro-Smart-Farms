import { format } from "date-fns";

import type { ExcelRow } from "@/lib/export-excel";
import type { SprayWorkItem } from "@/lib/spray-work-program";
import type { UnifiedScoutingRecord } from "@/hooks/use-scouting-data";
import type { WorkerOpsRow } from "@/services/supabase/worker-ops-service";

const PRIORITY_LABELS = {
  urgent: "Spray today",
  scheduled: "Within 48h",
  monitor: "Monitor",
} as const;

export function scoutingRecordsToExcel(records: UnifiedScoutingRecord[]): ExcelRow[] {
  return records.map((r) => ({
    Date: format(new Date(r.recordedAt), "yyyy-MM-dd HH:mm"),
    Scout: r.scoutName,
    Farm: r.farmName,
    Greenhouse: r.greenhouseName,
    Category: r.category,
    Variety: r.variety,
    Beds: r.beds,
    Column: r.columnNo,
    Bay: r.bayNo,
    "Issue type": r.issueType,
    Issue: r.issue,
    Rating: r.rating ?? "",
    Latitude: r.latitude ?? "",
    Longitude: r.longitude ?? "",
    "Round ID": r.roundId ?? "",
  }));
}

export function sprayProgramToExcel(program: SprayWorkItem[]): ExcelRow[] {
  return program.map((item) => ({
    Priority: PRIORITY_LABELS[item.priority],
    Greenhouse: item.greenhouse,
    Variety: item.variety,
    "Issue type": item.issueType,
    Issue: item.issue,
    Rating: item.rating,
    Location: item.location,
    "Product hint": item.productHint,
    Action: item.action,
  }));
}

export function workersToExcel(rows: WorkerOpsRow[]): ExcelRow[] {
  return rows.map((row) => ({
    Greenhouse: row.greenhouse,
    Worker: row.workerName,
    "Working on": row.workingOn,
    Problem: row.problem,
    "Main issue": row.mainIssue,
    Severity: row.severity > 0 ? row.severity : "",
  }));
}

export type HistoryExportItem = {
  type: "report" | "spray";
  title: string;
  detail: string;
  farm: string;
  greenhouse: string;
  worker: string;
  created_at: string;
  severity?: number;
  status?: string;
};

export function historyToExcel(items: HistoryExportItem[]): ExcelRow[] {
  return items.map((item) => ({
    Type: item.type === "report" ? "Infestation report" : "Spray log",
    Date: format(new Date(item.created_at), "yyyy-MM-dd HH:mm"),
    Farm: item.farm,
    Greenhouse: item.greenhouse,
    Worker: item.worker,
    Title: item.title,
    Detail: item.detail,
    Severity: item.severity ?? "",
    Status: item.status ?? "",
  }));
}

export type ActivityLogExportRow = {
  activity_type: string;
  status: string;
  created_at: string;
  notes?: string | null;
  users?: { full_name?: string } | null;
  farms?: { name?: string } | null;
  greenhouses?: { name?: string } | null;
};

export function activityLogsToExcel(rows: ActivityLogExportRow[]): ExcelRow[] {
  return rows.map((row) => ({
    Date: format(new Date(row.created_at), "yyyy-MM-dd HH:mm"),
    Worker: row.users?.full_name ?? "",
    Farm: row.farms?.name ?? "",
    Greenhouse: row.greenhouses?.name ?? "",
    Activity: row.activity_type,
    Status: row.status,
    Notes: row.notes ?? "",
  }));
}

export type HotspotExportRow = {
  pest_type: string;
  problem: string;
  main_issue: string;
  severity: number;
  status: string;
  latitude: number;
  longitude: number;
  created_at: string;
  farms?: { name?: string } | null;
  greenhouses?: { name?: string } | null;
  users?: { full_name?: string } | null;
};

export function hotspotsToExcel(rows: HotspotExportRow[]): ExcelRow[] {
  return rows.map((row) => ({
    Date: format(new Date(row.created_at), "yyyy-MM-dd HH:mm"),
    Farm: row.farms?.name ?? "",
    Greenhouse: row.greenhouses?.name ?? "",
    Worker: row.users?.full_name ?? "",
    "Pest type": row.pest_type,
    Problem: row.problem,
    "Main issue": row.main_issue,
    Severity: row.severity,
    Status: row.status,
    Latitude: row.latitude,
    Longitude: row.longitude,
  }));
}

export type SprayExportRow = {
  product_name: string;
  created_at: string;
  latitude: number;
  longitude: number;
  severity_before?: number | null;
  severity_after?: number | null;
  users?: { full_name?: string } | null;
};

export function spraysToExcel(rows: SprayExportRow[]): ExcelRow[] {
  return rows.map((row) => ({
    Date: format(new Date(row.created_at), "yyyy-MM-dd HH:mm"),
    Worker: row.users?.full_name ?? "",
    Product: row.product_name,
    "Severity before": row.severity_before ?? "",
    "Severity after": row.severity_after ?? "",
    Latitude: row.latitude,
    Longitude: row.longitude,
  }));
}

export function excelFilename(base: string) {
  return `${base}-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
}
