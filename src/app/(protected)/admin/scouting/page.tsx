import { Suspense } from "react";

import { GreenhouseHeatGrid } from "@/features/scouting/greenhouse-heat-grid";
import { ScoutRouteMap } from "@/features/scouting/scout-route-map";
import { ScoutingKpiDashboard } from "@/features/scouting/scouting-kpi-dashboard";
import { ScoutingLiveAuditPanel } from "@/features/scouting/scouting-live-audit-panel";
import { ScoutingPressurePanel } from "@/features/scouting/scouting-pressure-panel";
import { ScoutingRecordsTable } from "@/features/scouting/scouting-records-table";
import { SprayWorkProgramPanel } from "@/features/scouting/spray-work-program-panel";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminScoutingPage() {
  return (
    <section className="space-y-8">
      <ScoutingKpiDashboard liveUpdates={false} useWorkspaceFilters />

      <ScoutingLiveAuditPanel manualRefresh />

      <SprayWorkProgramPanel basePath="/admin" />

      <div className="grid gap-6 xl:grid-cols-2">
        <GreenhouseHeatGrid />
        <Suspense fallback={<Skeleton className="h-80 w-full rounded-2xl" />}>
          <ScoutRouteMap />
        </Suspense>
      </div>

      <ScoutingPressurePanel />

      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent scouting</h2>
        <ScoutingRecordsTable />
      </div>
    </section>
  );
}
