/**
 * Simulates multiple field workers walking greenhouses (logic-layer E2E).
 * Run: npx tsx scripts/e2e-multi-worker-simulation.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  BEMACK_DEMO_LOCATIONS,
  BEMACK_GREENHOUSES,
  bemackQrValue,
  greenhouseCellExists,
  varietyForBay,
} from "../src/lib/bemack-master-data";
import { cellGpsInGreenhouse } from "../src/lib/cell-gps";
import { buildGreenhouseGrid } from "../src/lib/greenhouse-grid";
import { findNearestGreenhouse } from "../src/lib/gps-location";
import {
  isClearScoutObservation,
  scoutRatingToDiseaseSeverity,
  SCOUT_NONE_FOUND,
} from "../src/lib/scout-observation-flow";
import { samplingTargetForGreenhouse } from "../src/lib/scout-sampling";
import {
  checkGreenhouseGeofence,
  GREENHOUSE_GEOFENCE_M,
} from "../src/lib/scouting-geofence";
import { syntheticGreenhouseAnchors } from "../src/lib/greenhouse-locations";

type WorkerSim = {
  id: string;
  name: string;
  greenhouses: string[];
};

type SimStop = {
  worker: string;
  greenhouse: string;
  column: number;
  bay: number;
  issue: string;
  rating: number | null;
};

type Issue = { level: "error" | "warn"; message: string };

const issues: Issue[] = [];
const anchors = syntheticGreenhouseAnchors();

function err(message: string) {
  issues.push({ level: "error", message });
}

function warn(message: string) {
  issues.push({ level: "warn", message });
}

function pickWalkCells(greenhouseName: string, count: number) {
  const cells: { column: number; bay: number }[] = [];
  for (let bay = 1; bay <= 11 && cells.length < count; bay++) {
    for (let col = 1; col <= 13 && cells.length < count; col++) {
      if (greenhouseCellExists(greenhouseName, col, bay)) {
        cells.push({ column: col, bay });
      }
    }
  }
  return cells;
}

const WORKERS: WorkerSim[] = [
  { id: "w1", name: "Agent Scout Alpha", greenhouses: ["STGH01A", "STGH01B", "STGH01C"] },
  { id: "w2", name: "Agent Scout Beta", greenhouses: ["STGH03A", "STGH03B", "STGH03C"] },
  {
    id: "w3",
    name: "Agent Scout Gamma",
    greenhouses: ["STGH05A", "STGH07A", "STGH07B", "STGH07C"],
  },
];

const allStops: SimStop[] = [];

console.log("=== VegPro multi-worker field simulation ===\n");
console.log(`Greenhouses in master data: ${BEMACK_GREENHOUSES.length}`);
console.log(`GPS anchors (synthetic): ${anchors.length}\n`);

// --- Anchor / GPS accuracy ---
let anchorHits = 0;
for (const loc of BEMACK_DEMO_LOCATIONS) {
  const atAnchor = { latitude: loc.lat, longitude: loc.lng };
  const nearest = findNearestGreenhouse(atAnchor, anchors);
  if (nearest.greenhouseName !== loc.greenhouseName) {
    err(
      `Nearest GH at anchor wrong for ${loc.greenhouseName}: got ${nearest.greenhouseName} (${nearest.distanceM}m)`,
    );
  } else if (nearest.distanceM > 5) {
    warn(`${loc.greenhouseName} anchor self-distance ${nearest.distanceM}m (expected ~0)`);
  } else {
    anchorHits++;
  }

  const fence = checkGreenhouseGeofence(atAnchor, loc.greenhouseId, anchors);
  if (!fence?.inside) {
    err(`${loc.greenhouseName} geofence not inside at anchor (${fence?.distanceM}m)`);
  }
  if (fence?.anchorMismatch) {
    err(`${loc.greenhouseName} anchorMismatch at own anchor`);
  }

  const qr = bemackQrValue(loc.greenhouseName);
  if (!qr.includes(loc.greenhouseName)) {
    err(`QR value mismatch for ${loc.greenhouseName}: ${qr}`);
  }
}

console.log(
  `GPS anchor resolution: ${anchorHits}/${BEMACK_DEMO_LOCATIONS.length} correct at anchor`,
);

// --- Worker walks ---
for (const worker of WORKERS) {
  console.log(`\n--- ${worker.name} ---`);
  for (const gh of worker.greenhouses) {
    const target = samplingTargetForGreenhouse(gh);
    const walkCells = pickWalkCells(gh, target.targetStops);
    if (walkCells.length < target.targetStops) {
      err(
        `${worker.name}: ${gh} could only sample ${walkCells.length}/${target.targetStops} cells`,
      );
    }

    const loc = BEMACK_DEMO_LOCATIONS.find((l) => l.greenhouseName === gh);
    if (!loc) {
      err(`${worker.name}: unknown greenhouse ${gh}`);
      continue;
    }

    console.log(
      `  ${gh}: ${walkCells.length} stops (target ${target.targetStops}, ~${target.expectedCells} cells)`,
    );

    for (let i = 0; i < walkCells.length; i++) {
      const { column, bay } = walkCells[i];
      const cellGps = cellGpsInGreenhouse(gh, column, bay);
      if (!cellGps) {
        err(`${gh} cell ${column}x${bay}: no interpolated GPS`);
        continue;
      }

      const loc = BEMACK_DEMO_LOCATIONS.find((l) => l.greenhouseName === gh)!;
      const nearestAtCell = findNearestGreenhouse(cellGps, anchors, {
        preferGreenhouseId: loc.greenhouseId,
      });
      const rawNearest = findNearestGreenhouse(cellGps, anchors);
      if (rawNearest.greenhouseName !== gh && nearestAtCell.greenhouseName === gh) {
        /* preferGreenhouseId kept assignment inside geofence */
      } else if (
        nearestAtCell.greenhouseName !== gh &&
        nearestAtCell.distanceM < GREENHOUSE_GEOFENCE_M
      ) {
        warn(
          `${gh} cell ${column}x${bay}: nearest is ${nearestAtCell.greenhouseName} (${nearestAtCell.distanceM}m) — possible neighbor bleed`,
        );
      }

      const variety = varietyForBay(gh, bay);
      const issue =
        i % 4 === 0
          ? SCOUT_NONE_FOUND
          : i % 3 === 0
            ? "False Codling Moth"
            : "Agrobacterium";
      const rating = isClearScoutObservation(issue) ? null : 2 + (i % 3);

      if (!isClearScoutObservation(issue) && rating != null) {
        const sev = scoutRatingToDiseaseSeverity(rating);
        if (sev < 1 || sev > 3) err(`Invalid disease severity mapping for rating ${rating}`);
      }

      allStops.push({
        worker: worker.name,
        greenhouse: gh,
        column,
        bay,
        issue,
        rating,
      });
    }
  }
}

// --- Manager grid aggregation ---
const gridInputs = allStops.map((s) => ({
  greenhouseName: s.greenhouse,
  columnNo: s.column,
  bayNo: s.bay,
  issueType: isClearScoutObservation(s.issue) ? ("pest" as const) : ("disease" as const),
  issue: s.issue,
  rating: s.rating,
}));

const uniqueGhs = [...new Set(allStops.map((s) => s.greenhouse))];
let gridsBuilt = 0;
for (const gh of uniqueGhs) {
  const grid = buildGreenhouseGrid(gridInputs, gh);
  if (!grid) {
    warn(`Manager grid empty for ${gh} (only clear scans?)`);
  } else {
    gridsBuilt++;
    for (const cell of grid.cells) {
      if (!greenhouseCellExists(gh, cell.column, cell.bay)) {
        err(`Grid cell outside layout: ${gh} ${cell.column}x${cell.bay}`);
      }
    }
  }
}

console.log(`\nTotal simulated stops: ${allStops.length}`);
console.log(`Manager heat grids built: ${gridsBuilt}/${uniqueGhs.length}`);

// --- Supabase smoke (optional) ---
async function supabaseSmoke() {
  const envPath = resolve(process.cwd(), ".env.local");
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    try {
      const raw = readFileSync(envPath, "utf8");
      for (const line of raw.split("\n")) {
        const t = line.trim();
        if (t.startsWith("NEXT_PUBLIC_SUPABASE_URL="))
          url = t.slice("NEXT_PUBLIC_SUPABASE_URL=".length).replace(/^"|"$/g, "");
        if (t.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY="))
          key = t.slice("NEXT_PUBLIC_SUPABASE_ANON_KEY=".length).replace(/^"|"$/g, "");
      }
    } catch {
      /* no env */
    }
  }
  if (!url || !key) {
    console.log("\nSupabase: skipped (no public env vars)");
    return;
  }

  const base = url.replace(/\/$/, "");
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  const checks = [
    { name: "crop_categories", path: "/rest/v1/crop_categories?select=id&limit=1" },
    { name: "greenhouses", path: "/rest/v1/greenhouses?select=id,name&limit=3" },
    { name: "scouting_parameters", path: "/rest/v1/scouting_parameters?select=id&limit=1" },
  ];

  console.log("\nSupabase REST smoke:");
  for (const c of checks) {
    try {
      const res = await fetch(`${base}${c.path}`, { headers });
      if (!res.ok) {
        warn(`Supabase ${c.name}: HTTP ${res.status}`);
        console.log(`  ${c.name}: FAIL ${res.status}`);
      } else {
        const data = await res.json();
        const n = Array.isArray(data) ? data.length : 0;
        const rlsNote =
          n === 0 ? " (0 rows for anon — expected if RLS requires sign-in)" : "";
        console.log(`  ${c.name}: OK (${n} row(s) in sample)${rlsNote}`);
      }
    } catch (e) {
      warn(`Supabase ${c.name}: ${e instanceof Error ? e.message : String(e)}`);
      console.log(`  ${c.name}: FAIL network`);
    }
  }
}

async function main() {
  await supabaseSmoke();

  const errors = issues.filter((i) => i.level === "error");
const warns = issues.filter((i) => i.level === "warn");

console.log("\n=== Summary ===");
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warns.length}`);
if (errors.length) {
  console.log("\nErrors:");
  for (const e of errors.slice(0, 25)) console.log(`  - ${e.message}`);
  if (errors.length > 25) console.log(`  ... and ${errors.length - 25} more`);
}
if (warns.length) {
  console.log("\nWarnings:");
  for (const w of warns.slice(0, 15)) console.log(`  - ${w.message}`);
  if (warns.length > 15) console.log(`  ... and ${warns.length - 15} more`);
}

const accuracy =
  BEMACK_DEMO_LOCATIONS.length > 0
    ? Math.round((anchorHits / BEMACK_DEMO_LOCATIONS.length) * 1000) / 10
    : 0;

console.log(`\nGPS anchor accuracy (self-match at anchor): ${accuracy}%`);
console.log(
  errors.length === 0
    ? "Logic-layer verdict: PASS (see HTTP/browser notes in agent report)"
    : "Logic-layer verdict: FAIL — fix errors before field trial",
);

  process.exit(errors.length > 0 ? 1 : 0);
}

void main();
