export type ScoutCellLocation = {
  column: number;
  bay: number;
};

export const SCOUT_NONE_FOUND = "None found";

export type ScoutObservationHandoff = {
  beds: number;
  column: number;
  bay: number;
  issueType: "pest" | "disease";
  issueName: string;
  rating?: number;
};

export function isClearScoutObservation(issueName: string) {
  return issueName.trim().toLowerCase() === SCOUT_NONE_FOUND.toLowerCase();
}

export function scoutRatingToDiseaseSeverity(rating: number): 1 | 2 | 3 {
  if (rating <= 2) return 1;
  if (rating <= 3) return 2;
  return 3;
}

export function formatScoutHandoffNotes(handoff: ScoutObservationHandoff): string {
  const rating = handoff.rating != null ? ` · Rating ${handoff.rating}/5` : "";
  return `Scouted Col ${handoff.column} · Bay ${handoff.bay} · ${handoff.issueName}${rating}`;
}
