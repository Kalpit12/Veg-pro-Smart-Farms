"use client";

import { YesterdayScoutedGreenhouses } from "@/features/dashboard/components/yesterday-scouted-greenhouses";
import { LiveActivityFeed } from "@/features/dashboard/components/live-activity-feed";
import { ManagerQuickActions } from "@/features/dashboard/components/manager-quick-actions";
import { MetricsGrid } from "@/features/dashboard/components/metrics-grid";
import { OperationsAlerts } from "@/features/dashboard/components/operations-alerts";
import { PendingInfestationQueue } from "@/features/infestation/pending-infestation-queue";
import { SprayWorkProgramPanel } from "@/features/scouting/spray-work-program-panel";

export function ManagerDashboardView() {
  return (
    <section className="space-y-4">
      <YesterdayScoutedGreenhouses
        scope="assigned"
        scoutingBasePath="/manager/scouting"
        managerDashboardFilters
      />
      <MetricsGrid audience="manager" managerDashboardFilters />
      <PendingInfestationQueue compact managerDashboardFilters />
      <div className="grid gap-4 lg:grid-cols-2">
        <SprayWorkProgramPanel basePath="/manager" managerDashboardFilters />
        <OperationsAlerts audience="manager" managerDashboardFilters />
      </div>
      <ManagerQuickActions />
      <LiveActivityFeed variant="manager" managerDashboardFilters />
    </section>
  );
}
