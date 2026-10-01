import {
  bayMaxForGreenhouse,
  columnCountForBay,
  greenhouseCellExists,
} from "@/lib/bemack-master-data";

/**
 * Minimum cells a scout should sample in one round for a greenhouse.
 * Targets ~25% of layout (capped) so coverage stays meaningful without
 * requiring a full house walk every visit.
 */
export function samplingTargetForGreenhouse(greenhouseName: string | null | undefined) {
  if (!greenhouseName) {
    return { expectedCells: 0, targetStops: 8, walkHint: "Walk both sides of the house." };
  }

  const bayMax = bayMaxForGreenhouse(greenhouseName);
  let expectedCells = 0;
  for (let bay = 1; bay <= bayMax; bay++) {
    const cols = columnCountForBay(greenhouseName, bay);
    for (let col = 1; col <= cols; col++) {
      if (greenhouseCellExists(greenhouseName, col, bay)) expectedCells += 1;
    }
  }

  const targetStops = Math.max(
    6,
    Math.min(16, Math.ceil(expectedCells * 0.25) || 8),
  );

  return {
    expectedCells,
    targetStops,
    walkHint: `Sample at least ${targetStops} cells (of ~${expectedCells}). Walk both sides, then finish.`,
  };
}
