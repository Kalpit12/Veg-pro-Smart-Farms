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
