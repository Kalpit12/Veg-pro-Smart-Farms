import type { ScoutingSession } from "@/store/scouting-session-store";
import type { DemoScoutingRound } from "@/store/scouting-store";

export type PendingWalkInfo = {
  roundId: string;
  greenhouseName: string;
  stopCount: number;
};

export function pendingWalkFromSession(
  session: ScoutingSession | null,
): PendingWalkInfo | null {
  if (!session) return null;
  return {
    roundId: session.roundId,
    greenhouseName: session.greenhouseName,
    stopCount: session.stopCount ?? 0,
  };
}

export function pendingWalkFromDemoRound(
  round: DemoScoutingRound | undefined,
): PendingWalkInfo | null {
  if (!round || round.status !== "active") return null;
  return {
    roundId: round.id,
    greenhouseName: round.greenhouseName,
    stopCount: round.stopCount,
  };
}
