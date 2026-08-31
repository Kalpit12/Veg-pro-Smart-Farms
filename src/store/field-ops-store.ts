import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  seedStarFlowAlerts,
  seedStarFlowHotspots,
  seedStarFlowSprays,
} from "@/lib/demo-star-flow";
import { bemackLocationByName } from "@/lib/bemack-master-data";
import type { HotspotRow } from "@/services/supabase/infestation-service";
import type { InfestationStatus } from "@/types/db";

export type DemoSprayRow = {
  id: string;
  worker_id: string;
  farm_id: string;
  greenhouse_id: string | null;
  hotspot_id: string | null;
  latitude: number;
  longitude: number;
  product_name: string;
  notes: string | null;
  created_at: string;
  users?: { full_name?: string } | null;
  farms?: { name?: string } | null;
  greenhouses?: { name?: string } | null;
};

function seedHotspots(): HotspotRow[] {
  return seedStarFlowHotspots();
}

export type DemoAlertRow = {
  id: string;
  type: string;
  message: string;
  created_at: string;
};

function seedDemoAlerts(): DemoAlertRow[] {
  return seedStarFlowAlerts();
}

type FieldOpsStore = {
  demoHotspots: HotspotRow[];
  demoSprays: DemoSprayRow[];
  demoAlerts: DemoAlertRow[];
  addDemoHotspot: (input: {
    farmId: string;
    farmName: string;
    greenhouseId: string | null;
    greenhouseName: string;
    latitude: number;
    longitude: number;
    pest_type: string;
    problem: string;
    main_issue: string;
    severity: number;
    scoutName?: string;
  }) => void;
  addDemoSpray: (input: {
    farmId: string;
    farmName: string;
    greenhouseId: string | null;
    greenhouseName: string;
    latitude: number;
    longitude: number;
    product_name: string;
    notes?: string;
    hotspot_id?: string | null;
    workerName?: string;
  }) => void;
  addDemoAlert: (type: string, message: string) => void;
  updateDemoHotspotStatus: (id: string, status: InfestationStatus) => void;
};

export const useFieldOpsStore = create<FieldOpsStore>()(
  persist(
    (set) => ({
      demoHotspots: seedHotspots(),
      demoSprays: seedStarFlowSprays(),
      demoAlerts: seedDemoAlerts(),
      addDemoHotspot: (input) =>
        set((s) => ({
          demoHotspots: [
            {
              id: `demo-hotspot-${Date.now()}`,
              farm_id: input.farmId,
              greenhouse_id: input.greenhouseId,
              reported_by: "demo-worker",
              latitude: input.latitude,
              longitude: input.longitude,
              pest_type: input.pest_type,
              problem: input.problem,
              main_issue: input.main_issue,
              severity: input.severity,
              status: "active",
              created_at: new Date().toISOString(),
              farms: { name: input.farmName },
              greenhouses: { name: input.greenhouseName },
              users: { full_name: input.scoutName ?? "Field worker" },
            } as HotspotRow,
            ...s.demoHotspots,
          ],
          demoAlerts: [
            {
              id: `demo-alert-${Date.now()}`,
              type: "infestation",
              message: `New ${input.pest_type} report at ${input.greenhouseName} — log spray response.`,
              created_at: new Date().toISOString(),
            },
            ...s.demoAlerts,
          ],
        })),
      addDemoSpray: (input) =>
        set((s) => ({
          demoHotspots: input.hotspot_id
            ? s.demoHotspots.map((h) =>
                h.id === input.hotspot_id ? { ...h, status: "sprayed" as const } : h,
              )
            : s.demoHotspots,
          demoSprays: [
            {
              id: `demo-spray-${Date.now()}`,
              worker_id: "demo-worker",
              farm_id: input.farmId,
              greenhouse_id: input.greenhouseId,
              hotspot_id: input.hotspot_id ?? null,
              latitude: input.latitude,
              longitude: input.longitude,
              product_name: input.product_name,
              notes: input.notes ?? null,
              created_at: new Date().toISOString(),
              users: { full_name: input.workerName ?? "Field worker" },
              farms: { name: input.farmName },
              greenhouses: { name: input.greenhouseName },
            },
            ...s.demoSprays,
          ],
        })),
      addDemoAlert: (type, message) =>
        set((s) => ({
          demoAlerts: [
            {
              id: `demo-alert-${Date.now()}`,
              type,
              message,
              created_at: new Date().toISOString(),
            },
            ...s.demoAlerts,
          ],
        })),
      updateDemoHotspotStatus: (id, status) =>
        set((s) => ({
          demoHotspots: s.demoHotspots.map((h) =>
            h.id === id ? { ...h, status } : h,
          ),
        })),
    }),
    { name: "vegpro-field-ops-demo-star-v2" },
  ),
);

/** Demo worker positions at field greenhouses (not admin/browser GPS). */
export function getDemoWorkerPositions() {
  const gh01 = bemackLocationByName("STGH01A")!;
  const gh05 = bemackLocationByName("STGH05A")!;
  const now = new Date().toISOString();
  return [
    {
      worker_id: "demo-worker-1",
      latitude: gh01.lat + 0.00004,
      longitude: gh01.lng + 0.00002,
      updated_at: now,
      users: { full_name: "Field Worker — STGH01A", role: "worker" as const },
    },
    {
      worker_id: "demo-worker-2",
      latitude: gh05.lat + 0.00003,
      longitude: gh05.lng - 0.00002,
      updated_at: now,
      users: { full_name: "Field Worker — STGH05A", role: "worker" as const },
    },
  ];
}

export function bemackMapCenter() {
  const gh = bemackLocationByName("STGH01A")!;
  return { lat: gh.lat, lng: gh.lng };
}
