import { create } from "zustand";

import {
  ALL,
  cropTypeForGreenhouse,
  greenhousesForFarm,
  todayDateYmd,
  varietiesForFarm,
} from "@/lib/manager-dashboard-filters";
import type { FarmGreenhouseCatalogItem } from "@/services/supervisor-access-service";

type State = {
  sites: FarmGreenhouseCatalogItem[];
  sitesLoaded: boolean;
  farmId: string;
  greenhouseId: string;
  variety: string;
  dateYmds: string[];
  dateFilterAll: boolean;
  setSites: (sites: FarmGreenhouseCatalogItem[]) => void;
  resetSitesLoad: () => void;
  setFarmId: (farmId: string) => void;
  setGreenhouseId: (greenhouseId: string) => void;
  setVariety: (variety: string) => void;
  addDateYmd: (ymd: string) => void;
  removeDateYmd: (ymd: string) => void;
  setDateFilterAll: (all: boolean) => void;
};

export const useManagerDashboardFilterStore = create<State>((set, get) => ({
  sites: [],
  sitesLoaded: false,
  farmId: ALL,
  greenhouseId: ALL,
  variety: ALL,
  dateYmds: [todayDateYmd()],
  dateFilterAll: false,

  setSites: (sites) => {
    const next: Partial<State> = { sites, sitesLoaded: true };
    if (sites.length === 1) {
      next.farmId = sites[0].farmId;
    } else if (get().farmId !== ALL && !sites.some((f) => f.farmId === get().farmId)) {
      next.farmId = ALL;
      next.greenhouseId = ALL;
      next.variety = ALL;
    }
    set(next);
  },

  setFarmId: (farmId) => {
    set({ farmId, greenhouseId: ALL, variety: ALL });
  },

  setGreenhouseId: (greenhouseId) => {
    if (greenhouseId === ALL) {
      set({ greenhouseId, variety: ALL });
      return;
    }
    const crop = cropTypeForGreenhouse(get().sites, greenhouseId);
    set({ greenhouseId, variety: crop ?? ALL });
  },

  setVariety: (variety) => {
    const { greenhouseId, sites, farmId } = get();
    if (greenhouseId !== ALL) {
      const crop = cropTypeForGreenhouse(sites, greenhouseId);
      if (variety !== ALL && crop && crop !== variety) {
        set({ greenhouseId: ALL, variety });
        return;
      }
    }
    if (variety !== ALL && greenhouseId === ALL) {
      const ghs = greenhousesForFarm(sites, farmId).filter(
        (g) => g.cropType === variety,
      );
      if (ghs.length === 1) {
        set({ greenhouseId: ghs[0].id, variety });
        return;
      }
    }
    set({ variety });
  },

  addDateYmd: (ymd) => {
    const trimmed = ymd.trim();
    if (!trimmed) return;
    set((s) => {
      if (s.dateYmds.includes(trimmed)) return { dateFilterAll: false };
      return { dateYmds: [...s.dateYmds, trimmed].sort(), dateFilterAll: false };
    });
  },

  removeDateYmd: (ymd) => {
    set((s) => {
      const next = s.dateYmds.filter((d) => d !== ymd);
      return { dateYmds: next.length ? next : [todayDateYmd()] };
    });
  },

  setDateFilterAll: (dateFilterAll) => set({ dateFilterAll }),
}));

function normalizeDateYmds(value: unknown): string[] {
  if (Array.isArray(value) && value.every((d) => typeof d === "string")) {
    return value.length ? value : [todayDateYmd()];
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [todayDateYmd()];
}

export function useManagerFilterSelection() {
  const farmId = useManagerDashboardFilterStore((s) => s.farmId);
  const greenhouseId = useManagerDashboardFilterStore((s) => s.greenhouseId);
  const variety = useManagerDashboardFilterStore((s) => s.variety);
  const dateYmdsRaw = useManagerDashboardFilterStore((s) => s.dateYmds);
  const dateFilterAll = useManagerDashboardFilterStore((s) => s.dateFilterAll);
  const sites = useManagerDashboardFilterStore((s) => s.sites);
  const dateYmds = normalizeDateYmds(dateYmdsRaw);

  return { farmId, greenhouseId, variety, dateYmds, dateFilterAll, sites };
}

export { varietiesForFarm, greenhousesForFarm, ALL };
