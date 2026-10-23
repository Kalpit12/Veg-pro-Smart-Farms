"use server";

import * as q from "@/services/mssql/ops-queries";
import * as wd from "@/services/mssql/worker-directory-queries";
import * as act from "@/services/mssql/activity-queries";
import type { InfestationStatus } from "@/types/db";
import type { FieldScoutingMirrorInput } from "@/lib/field-report-scouting-sync";
import type { ReportInfestationInput } from "@/services/supabase/infestation-service";
import type { LogSprayInput } from "@/services/supabase/spray-service";
import type { StaffAccountRole } from "@/features/admin/create-staff-account-action";

export async function mssqlReportInfestationAction(
  input: ReportInfestationInput,
  scoutingMirror?: FieldScoutingMirrorInput,
) {
  return q.mssqlReportInfestation(input, scoutingMirror);
}

export async function mssqlListHotspotsAction(limit?: number) {
  return q.mssqlListHotspots(limit);
}

export async function mssqlListHotspotsForHistoryAction(options?: {
  greenhouseId?: string;
  sinceIso?: string;
  limit?: number;
}) {
  return q.mssqlListHotspotsForHistory({
    greenhouseId: options?.greenhouseId,
    since: options?.sinceIso ? new Date(options.sinceIso) : undefined,
    limit: options?.limit,
  });
}

export async function mssqlListActiveHotspotsAction(limit?: number) {
  return q.mssqlListActiveHotspots(limit);
}

export async function mssqlGetHotspotByIdAction(id: string) {
  return q.mssqlGetHotspotById(id);
}

export async function mssqlListActiveHotspotsForGreenhouseAction(greenhouseId: string) {
  return q.mssqlListActiveHotspotsForGreenhouse(greenhouseId);
}

export async function mssqlUpdateHotspotStatusAction(id: string, status: InfestationStatus) {
  return q.mssqlUpdateHotspotStatus(id, status);
}

export async function mssqlUpdateHotspotAfterSprayAction(
  id: string,
  options?: { severityAfter?: number | null },
) {
  return q.mssqlUpdateHotspotAfterSpray(id, options);
}

export async function mssqlGetHotspotKpisAction() {
  return q.mssqlGetHotspotKpis();
}

export async function mssqlLogSprayAction(input: LogSprayInput) {
  return q.mssqlLogSpray(input);
}

export async function mssqlListSpraysAction(limit?: number, sinceIso?: string) {
  return q.mssqlListSprays(limit, sinceIso ? new Date(sinceIso) : undefined);
}

export async function mssqlGetSpraysTodayCountAction() {
  return q.mssqlGetSpraysTodayCount();
}

export async function mssqlUpsertWorkerPositionAction(
  workerId: string,
  latitude: number,
  longitude: number,
) {
  return q.mssqlUpsertWorkerPosition(workerId, latitude, longitude);
}

export async function mssqlListWorkerPositionsAction() {
  return q.mssqlListWorkerPositions();
}

export async function mssqlGetWorkersInFieldCountAction() {
  return q.mssqlGetWorkersInFieldCount();
}

export async function mssqlCreateAlertAction(type: string, message: string) {
  return q.mssqlCreateAlert(type, message);
}

export async function mssqlListOpenAlertsAction(limit?: number) {
  return q.mssqlListOpenAlerts(limit);
}

export async function mssqlListStaffAccountsAction() {
  return q.mssqlListStaffAccounts();
}

export async function mssqlCreateStaffAccountAction(input: {
  fullName: string;
  email: string;
  phone: string;
  role: StaffAccountRole | "admin";
  password: string;
  greenhouseIds?: string[];
}) {
  return q.mssqlCreateStaffAccount(input);
}

export async function mssqlSetStaffAccountActiveAction(userId: string, isActive: boolean) {
  return q.mssqlSetStaffAccountActive(userId, isActive);
}

export async function mssqlGetDashboardKpisAction() {
  return q.mssqlGetDashboardKpis();
}

export async function mssqlGetWeeklyTrendsRawAction() {
  return q.mssqlGetWeeklyTrendsRaw();
}

export async function mssqlGetAdminDailyAnalyticsRawAction() {
  return q.mssqlGetAdminDailyAnalyticsRaw();
}

export async function mssqlListWorkerOpsRowsAction() {
  return wd.mssqlListWorkerOpsRows();
}

export async function mssqlListWorkerTrendsSinceAction(sinceIso: string) {
  return wd.mssqlListWorkerTrendsSince(new Date(sinceIso));
}

export async function mssqlListActivitiesAction(params: {
  q?: string;
  status?: "pending" | "approved" | "rejected";
  limit?: number;
}) {
  return act.mssqlListActivities(params);
}

export async function mssqlSubmitActivityAction(input: {
  worker_id: string;
  farm_id: string;
  greenhouse_id?: string | null;
  activity_type: string;
  notes?: string | null;
  image_url?: string | null;
  gps_location?: string | null;
}) {
  return act.mssqlSubmitActivity(input);
}

export async function mssqlSetActivityStatusAction(
  id: string,
  status: "approved" | "rejected",
) {
  return act.mssqlSetActivityStatus(id, status);
}

export async function mssqlListUnifiedActivityLogsAction(params: {
  q?: string;
  status?: import("@/services/supabase/activity-log-service").ActivityLogStatus | "";
  limit?: number;
}) {
  return act.mssqlListUnifiedActivityLogs(params);
}

export async function mssqlUpdateStaffAccountAction(input: {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  password?: string;
}) {
  return wd.mssqlUpdateStaffAccount(input);
}
