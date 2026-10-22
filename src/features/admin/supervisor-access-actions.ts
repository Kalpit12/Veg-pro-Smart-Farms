"use server";

import {
  getSupervisorGreenhouseIds,
  listAssignedSitesForCurrentSupervisor,
  listFarmsGreenhousesCatalog,
  replaceSupervisorGreenhouseAccess,
  type FarmGreenhouseCatalogItem,
} from "@/services/supervisor-access-service";

export type { FarmGreenhouseCatalogItem };

export async function listFarmsGreenhousesCatalogAction() {
  return listFarmsGreenhousesCatalog();
}

export async function getMyAssignedSitesAction() {
  return listAssignedSitesForCurrentSupervisor();
}

/** Greenhouse ids the signed-in worker or farm manager may use in the field (empty = no restriction). */
export async function getMyFieldGreenhouseIdsAction(): Promise<string[]> {
  const result = await listAssignedSitesForCurrentSupervisor();
  const ids: string[] = [];
  for (const farm of result.data ?? []) {
    for (const gh of farm.greenhouses) {
      ids.push(gh.id);
    }
  }
  return ids;
}

export async function getSupervisorGreenhouseAccessAction(userId: string) {
  return getSupervisorGreenhouseIds(userId);
}

export async function setSupervisorGreenhouseAccessAction(
  userId: string,
  greenhouseIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await replaceSupervisorGreenhouseAccess(userId, greenhouseIds);
  if (result.error) return { ok: false, error: result.error.message };
  return { ok: true };
}
