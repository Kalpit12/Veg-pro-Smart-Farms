import { create } from "zustand";
import { persist } from "zustand/middleware";

import { evaluateRoutePoint } from "@/lib/route-metrics";

export type BufferedRoutePoint = {
  id: string;
  roundId: string;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  recordedAt: string;
  synced: boolean;
};

export type RoutePointRejectReason =
  | "poor_accuracy"
  | "too_soon"
  | "gps_noise"
  | "impossible_speed";

type ScoutingRouteBufferStore = {
  points: BufferedRoutePoint[];
  lastRejectReason: RoutePointRejectReason | null;
  addPoint: (input: {
    roundId: string;
    latitude: number;
    longitude: number;
    accuracyM?: number | null;
    recordedAt?: string;
  }) => BufferedRoutePoint | null;
  getPointsForRound: (roundId: string) => BufferedRoutePoint[];
  getUnsynced: (roundId?: string) => BufferedRoutePoint[];
  markSynced: (ids: string[]) => void;
  clearRound: (roundId: string) => void;
};

export const useScoutingRouteBufferStore = create<ScoutingRouteBufferStore>()(
  persist(
    (set, get) => ({
      points: [],
      lastRejectReason: null,
      addPoint: (input) => {
        const recordedAt = input.recordedAt ?? new Date().toISOString();
        const existing = get()
          .points.filter((p) => p.roundId === input.roundId)
          .sort(
            (a, b) =>
              new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
          );
        const last = existing[existing.length - 1] ?? null;
        const decision = evaluateRoutePoint(
          last
            ? {
                latitude: last.latitude,
                longitude: last.longitude,
                recordedAt: last.recordedAt,
                accuracyM: last.accuracyM,
              }
            : null,
          {
            latitude: input.latitude,
            longitude: input.longitude,
            recordedAt,
            accuracyM: input.accuracyM,
          },
        );

        if (!decision.accept) {
          set({ lastRejectReason: decision.reason });
          return null;
        }

        const point: BufferedRoutePoint = {
          id: `route-${input.roundId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          roundId: input.roundId,
          latitude: input.latitude,
          longitude: input.longitude,
          accuracyM: input.accuracyM ?? null,
          recordedAt,
          synced: false,
        };

        set((s) => {
          const kept = s.points
            .filter((p) => p.roundId === input.roundId || !p.synced)
            .slice(-1999);
          return { points: [...kept, point], lastRejectReason: null };
        });
        return point;
      },
      getPointsForRound: (roundId) =>
        get()
          .points.filter((p) => p.roundId === roundId)
          .sort(
            (a, b) =>
              new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
          ),
      getUnsynced: (roundId) =>
        get().points.filter(
          (p) => !p.synced && (roundId ? p.roundId === roundId : true),
        ),
      markSynced: (ids) => {
        if (!ids.length) return;
        const idSet = new Set(ids);
        set((s) => ({
          points: s.points.map((p) => (idSet.has(p.id) ? { ...p, synced: true } : p)),
        }));
      },
      clearRound: (roundId) =>
        set((s) => ({
          points: s.points.filter((p) => p.roundId !== roundId),
          lastRejectReason: null,
        })),
    }),
    {
      name: "vegpro-scouting-route-buffer",
      partialize: (s) => ({ points: s.points }),
    },
  ),
);
