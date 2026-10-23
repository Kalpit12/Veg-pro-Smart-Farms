import { endOfDay, format, startOfDay } from "date-fns";

import type { FarmGreenhouseCatalogItem } from "@/services/supervisor-access-service";

export const ALL = "all";

export function todayDateYmd() {
  return format(new Date(), "yyyy-MM-dd");
}

export function calendarDayWindow(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const from = startOfDay(new Date(y, m - 1, d));
  const to = endOfDay(from);
  return { from, to };
}

export function isOnCalendarDay(iso: string, ymd: string) {
  const t = new Date(iso).getTime();
  const { from, to } = calendarDayWindow(ymd);
  return t >= from.getTime() && t <= to.getTime();
}

export function isOnAnySelectedDay(iso: string, dateYmds: string[]) {
  if (!dateYmds.length) return true;
  return dateYmds.some((ymd) => isOnCalendarDay(iso, ymd));
}

export function formatHeaderDate(ymd: string) {
  const { from } = calendarDayWindow(ymd);
  return format(from, "EEEE, d MMMM yyyy");
}

export function formatHeaderDatesSummary(dateYmds: string[], dateFilterAll: boolean) {
  if (dateFilterAll) return "All dates";
  if (dateYmds.length === 1) return formatHeaderDate(dateYmds[0]!);
  if (dateYmds.length === 2) {
    return `${formatHeaderDate(dateYmds[0]!)} and ${formatHeaderDate(dateYmds[1]!)}`;
  }
  return `${dateYmds.length} days selected`;
}

export function greenhousesForFarm(
  sites: FarmGreenhouseCatalogItem[],
  farmId: string,
) {
  if (farmId === ALL) {
    return sites.flatMap((f) => f.greenhouses);
  }
  return sites.find((f) => f.farmId === farmId)?.greenhouses ?? [];
}

export function allowedFarmIds(sites: FarmGreenhouseCatalogItem[]) {
  return new Set(sites.map((f) => f.farmId));
}

export function allowedGreenhouseIds(sites: FarmGreenhouseCatalogItem[], farmId: string) {
  return new Set(greenhousesForFarm(sites, farmId).map((g) => g.id));
}

export function varietiesForFarm(
  sites: FarmGreenhouseCatalogItem[],
  farmId: string,
  greenhouseId: string,
) {
  const ghs = greenhousesForFarm(sites, farmId);
  const pool =
    greenhouseId === ALL ? ghs : ghs.filter((g) => g.id === greenhouseId);
  const set = new Set<string>();
  for (const g of pool) {
    const v = g.cropType?.trim();
    if (v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function cropTypeForGreenhouse(
  sites: FarmGreenhouseCatalogItem[],
  greenhouseId: string,
) {
  for (const farm of sites) {
    const gh = farm.greenhouses.find((g) => g.id === greenhouseId);
    if (gh?.cropType) return gh.cropType;
  }
  return null;
}

export function farmIdForGreenhouse(
  sites: FarmGreenhouseCatalogItem[],
  greenhouseId: string,
) {
  for (const farm of sites) {
    if (farm.greenhouses.some((g) => g.id === greenhouseId)) return farm.farmId;
  }
  return null;
}

export type ManagerFilterSelection = {
  farmId: string;
  greenhouseId: string;
  variety: string;
  dateYmds: string[];
  dateFilterAll: boolean;
};

export function matchesManagerDashboardFilters(
  sites: FarmGreenhouseCatalogItem[],
  filters: ManagerFilterSelection,
  item: {
    farmId?: string | null;
    greenhouseId?: string | null;
    greenhouseName?: string | null;
    cropType?: string | null;
    createdAt: string;
  },
) {
  if (!filters.dateFilterAll && !isOnAnySelectedDay(item.createdAt, filters.dateYmds)) {
    return false;
  }

  const catalogFarmIds = allowedFarmIds(sites);
  let farmId = item.farmId ?? null;
  if (!farmId && item.greenhouseId) {
    farmId = farmIdForGreenhouse(sites, item.greenhouseId);
  }
  if (!farmId && item.greenhouseName) {
    for (const farm of sites) {
      const gh = farm.greenhouses.find((g) => g.name === item.greenhouseName);
      if (gh) {
        farmId = farm.farmId;
        break;
      }
    }
  }

  if (catalogFarmIds.size > 0) {
    if (farmId && !catalogFarmIds.has(farmId)) return false;
    if (!farmId && item.greenhouseId) {
      const inCatalog = [...catalogFarmIds].some((fid) =>
        allowedGreenhouseIds(sites, fid).has(item.greenhouseId!),
      );
      if (!inCatalog) return false;
    }
  }

  if (filters.farmId !== ALL && farmId && farmId !== filters.farmId) {
    return false;
  }

  let cropType = item.cropType ?? null;
  if (!cropType && item.greenhouseId) {
    cropType = cropTypeForGreenhouse(sites, item.greenhouseId);
  }
  if (!cropType && item.greenhouseName) {
    for (const farm of sites) {
      const gh = farm.greenhouses.find((g) => g.name === item.greenhouseName);
      if (gh?.cropType) {
        cropType = gh.cropType;
        break;
      }
    }
  }

  if (filters.greenhouseId !== ALL) {
    if (item.greenhouseId && item.greenhouseId !== filters.greenhouseId) return false;
    if (!item.greenhouseId && item.greenhouseName) {
      const gh = greenhousesForFarm(sites, filters.farmId).find(
        (g) => g.id === filters.greenhouseId,
      );
      if (gh && item.greenhouseName !== gh.name) return false;
    }
    if (!item.greenhouseId && !item.greenhouseName) return false;
  }

  if (filters.variety !== ALL && cropType !== filters.variety) return false;

  return true;
}
