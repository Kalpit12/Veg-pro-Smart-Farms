import { create } from "zustand";
import { persist } from "zustand/middleware";

import { seedStarFlowRecords, seedStarFlowRounds } from "@/lib/demo-star-flow";
import type { BemackCategory } from "@/lib/bemack-master-data";
import type { ScoutingIssueType } from "@/types/db";

export type DemoScoutingRound = {
  id: string;
  scoutName: string;
  farmId: string;
  greenhouseId: string;
  greenhouseName: string;
  startedAt: string;
  endedAt?: string | null;
  status: "active" | "completed";
  stopCount: number;
  distanceM?: number;
  durationS?: number | null;
  pointCount?: number;
  coveragePct?: number | null;
};

export type DemoRoutePoint = {
  id: string;
  roundId: string;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  recordedAt: string;
};

export type DemoScoutingRecord = {
  id: string;
  roundId?: string | null;
  scoutName: string;
  farmName: string;
  farmId: string;
  greenhouseName: string;
  greenhouseId: string;
  category: BemackCategory;
  variety: string;
  beds: number;
  columnNo: number;
  bayNo: number;
  issueType: ScoutingIssueType;
  issue: string;
  rating: number | null;
  recordedAt: string;
  latitude: number | null;
  longitude: number | null;
  observations: { parameterId: string; present: boolean; rating: number | null }[];
};

function seedDemoRounds(): DemoScoutingRound[] {
  return seedStarFlowRounds();
}

function seedDemoRoutePoints(): DemoRoutePoint[] {
  const rounds = seedStarFlowRounds();
  const points: DemoRoutePoint[] = [];
  for (const round of rounds) {
    let lat = -1.2921;
    let lng = 36.8219;
    const base = new Date(round.startedAt).getTime();
    for (let i = 0; i < 16; i++) {
      lat += Math.sin(i / 5) * 0.00004 + 0.00001;
      lng += Math.cos(i / 7) * 0.00005 + 0.000012;
      points.push({
        id: `demo-route-${round.id}-${i + 1}`,
        roundId: round.id,
        latitude: lat,
        longitude: lng,
        accuracyM: 8,
        recordedAt: new Date(base + i * 75_000).toISOString(),
      });
    }
  }
  return points;
}

function seedDemoRecords(): DemoScoutingRecord[] {
  return seedStarFlowRecords();
}

type ScoutingStore = {
  demoRecords: DemoScoutingRecord[];
  demoRounds: DemoScoutingRound[];
  demoRoutePoints: DemoRoutePoint[];
  activeRoundId: string | null;
  addDemoRecord: (
    record: Omit<DemoScoutingRecord, "id" | "recordedAt"> & { recordedAt?: string },
  ) => void;
  addDemoRoutePoint: (point: Omit<DemoRoutePoint, "id">) => void;
  startDemoRound: (round: Omit<DemoScoutingRound, "id" | "startedAt" | "stopCount" | "status">) => string;
  completeDemoRound: (roundId: string, metrics?: {
    distanceM?: number;
    durationS?: number;
    pointCount?: number;
    coveragePct?: number | null;
  }) => void;
  resetDemo: () => void;
};

export const useScoutingStore = create<ScoutingStore>()(
  persist(
    (set, get) => ({
      demoRecords: seedDemoRecords(),
      demoRounds: seedDemoRounds(),
      demoRoutePoints: seedDemoRoutePoints(),
      activeRoundId: null,
      addDemoRecord: (record) => {
        const activeId = get().activeRoundId;
        set((s) => {
          const rounds = s.demoRounds.map((r) =>
            r.id === activeId ? { ...r, stopCount: r.stopCount + 1 } : r,
          );
          return {
            demoRecords: [
              {
                ...record,
                roundId: record.roundId ?? activeId,
                id: `demo-scout-${Date.now()}`,
                recordedAt: record.recordedAt ?? new Date().toISOString(),
              },
              ...s.demoRecords,
            ],
            demoRounds: rounds,
          };
        });
      },
      addDemoRoutePoint: (point) => {
        set((s) => ({
          demoRoutePoints: [
            ...s.demoRoutePoints,
            { ...point, id: `demo-route-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
          ],
        }));
      },
      startDemoRound: (round) => {
        const id = `demo-round-${Date.now()}`;
        set((s) => ({
          activeRoundId: id,
          demoRounds: [
            {
              ...round,
              id,
              startedAt: new Date().toISOString(),
              status: "active",
              stopCount: 0,
              distanceM: 0,
              durationS: null,
              pointCount: 0,
              coveragePct: null,
            },
            ...s.demoRounds,
          ],
        }));
        return id;
      },
      completeDemoRound: (roundId, metrics) =>
        set((s) => ({
          activeRoundId: s.activeRoundId === roundId ? null : s.activeRoundId,
          demoRounds: s.demoRounds.map((r) =>
            r.id === roundId
              ? {
                  ...r,
                  status: "completed" as const,
                  endedAt: new Date().toISOString(),
                  distanceM: metrics?.distanceM ?? r.distanceM ?? 0,
                  durationS: metrics?.durationS ?? r.durationS ?? null,
                  pointCount: metrics?.pointCount ?? r.pointCount ?? 0,
                  coveragePct: metrics?.coveragePct ?? r.coveragePct ?? null,
                }
              : r,
          ),
        })),
      resetDemo: () =>
        set({
          demoRecords: seedDemoRecords(),
          demoRounds: seedDemoRounds(),
          demoRoutePoints: seedDemoRoutePoints(),
          activeRoundId: null,
        }),
    }),
    { name: "vegpro-scouting-demo-star-v2" },
  ),
);
