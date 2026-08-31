import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Locks farm/greenhouse context while a scouting round is active so Live GPS
 * cannot reassign the house and drop the round from the worker UI.
 */
type ScoutingSession = {
  roundId: string;
  farmId: string;
  farmName: string;
  greenhouseId: string;
  greenhouseName: string;
  startedAt: string;
};

type ScoutingSessionStore = {
  session: ScoutingSession | null;
  setSession: (session: ScoutingSession) => void;
  clearSession: () => void;
};

export const useScoutingSessionStore = create<ScoutingSessionStore>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
    }),
    { name: "vegpro-scouting-session" },
  ),
);
