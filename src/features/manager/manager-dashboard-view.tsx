"use client";

import { ActivityChart } from "@/features/dashboard/components/activity-chart";
import { AdminDailyAnalytics } from "@/features/dashboard/components/admin-daily-analytics";
import { YesterdayScoutedGreenhouses } from "@/features/dashboard/components/yesterday-scouted-greenhouses";
import { LiveActivityFeed } from "@/features/dashboard/components/live-activity-feed";
import { MetricsGrid } from "@/features/dashboard/components/metrics-grid";
import { OperationsAlerts } from "@/features/dashboard/components/operations-alerts";
import { PendingInfestationQueue } from "@/features/infestation/pending-infestation-queue";

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
      <OperationsAlerts audience="manager" managerDashboardFilters />
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          <ActivityChart managerDashboardFilters />
          <AdminDailyAnalytics section="mix" managerDashboardFilters />
        </div>
        <LiveActivityFeed
          variant="manager"
          managerDashboardFilters
          className="xl:sticky xl:top-4"
        />
      </div>
      <AdminDailyAnalytics section="houses" managerDashboardFilters />
    </section>
  );
}
