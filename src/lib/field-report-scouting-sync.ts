/** Shared types for field walk reports → scouting_records mirror (server + client). */

export type FieldReportLine =
  | { kind: "pest"; name: string; count: number }
  | { kind: "disease"; name: string; severity: 1 | 2 | 3 };

export type FieldScoutingMirrorInput = {
  column: number;
  bay: number;
  greenhouseName: string;
  line: FieldReportLine;
  zoneLabel: string;
  notes: string | null;
  roundId: string | null;
  latitude: number;
  longitude: number;
  recordedAt?: string;
};
