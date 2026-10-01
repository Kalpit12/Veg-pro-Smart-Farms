"use server";

import * as q from "@/services/mssql/scouting-queries";
import type { CreateScoutingRecordInput } from "@/services/supabase/scouting-service";
import type { RoutePointInput } from "@/services/supabase/scouting-route-service";

export async function mssqlListCropCategoriesAction() {
  return q.mssqlListCropCategories();
}

export async function mssqlListCropVarietiesAction(categoryId?: string) {
  return q.mssqlListCropVarieties(categoryId);
}

export async function mssqlListScoutingParametersAction() {
  return q.mssqlListScoutingParameters();
}

export async function mssqlCreateScoutingRecordAction(input: CreateScoutingRecordInput) {
  return q.mssqlCreateScoutingRecord(input);
}

export async function mssqlListScoutingRecordsAction(limit?: number) {
  return q.mssqlListScoutingRecords(limit);
}

export async function mssqlListScoutingRecordsSinceAction(sinceIso: string) {
  return q.mssqlListScoutingRecordsSince(new Date(sinceIso));
}

export async function mssqlListScoutingForGreenhouseSinceAction(
  greenhouseId: string,
  sinceIso: string,
) {
  return q.mssqlListScoutingForGreenhouseSince(greenhouseId, new Date(sinceIso));
}

export async function mssqlGetScoutingPressureByGreenhouseAction(sinceIso?: string) {
  return q.mssqlGetScoutingPressureByGreenhouse(
    sinceIso ? new Date(sinceIso) : undefined,
  );
}

export async function mssqlGetAnyActiveRoundForScoutAction(scoutId: string) {
  return q.mssqlGetAnyActiveRoundForScout(scoutId);
}

export async function mssqlStartScoutingRoundAction(input: {
  scout_id: string;
  farm_id: string;
  greenhouse_id: string;
  id?: string;
  started_at?: string;
}) {
  return q.mssqlStartScoutingRound(input);
}

export async function mssqlCompleteScoutingRoundAction(roundId: string) {
  return q.mssqlCompleteScoutingRound(roundId);
}

export async function mssqlListScoutingRoundsAction(limit?: number) {
  return q.mssqlListScoutingRounds(limit);
}

export async function mssqlListScoutingRoundsBetweenAction(
  fromIso: string,
  toIso: string,
  limit?: number,
) {
  return q.mssqlListScoutingRoundsBetween(new Date(fromIso), new Date(toIso), limit);
}

export async function mssqlListRecordsForRoundAction(roundId: string) {
  return q.mssqlListRecordsForRound(roundId);
}

export async function mssqlAppendRoutePointsAction(roundId: string, points: RoutePointInput[]) {
  return q.mssqlAppendRoutePoints(roundId, points);
}

export async function mssqlListRoutePointsAction(roundId: string) {
  return q.mssqlListRoutePoints(roundId);
}

export async function mssqlListRoutePointsForRoundsAction(roundIds: string[]) {
  return q.mssqlListRoutePointsForRounds(roundIds);
}

export async function mssqlFinalizeRoundMetricsAction(
  roundId: string,
  options?: { coveragePct?: number | null },
) {
  return q.mssqlFinalizeRoundMetrics(roundId, options);
}

export async function mssqlListGreenhouseAnchorsAction() {
  return q.mssqlListGreenhouseAnchors();
}
