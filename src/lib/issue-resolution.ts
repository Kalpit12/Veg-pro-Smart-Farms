import type { InfestationStatus } from "@/types/db";

export type HotspotResolutionRef = {
  greenhouseName: string;
  pestType: string;
  status: InfestationStatus;
};

export function normalizeIssueToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Match scouting issue names (e.g. White Flies) to hotspot pest types (e.g. Whitefly). */
export function scoutingIssueMatchesHotspot(scoutingIssue: string, pestType: string) {
  const a = normalizeIssueToken(scoutingIssue);
  const b = normalizeIssueToken(pestType);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function isHotspotClosed(status: InfestationStatus | string) {
  return status === "sprayed" || status === "resolved";
}

export function getIssueResolutionStatus(
  greenhouseName: string,
  issue: string,
  hotspots: HotspotResolutionRef[],
): "resolved" | "pending" {
  const matches = hotspots.filter(
    (h) =>
      h.greenhouseName === greenhouseName &&
      scoutingIssueMatchesHotspot(issue, h.pestType),
  );
  if (!matches.length) return "pending";
  if (matches.some((h) => h.status === "active")) return "pending";
  if (matches.some((h) => isHotspotClosed(h.status))) return "resolved";
  return "pending";
}

export function filterUnresolvedScoutingRecords<
  T extends { greenhouseName: string; issue: string },
>(records: T[], hotspots: HotspotResolutionRef[]): T[] {
  return records.filter(
    (record) =>
      getIssueResolutionStatus(record.greenhouseName, record.issue, hotspots) ===
      "pending",
  );
}
