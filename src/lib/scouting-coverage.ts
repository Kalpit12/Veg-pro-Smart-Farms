/**
 * Column × bay coverage from scouting stops and route breadcrumbs.
 * Maps GPS points into a greenhouse grid using stop anchors when available.
 */

export type CoverageCellKey = string;

export type CoverageVisit = {
  columnNo: number;
  bayNo: number;
};

export type CoverageModel = {
  greenhouseName: string;
  maxColumn: number;
  maxBay: number;
  expectedCells: number;
  visitedCells: number;
  coveragePct: number;
  visited: Set<CoverageCellKey>;
  missed: CoverageVisit[];
};

export type CoverageStopLike = {
  columnNo: number;
  bayNo: number;
  latitude?: number | null;
  longitude?: number | null;
};

export type CoverageRoutePoint = {
  latitude: number;
  longitude: number;
};

function cellKey(column: number, bay: number): CoverageCellKey {
  return `${column}-${bay}`;
}

/** Default Star-style grid when no stops define extents */
const DEFAULT_MAX_COLUMN = 8;
const DEFAULT_MAX_BAY = 14;

/**
 * Infer col/bay for a GPS point from nearest stop that has GPS.
 * Falls back to projecting within greenhouse anchor bounds.
 */
export function nearestGridCell(
  point: CoverageRoutePoint,
  stops: CoverageStopLike[],
  maxColumn = DEFAULT_MAX_COLUMN,
  maxBay = DEFAULT_MAX_BAY,
): CoverageVisit | null {
  const withGps = stops.filter(
    (s) =>
      s.columnNo > 0 &&
      s.bayNo > 0 &&
      s.latitude != null &&
      s.longitude != null &&
      Number.isFinite(s.latitude) &&
      Number.isFinite(s.longitude),
  );

  if (withGps.length) {
    let best = withGps[0];
    let bestD = Infinity;
    for (const s of withGps) {
      const dLat = (point.latitude - s.latitude!) * 111_320;
      const dLng =
        (point.longitude - s.longitude!) *
        111_320 *
        Math.cos((point.latitude * Math.PI) / 180);
      const d = Math.sqrt(dLat * dLat + dLng * dLng);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    // Only attribute if within ~25m of a known stop GPS
    if (bestD <= 25) {
      return { columnNo: best.columnNo, bayNo: best.bayNo };
    }
  }

  // Relative projection from stop centroid when multiple stops exist
  if (withGps.length >= 2) {
    const lats = withGps.map((s) => s.latitude!);
    const lngs = withGps.map((s) => s.longitude!);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latSpan = Math.max(maxLat - minLat, 1e-6);
    const lngSpan = Math.max(maxLng - minLng, 1e-6);
    const col =
      1 +
      Math.round(((point.longitude - minLng) / lngSpan) * (maxColumn - 1));
    const bay =
      1 + Math.round(((point.latitude - minLat) / latSpan) * (maxBay - 1));
    return {
      columnNo: Math.min(maxColumn, Math.max(1, col)),
      bayNo: Math.min(maxBay, Math.max(1, bay)),
    };
  }

  return null;
}

export function buildCoverageModel(input: {
  greenhouseName: string;
  stops: CoverageStopLike[];
  routePoints?: CoverageRoutePoint[];
  maxColumn?: number;
  maxBay?: number;
  columnCountForBay?: (bayNo: number) => number;
}): CoverageModel {
  const maxColumn =
    input.maxColumn ??
    Math.max(
      DEFAULT_MAX_COLUMN,
      ...input.stops.map((s) => s.columnNo),
      1,
    );
  const maxBay =
    input.maxBay ??
    Math.max(DEFAULT_MAX_BAY, ...input.stops.map((s) => s.bayNo), 1);
  const colsForBay = input.columnCountForBay ?? (() => maxColumn);

  const visited = new Set<CoverageCellKey>();

  for (const s of input.stops) {
    if (s.columnNo > 0 && s.bayNo > 0 && s.columnNo <= colsForBay(s.bayNo)) {
      visited.add(cellKey(s.columnNo, s.bayNo));
    }
  }

  for (const p of input.routePoints ?? []) {
    const cell = nearestGridCell(p, input.stops, maxColumn, maxBay);
    if (cell && cell.columnNo <= colsForBay(cell.bayNo)) {
      visited.add(cellKey(cell.columnNo, cell.bayNo));
    }
  }

  let expectedCells = 0;
  const missed: CoverageVisit[] = [];
  for (let b = 1; b <= maxBay; b++) {
    const cols = colsForBay(b);
    expectedCells += cols;
    for (let c = 1; c <= cols; c++) {
      if (!visited.has(cellKey(c, b))) {
        missed.push({ columnNo: c, bayNo: b });
      }
    }
  }

  const visitedCells = visited.size;
  const coveragePct =
    expectedCells > 0
      ? Math.round((visitedCells / expectedCells) * 1000) / 10
      : 0;

  return {
    greenhouseName: input.greenhouseName,
    maxColumn,
    maxBay,
    expectedCells,
    visitedCells,
    coveragePct,
    visited,
    missed,
  };
}

export function suggestNextCells(
  coverage: CoverageModel,
  limit = 8,
): CoverageVisit[] {
  // Prefer missed cells near visited ones (simple frontier)
  if (!coverage.visited.size) {
    return coverage.missed.slice(0, limit);
  }

  const visitedList = Array.from(coverage.visited).map((k) => {
    const [c, b] = k.split("-").map(Number);
    return { columnNo: c, bayNo: b };
  });

  return [...coverage.missed]
    .map((m) => {
      let minD = Infinity;
      for (const v of visitedList) {
        const d =
          Math.abs(v.columnNo - m.columnNo) + Math.abs(v.bayNo - m.bayNo);
        if (d < minD) minD = d;
      }
      return { ...m, dist: minD };
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit)
    .map(({ columnNo, bayNo }) => ({ columnNo, bayNo }));
}
