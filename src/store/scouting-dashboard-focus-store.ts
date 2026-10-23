import { create } from "zustand";

/** Links manager scouting heat map ↔ scout route round picker. */
type ScoutingDashboardFocusState = {
  greenhouseName: string | null;
  greenhouseId: string | null;
  roundId: string | null;
  setRoundFocus: (
    greenhouseName: string,
    roundId: string,
    greenhouseId?: string | null,
  ) => void;
  setGreenhouseFocus: (greenhouseName: string) => void;
  clearRoundFocus: () => void;
};

export const useScoutingDashboardFocusStore = create<ScoutingDashboardFocusState>((set) => ({
  greenhouseName: null,
  greenhouseId: null,
  roundId: null,
  setRoundFocus: (greenhouseName, roundId, greenhouseId = null) =>
    set({ greenhouseName, roundId, greenhouseId: greenhouseId ?? null }),
  setGreenhouseFocus: (greenhouseName) => set({ greenhouseName }),
  clearRoundFocus: () => set({ roundId: null, greenhouseId: null }),
}));
