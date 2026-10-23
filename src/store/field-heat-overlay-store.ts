import { kenyaNowIso } from "@/lib/kenya-time";
import { create } from "zustand";

import type { ScoutingIssueType } from "@/types/db";

export type FieldHeatOverlay = {
  id: string;
  greenhouseName: string;
  columnNo: number;
  bayNo: number;
  issueType: ScoutingIssueType;
  issue: string;
  rating: number | null;
  recordedAt: string;
};

type FieldHeatOverlayStore = {
  overlays: FieldHeatOverlay[];
  push: (entry: Omit<FieldHeatOverlay, "id" | "recordedAt"> & { recordedAt?: string }) => void;
  clearForGreenhouse: (greenhouseName: string) => void;
};

export const useFieldHeatOverlayStore = create<FieldHeatOverlayStore>((set) => ({
  overlays: [],
  push: (entry) =>
    set((s) => ({
      overlays: [
        ...s.overlays.filter(
          (o) =>
            !(
              o.greenhouseName === entry.greenhouseName &&
              o.columnNo === entry.columnNo &&
              o.bayNo === entry.bayNo &&
              o.issue === entry.issue
            ),
        ),
        {
          ...entry,
          id: `heat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          recordedAt: entry.recordedAt ?? kenyaNowIso(),
        },
      ],
    })),
  clearForGreenhouse: (greenhouseName) =>
    set((s) => ({
      overlays: s.overlays.filter((o) => o.greenhouseName !== greenhouseName),
    })),
}));
