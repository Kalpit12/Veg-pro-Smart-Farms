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
  dateYmd: string;
  setSites: (sites: FarmGreenhouseCatalogItem[]) => void;
  resetSitesLoad: () => void;
  setFarmId: (farmId: string) => void;
  setGreenhouseId: (greenhouseId: string) => void;
  setVariety: (variety: string) => void;
  setDateYmd: (dateYmd: string) => void;
};

export const useManagerDashboardFilterStore = create<State>((set, get) => ({
  sites: [],
  sitesLoaded: false,
  farmId: ALL,
  greenhouseId: ALL,
  variety: ALL,
  dateYmd: todayDateYmd(),

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

  setDateYmd: (dateYmd) => set({ dateYmd }),

  resetSitesLoad: () => set({ sites: [], sitesLoaded: false }),
}));

export function useManagerFilterSelection() {
  const farmId = useManagerDashboardFilterStore((s) => s.farmId);
  const greenhouseId = useManagerDashboardFilterStore((s) => s.greenhouseId);
  const variety = useManagerDashboardFilterStore((s) => s.variety);
  const dateYmd = useManagerDashboardFilterStore((s) => s.dateYmd);
  const sites = useManagerDashboardFilterStore((s) => s.sites);
  return { farmId, greenhouseId, variety, dateYmd, sites };
}

export { varietiesForFarm, greenhousesForFarm, ALL };
