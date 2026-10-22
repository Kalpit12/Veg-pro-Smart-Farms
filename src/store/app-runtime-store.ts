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
      return;
    }
    try {
      const res = await fetch("/api/app/config", { cache: "no-store" });
      const json = (await res.json()) as { production?: boolean };
      if (json.production) {
        window.__VEGPRO_FORCE_PRODUCTION__ = true;
        window.dispatchEvent(new Event("vegpro-runtime-config"));
        set({ hydrated: true, forceProduction: true });
      } else {
        set({ hydrated: true, forceProduction: false });
      }
    } catch {
      set({ hydrated: true, forceProduction: false });
    }
  },
}));
