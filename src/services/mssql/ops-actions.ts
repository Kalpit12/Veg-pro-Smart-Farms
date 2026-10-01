"use server";

import * as q from "@/services/mssql/ops-queries";
import type { InfestationStatus } from "@/types/db";
import type { ReportInfestationInput } from "@/services/supabase/infestation-service";
import type { LogSprayInput } from "@/services/supabase/spray-service";
import type { StaffAccountRole } from "@/features/admin/create-staff-account-action";

export async function mssqlReportInfestationAction(input: ReportInfestationInput) {
  return q.mssqlReportInfestation(input);
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

export async function mssqlListSpraysAction(limit?: number) {
  return q.mssqlListSprays(limit);
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
  role: StaffAccountRole;
  password: string;
}) {
  return q.mssqlCreateStaffAccount(input);
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
