export const SCOUTING_DATA_CHANGED_EVENT = "vegpro:scouting-data-changed";

export function notifyScoutingDataChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SCOUTING_DATA_CHANGED_EVENT));
}
