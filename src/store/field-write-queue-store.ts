import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { CreateScoutingRecordInput } from "@/services/supabase/scouting-service";
import type { ReportInfestationInput } from "@/services/supabase/infestation-service";
import type { LogSprayInput } from "@/services/supabase/spray-service";

export type PendingPhotoMeta = {
  blobKey: string;
  fileName: string;
  contentType: string;
};

export type QueuedScoutWrite = {
  id: string;
  kind: "scout";
  createdAt: string;
  payload: CreateScoutingRecordInput;
  pendingPhoto?: PendingPhotoMeta;
};

export type QueuedInfestationWrite = {
  id: string;
  kind: "infestation";
  createdAt: string;
  payload: ReportInfestationInput;
};

export type QueuedSprayWrite = {
  id: string;
  kind: "spray";
  createdAt: string;
  payload: LogSprayInput;
  markHotspotSprayed: boolean;
  pendingPhoto?: PendingPhotoMeta;
};

export type QueuedRoundStartWrite = {
  id: string;
  kind: "round_start";
  createdAt: string;
  payload: {
    id: string;
    scout_id: string;
    farm_id: string;
    greenhouse_id: string;
    started_at: string;
  };
};

export type QueuedRoundFinishWrite = {
  id: string;
  kind: "round_finish";
  createdAt: string;
  payload: {
    round_id: string;
    coveragePct: number | null;
  };
};

export type FieldQueuedWrite =
  | QueuedScoutWrite
  | QueuedInfestationWrite
  | QueuedSprayWrite
  | QueuedRoundStartWrite
  | QueuedRoundFinishWrite;

type FieldWriteQueueStore = {
  items: FieldQueuedWrite[];
  enqueueScout: (
    payload: CreateScoutingRecordInput,
    options?: { pendingPhoto?: PendingPhotoMeta },
  ) => string;
  enqueueInfestation: (payload: ReportInfestationInput) => void;
  enqueueSpray: (
    payload: LogSprayInput,
    options?: { markHotspotSprayed?: boolean; pendingPhoto?: PendingPhotoMeta },
  ) => string;
  enqueueRoundStart: (payload: QueuedRoundStartWrite["payload"]) => void;
  enqueueRoundFinish: (payload: QueuedRoundFinishWrite["payload"]) => void;
  remove: (id: string) => void;
};

function newId() {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useFieldWriteQueueStore = create<FieldWriteQueueStore>()(
  persist(
    (set) => ({
      items: [],
      enqueueScout: (payload, options) => {
        const id = newId();
        const createdAt = new Date().toISOString();
        set((s) => ({
          items: [
            ...s.items,
            {
              id,
              kind: "scout",
              createdAt,
              payload: {
                ...payload,
                recorded_at: payload.recorded_at ?? createdAt,
                image_url: options?.pendingPhoto ? null : payload.image_url,
              },
              pendingPhoto: options?.pendingPhoto,
            },
          ],
        }));
        return id;
      },
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
      enqueueSpray: (payload, options) => {
        const id = newId();
        set((s) => ({
          items: [
            ...s.items,
            {
              id,
              kind: "spray",
              createdAt: new Date().toISOString(),
              payload: {
                ...payload,
                image_url: options?.pendingPhoto ? null : payload.image_url ?? null,
              },
              markHotspotSprayed:
                options?.markHotspotSprayed ?? Boolean(payload.hotspot_id),
              pendingPhoto: options?.pendingPhoto,
            },
          ],
        }));
        return id;
      },
      enqueueRoundStart: (payload) =>
        set((s) => ({
          items: [
            ...s.items,
            {
              id: newId(),
              kind: "round_start",
              createdAt: new Date().toISOString(),
              payload,
            },
          ],
        })),
      enqueueRoundFinish: (payload) =>
        set((s) => ({
          items: [
            ...s.items,
            {
              id: newId(),
              kind: "round_finish",
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
