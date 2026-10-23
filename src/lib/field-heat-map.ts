import { BEMACK_DISEASES, BEMACK_PESTS } from "@/lib/bemack-master-data";
import type { ScoutingGridInput } from "@/lib/greenhouse-grid";
import { isNoIssueMarker, pestCountToSeverity } from "@/lib/plant-zones";
import type { FieldReportLine } from "@/lib/field-report-scouting-sync";
import type { ScoutingIssueType } from "@/types/db";

export function issueTypeForFieldName(name: string): ScoutingIssueType {
  if ((BEMACK_PESTS as readonly string[]).includes(name)) return "pest";
  if ((BEMACK_DISEASES as readonly string[]).includes(name)) return "disease";
  return "pest";
}

export function ratingForFieldReportLine(line: FieldReportLine): number {
  if (line.kind === "pest") {
    return Math.min(5, Math.max(1, pestCountToSeverity(line.count) + 1));
  }
  return Math.min(5, Math.max(1, line.severity * 2));
}

export function gridInputFromFieldLine(
  greenhouseName: string,
  columnNo: number,
  bayNo: number,
  line: FieldReportLine,
): ScoutingGridInput | null {
  if (isNoIssueMarker(line.name)) return null;
  return {
    greenhouseName,
    columnNo,
    bayNo,
    issueType: line.kind,
    issue: line.name,
    rating: ratingForFieldReportLine(line),
  };
}

export function gridInputFromHotspot(row: {
  greenhouseName: string;
  columnNo: number | null;
  bayNo: number | null;
  pestType: string;
  severity: number;
}): ScoutingGridInput | null {
  if (row.columnNo == null || row.bayNo == null) return null;
  if (isNoIssueMarker(row.pestType)) return null;
  return {
    greenhouseName: row.greenhouseName,
    columnNo: row.columnNo,
    bayNo: row.bayNo,
    issueType: issueTypeForFieldName(row.pestType),
    issue: row.pestType,
    rating: Math.min(5, Math.max(1, row.severity)),
  };
}
