import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Locks farm/greenhouse context while a scouting round is active so Live GPS
 * cannot reassign the house and drop the round from the worker UI.
 */
export type ScoutingSession = {
  roundId: string;
  farmId: string;
  farmName: string;
  greenhouseId: string;
  greenhouseName: string;
  startedAt: string;
  stopCount: number;
  /** Local-only round waiting for round_start sync. */
  pendingOffline?: boolean;
};

type ScoutingSessionStore = {
  session: ScoutingSession | null;
  /** True only after the worker taps Start walking or Resume (not persisted). */
  walkEngaged: boolean;
  setSession: (session: ScoutingSession) => void;
  engageWalk: () => void;
  incrementStopCount: () => void;
  clearSession: () => void;
};

export const useScoutingSessionStore = create<ScoutingSessionStore>()(
  persist(
    (set) => ({
      session: null,
      walkEngaged: false,
      setSession: (session) =>
        set({
          session: {
            ...session,
            stopCount: session.stopCount ?? 0,
          },
        }),
      engageWalk: () => set({ walkEngaged: true }),
      incrementStopCount: () =>
        set((s) =>
          s.session
            ? { session: { ...s.session, stopCount: (s.session.stopCount ?? 0) + 1 } }
            : s,
        ),
      clearSession: () => set({ session: null, walkEngaged: false }),
    }),
    {
      name: "vegpro-scouting-session",
      partialize: (state) => ({ session: state.session }),
    },
  ),
);

/** Worker is actively walking (logging allowed, greenhouse locked). */
export function isScoutingWalkEngaged(
  walkEngaged: boolean,
  session: ScoutingSession | null,
  demoActiveRoundId: string | null,
  supabaseConfigured: boolean,
) {
  if (!walkEngaged) return false;
  if (session) return true;
  return !supabaseConfigured && Boolean(demoActiveRoundId);
}
