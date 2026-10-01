import { create } from "zustand";
import { persist } from "zustand/middleware";

type ScanContext = {
  qrValue: string | null;
  farmId: string | null;
  greenhouseId: string | null;
  farmName?: string;
  greenhouseName?: string;
  /** Check-in or manual override — GPS must not switch houses. */
  assignmentLocked: boolean;
  setContext: (ctx: Partial<ScanContext>) => void;
  lockAssignment: () => void;
  unlockAssignment: () => void;
  clear: () => void;
};

const empty = {
  qrValue: null as string | null,
  farmId: null as string | null,
  greenhouseId: null as string | null,
  farmName: undefined as string | undefined,
  greenhouseName: undefined as string | undefined,
  assignmentLocked: false,
};

export const useScanStore = create<ScanContext>()(
  persist(
    (set) => ({
      ...empty,
      setContext: (ctx) => set((s) => ({ ...s, ...ctx })),
      lockAssignment: () => set({ assignmentLocked: true }),
      unlockAssignment: () => set({ assignmentLocked: false }),
      clear: () => set({ ...empty }),
    }),
    {
      name: "vegpro-scan-assignment",
      partialize: (s) => ({
        qrValue: s.qrValue,
        farmId: s.farmId,
        greenhouseId: s.greenhouseId,
        farmName: s.farmName,
        greenhouseName: s.greenhouseName,
        assignmentLocked: s.assignmentLocked,
      }),
    },
  ),
);
