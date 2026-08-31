import { subDays } from "date-fns";

import {
  BEMACK_DISEASES,
  BEMACK_GREENHOUSES,
  BEMACK_PESTS,
  bemackGreenhouseId,
} from "@/lib/bemack-master-data";
import { DEMO_WORKERS } from "@/lib/demo-field-data";
import type { WorkerHistoryEvent } from "@/lib/worker-trends";

function noise(a: number, b: number) {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Demo worker history + Scarab-style rounds so Worker trends is useful offline.
 */
export function buildDemoWorkerTrends(days: number): {
  workers: { id: string; name: string }[];
  events: WorkerHistoryEvent[];
} {
  const workers = DEMO_WORKERS.map((w) => ({ id: w.id, name: w.name }));
  const events: WorkerHistoryEvent[] = [];
  const issues = [...BEMACK_PESTS.slice(0, 4), ...BEMACK_DISEASES.slice(0, 3)];
  const products = [
    "Imidacloprid",
    "Abamectin",
    "Bacillus thuringiensis",
    "Soap spray",
  ];

  DEMO_WORKERS.forEach((worker, wi) => {
    for (let d = 0; d < days; d++) {
      if (noise(wi, d) < 0.45) continue;

      const day = subDays(new Date(), d);
      const ghName =
        BEMACK_GREENHOUSES[(wi * 3 + d) % BEMACK_GREENHOUSES.length]!;
      const ghId = bemackGreenhouseId(ghName);
      const hour = 7 + Math.floor(noise(wi + 2, d) * 9);
      day.setHours(hour, Math.floor(noise(wi, d + 5) * 50), 0, 0);

      const roll = noise(wi + 7, d + 3);

      // Scarab-style rounds for "scout" workers (first 5)
      if (wi < 5 && noise(wi + 1, d + 2) > 0.55) {
        const durationS = Math.round(20 * 60 + noise(wi, d + 8) * 70 * 60);
        const stopCount = 3 + Math.floor(noise(wi + 3, d) * 10);
        const coveragePct = Math.round(15 + noise(wi + 4, d + 1) * 70);
        const distanceM = Math.round(80 + noise(wi + 5, d) * 600);
        const pointCount =
          noise(wi + 6, d) > 0.12
            ? 20 + Math.floor(noise(wi, d + 9) * 80)
            : 0;
        const roundId = `demo-round-${worker.id}-${d}`;

        events.push({
          id: `round-${roundId}`,
          workerId: worker.id,
          workerName: worker.name,
          kind: "scouting_round",
          title: `Scouting round · ${stopCount} stops`,
          detail: `Coverage ${coveragePct}%`,
          occurredAt: day.toISOString(),
          farmName: "Star",
          greenhouseId: ghId,
          greenhouseName: ghName,
          severity: null,
          status: "completed",
          roundId,
          durationS,
          distanceM,
          coveragePct,
          stopCount,
          pointCount,
        });
      }

      if (roll < 0.35) {
        const pest = issues[(wi + d) % issues.length]!;
        events.push({
          id: `demo-report-${worker.id}-${d}`,
          workerId: worker.id,
          workerName: worker.name,
          kind: "infestation_report",
          title: pest,
          detail: `Field report in ${ghName}`,
          occurredAt: day.toISOString(),
          farmName: "Star",
          greenhouseId: ghId,
          greenhouseName: ghName,
          severity: 2 + Math.floor(noise(wi, d + 11) * 3),
          status: noise(wi, d + 13) > 0.6 ? "resolved" : "active",
        });
      } else if (roll < 0.55) {
        events.push({
          id: `demo-spray-${worker.id}-${d}`,
          workerId: worker.id,
          workerName: worker.name,
          kind: "spray",
          title: products[(wi + d) % products.length]!,
          detail: "Spray treatment logged",
          occurredAt: day.toISOString(),
          farmName: "Star",
          greenhouseId: ghId,
          greenhouseName: ghName,
          severity: null,
          status: null,
        });
      } else if (roll < 0.85) {
        const issue = issues[(wi + d + 2) % issues.length]!;
        const rating = 1 + Math.floor(noise(wi + 4, d) * 5);
        events.push({
          id: `demo-scout-${worker.id}-${d}`,
          workerId: worker.id,
          workerName: worker.name,
          kind: "scouting_stop",
          title: issue,
          detail: `pest/disease · rating ${rating}/5`,
          occurredAt: day.toISOString(),
          farmName: "Star",
          greenhouseId: ghId,
          greenhouseName: ghName,
          severity: rating,
          status: null,
        });
      } else {
        events.push({
          id: `demo-activity-${worker.id}-${d}`,
          workerId: worker.id,
          workerName: worker.name,
          kind: "activity",
          title: noise(wi, d) > 0.5 ? "Scout route" : "Field check",
          detail: `Logged from ${ghName}`,
          occurredAt: day.toISOString(),
          farmName: "Star",
          greenhouseId: ghId,
          greenhouseName: ghName,
          severity: null,
          status: "approved",
        });
      }

      if (noise(wi + 9, d) > 0.78) {
        const gh2 =
          BEMACK_GREENHOUSES[(wi * 5 + d + 4) % BEMACK_GREENHOUSES.length]!;
        day.setMinutes(day.getMinutes() + 40);
        events.push({
          id: `demo-scout2-${worker.id}-${d}`,
          workerId: worker.id,
          workerName: worker.name,
          kind: "scouting_stop",
          title: issues[(wi + d + 5) % issues.length]!,
          detail: "pest · rating 3/5",
          occurredAt: day.toISOString(),
          farmName: "Star",
          greenhouseId: bemackGreenhouseId(gh2),
          greenhouseName: gh2,
          severity: 3,
          status: null,
        });
      }
    }
  });

  events.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  return { workers, events };
}
