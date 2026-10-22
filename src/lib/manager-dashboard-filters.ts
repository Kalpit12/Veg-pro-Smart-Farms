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

export function formatHeaderDate(ymd: string) {
  const { from } = calendarDayWindow(ymd);
  return format(from, "EEEE, d MMMM yyyy");
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

export type ManagerFilterSelection = {
  farmId: string;
  greenhouseId: string;
  variety: string;
  dateYmd: string;
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
  if (!isOnCalendarDay(item.createdAt, filters.dateYmd)) return false;

  if (filters.farmId !== ALL && item.farmId && item.farmId !== filters.farmId) {
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
  }

  if (filters.variety !== ALL && cropType !== filters.variety) return false;

  return true;
}
