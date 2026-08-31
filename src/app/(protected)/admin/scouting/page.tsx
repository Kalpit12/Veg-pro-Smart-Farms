import { Suspense } from "react";

import { GreenhouseHeatGrid } from "@/features/scouting/greenhouse-heat-grid";
import { ScoutRouteMap } from "@/features/scouting/scout-route-map";
import { ScoutingCoveragePanel } from "@/features/scouting/scouting-coverage-panel";
import { ScoutingKpiDashboard } from "@/features/scouting/scouting-kpi-dashboard";
import { ScoutingPressurePanel } from "@/features/scouting/scouting-pressure-panel";
import { ScoutingRecordsTable } from "@/features/scouting/scouting-records-table";
import { SprayWorkProgramPanel } from "@/features/scouting/spray-work-program-panel";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminScoutingPage() {
  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold">Smart Scouting</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          GPS routes, coverage, observations, and greenhouse accountability.
        </p>
      </header>

      <ScoutingKpiDashboard />

      <SprayWorkProgramPanel basePath="/admin" />

      <div className="grid gap-6 xl:grid-cols-2">
        <GreenhouseHeatGrid />
        <Suspense fallback={<Skeleton className="h-80 w-full rounded-2xl" />}>
          <ScoutRouteMap />
        </Suspense>
      </div>

      <ScoutingCoveragePanel />

      <ScoutingPressurePanel />

      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent scouting</h2>
        <ScoutingRecordsTable />
      </div>
    </section>
  );
}
