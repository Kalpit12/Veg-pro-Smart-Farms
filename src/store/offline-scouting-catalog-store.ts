import { create } from "zustand";
import { persist } from "zustand/middleware";

import { BEMACK_CATEGORIES } from "@/lib/bemack-master-data";

/** Super Premium category id from sql/mssql/002_seed_bemack_core.sql */
export const BEMACK_SUPER_PREMIUM_CATEGORY_ID =
  "ccccccc1-1111-1111-1111-111111111111";

type CatalogState = {
  categoryByName: Record<string, string>;
  varietyByName: Record<string, string>;
  parameterByKey: Record<string, string>;
  cachedAt: string | null;
  setFromApi: (input: {
    categories: { id: string; name: string }[];
    varieties: { id: string; name: string; category_id: string }[];
    parameters: { id: string; param_key: string }[];
  }) => void;
  resolveCategoryId: (name: string) => string | null;
  resolveVarietyId: (name: string) => string | null;
  resolveParameterId: (paramKey: string) => string | null;
};

export const useOfflineScoutingCatalogStore = create<CatalogState>()(
  persist(
    (set, get) => ({
      categoryByName: { [BEMACK_CATEGORIES[0]]: BEMACK_SUPER_PREMIUM_CATEGORY_ID },
      varietyByName: {},
      parameterByKey: {},
      cachedAt: null,
      setFromApi: ({ categories, varieties, parameters }) => {
        const categoryByName: Record<string, string> = {
          ...get().categoryByName,
        };
        for (const c of categories) categoryByName[c.name] = c.id;
        const varietyByName: Record<string, string> = { ...get().varietyByName };
        for (const v of varieties) varietyByName[v.name] = v.id;
        const parameterByKey: Record<string, string> = { ...get().parameterByKey };
        for (const p of parameters) parameterByKey[p.param_key] = p.id;
        set({
          categoryByName,
          varietyByName,
          parameterByKey,
          cachedAt: new Date().toISOString(),
        });
      },
      resolveCategoryId: (name) => get().categoryByName[name] ?? null,
      resolveVarietyId: (name) => get().varietyByName[name] ?? null,
      resolveParameterId: (paramKey) => get().parameterByKey[paramKey] ?? null,
    }),
    { name: "vegpro-offline-scouting-catalog" },
  ),
);
