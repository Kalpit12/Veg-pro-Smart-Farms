export const SCOUTING_WALK_FINISHED_EVENT = "vegpro:walk-finished";

export function notifyScoutingWalkFinished() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SCOUTING_WALK_FINISHED_EVENT));
}
