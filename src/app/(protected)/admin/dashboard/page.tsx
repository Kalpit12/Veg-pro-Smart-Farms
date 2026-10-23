import { ActivityChart } from "@/features/dashboard/components/activity-chart";
import { AdminDailyAnalytics } from "@/features/dashboard/components/admin-daily-analytics";
import { LiveActivityFeed } from "@/features/dashboard/components/live-activity-feed";
import { MetricsGrid } from "@/features/dashboard/components/metrics-grid";
import { OperationsAlerts } from "@/features/dashboard/components/operations-alerts";
import { YesterdayScoutedGreenhouses } from "@/features/dashboard/components/yesterday-scouted-greenhouses";
export default function AdminDashboardPage() {
  return (
    <section className="space-y-4">
      <YesterdayScoutedGreenhouses
        scope="all"
        scoutingBasePath="/admin/scouting"
        liveUpdates={false}
        managerDashboardFilters
      />
      <MetricsGrid audience="admin" liveUpdates={false} managerDashboardFilters />
      <OperationsAlerts audience="admin" liveUpdates={false} managerDashboardFilters />
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          <ActivityChart managerDashboardFilters />
          <AdminDailyAnalytics section="mix" managerDashboardFilters />
        </div>
        <LiveActivityFeed
          variant="admin"
          managerDashboardFilters
          liveUpdates={false}
          className="xl:sticky xl:top-4"
        />
      </div>
      <AdminDailyAnalytics section="houses" managerDashboardFilters />
    </section>
  );
}
