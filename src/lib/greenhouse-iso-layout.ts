import type { ScoutRouteStop } from "@/lib/scout-route";

export type IsoPoint = { x: number; y: number };

export type GreenhouseIsoLayout = {
  maxColumn: number;
  maxBay: number;
  floor: IsoPoint[];
  wallLeft: IsoPoint[];
  wallRight: IsoPoint[];
  wallBack: IsoPoint[];
  project: (column: number, bay: number) => IsoPoint;
};

function add(a: IsoPoint, b: IsoPoint): IsoPoint {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scale(v: IsoPoint, s: number): IsoPoint {
  return { x: v.x * s, y: v.y * s };
}

export function buildGreenhouseIsoLayout(
  stops: Pick<ScoutRouteStop, "columnNo" | "bayNo">[],
  width: number,
  height: number,
): GreenhouseIsoLayout {
  const maxColumn = Math.max(12, ...stops.map((s) => s.columnNo), 1);
  const maxBay = Math.max(8, ...stops.map((s) => s.bayNo), 1);

  const origin: IsoPoint = { x: width * 0.5, y: height * 0.78 };
  const colVec = scale({ x: width * 0.034, y: -height * 0.019 }, 1);
  const bayVec = scale({ x: -width * 0.034, y: -height * 0.019 }, 1);
  const wallLift = { x: 0, y: -height * 0.14 };

  const corner = (column: number, bay: number): IsoPoint =>
    add(add(origin, scale(colVec, column / maxColumn)), scale(bayVec, bay / maxBay));

  const floor = [
    corner(0, 0),
    corner(maxColumn, 0),
    corner(maxColumn, maxBay),
    corner(0, maxBay),
  ];

  const wallLeft = [floor[0], floor[3], add(floor[3], wallLift), add(floor[0], wallLift)];
  const wallRight = [floor[1], floor[2], add(floor[2], wallLift), add(floor[1], wallLift)];
  const wallBack = [floor[3], floor[2], add(floor[2], wallLift), add(floor[3], wallLift)];

  const project = (column: number, bay: number): IsoPoint => {
    const nx = (column - 0.5) / maxColumn;
    const ny = (bay - 0.5) / maxBay;
    return add(add(origin, scale(colVec, nx)), scale(bayVec, ny));
  };

  return { maxColumn, maxBay, floor, wallLeft, wallRight, wallBack, project };
}

export function isoPoly(points: IsoPoint[]) {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

export function stopSeverityColor(rating: number | null) {
  if (rating == null) return "#3b82f6";
  if (rating >= 4) return "#dc2626";
  if (rating >= 3) return "#f59e0b";
  return "#3b82f6";
}
