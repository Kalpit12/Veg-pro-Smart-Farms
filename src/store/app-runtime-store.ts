"use client";

import { create } from "zustand";

import { hasConfiguredBackend } from "@/lib/data-backend";

type AppRuntimeState = {
  hydrated: boolean;
  /** Server says MSSQL/Supabase (overrides missing NEXT_PUBLIC at build time). */
  forceProduction: boolean;
  hydrateFromServer: () => Promise<void>;
};

export const useAppRuntimeStore = create<AppRuntimeState>((set, get) => ({
  hydrated: hasConfiguredBackend(),
  forceProduction: hasConfiguredBackend(),
  hydrateFromServer: async () => {
    if (hasConfiguredBackend()) {
      window.__VEGPRO_FORCE_PRODUCTION__ = true;
      set({ hydrated: true, forceProduction: true });
    }
    try {
      const res = await fetch("/api/app/config", { cache: "no-store" });
      const json = (await res.json()) as {
        production?: boolean;
        dataBackend?: "mssql" | "supabase" | "demo";
      };
      if (json.dataBackend) {
        window.__VEGPRO_DATA_BACKEND__ = json.dataBackend;
      }
      if (
        json.production ||
        json.dataBackend === "mssql" ||
        json.dataBackend === "supabase"
      ) {
        window.__VEGPRO_FORCE_PRODUCTION__ = true;
        window.dispatchEvent(new Event("vegpro-runtime-config"));
        set({ hydrated: true, forceProduction: true });
      } else if (!get().hydrated) {
        set({ hydrated: true, forceProduction: false });
      }
    } catch {
      if (!get().hydrated) {
        set({ hydrated: true, forceProduction: false });
      }
    }
  },
}));
