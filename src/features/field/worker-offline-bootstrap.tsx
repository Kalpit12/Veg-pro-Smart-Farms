"use client";

import { useEffect } from "react";

import { FieldWriteQueueSync } from "@/features/field/field-write-queue-sync";
import { hasConfiguredBackend, isOfflineDemo } from "@/lib/data-backend";
import { getCurrentUser } from "@/services/supabase/auth-service";
import {
  listCropCategories,
  listCropVarieties,
  listScoutingParameters,
} from "@/services/supabase/scouting-service";
import { useOfflineScoutingCatalogStore } from "@/store/offline-scouting-catalog-store";

/** Worker shell: queue banner + warm catalog cache for offline scouting saves. */
export function WorkerOfflineBootstrap() {
  useEffect(() => {
    if (isOfflineDemo() || !hasConfiguredBackend()) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    void (async () => {
      await getCurrentUser();
      const [cats, varieties, parameters] = await Promise.all([
        listCropCategories(),
        listCropVarieties(),
        listScoutingParameters(),
      ]);
      if (cats.error || varieties.error || parameters.error) return;
      useOfflineScoutingCatalogStore.getState().setFromApi({
        categories: (cats.data ?? []).map((c) => ({ id: c.id, name: c.name })),
        varieties: (varieties.data ?? []).map((v) => ({
          id: v.id,
          name: v.name,
          category_id: v.category_id,
        })),
        parameters: (parameters.data ?? []).map((r) => ({
          id: r.id,
          param_key: r.param_key,
        })),
      });
    })();
  }, []);

  return <FieldWriteQueueSync />;
}
