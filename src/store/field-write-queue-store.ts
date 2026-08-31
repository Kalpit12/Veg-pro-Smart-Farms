import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { CreateScoutingRecordInput } from "@/services/supabase/scouting-service";
import type { ReportInfestationInput } from "@/services/supabase/infestation-service";

export type QueuedScoutWrite = {
  id: string;
  kind: "scout";
  createdAt: string;
  payload: CreateScoutingRecordInput;
};

export type QueuedInfestationWrite = {
  id: string;
  kind: "infestation";
  createdAt: string;
  payload: ReportInfestationInput;
};

export type FieldQueuedWrite = QueuedScoutWrite | QueuedInfestationWrite;

type FieldWriteQueueStore = {
  items: FieldQueuedWrite[];
  enqueueScout: (payload: CreateScoutingRecordInput) => void;
  enqueueInfestation: (payload: ReportInfestationInput) => void;
  remove: (id: string) => void;
};

function newId() {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useFieldWriteQueueStore = create<FieldWriteQueueStore>()(
  persist(
    (set) => ({
      items: [],
      enqueueScout: (payload) =>
        set((s) => ({
          items: [
            ...s.items,
            { id: newId(), kind: "scout", createdAt: new Date().toISOString(), payload },
          ],
        })),
      enqueueInfestation: (payload) =>
        set((s) => ({
          items: [
            ...s.items,
            {
              id: newId(),
              kind: "infestation",
              createdAt: new Date().toISOString(),
              payload,
            },
          ],
        })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
    }),
    { name: "vegpro-field-write-queue" },
  ),
);

export function isLikelyOfflineError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error ?? "");
  return /failed to fetch|network|offline|ERR_INTERNET|Load failed|fetch/i.test(msg);
}
