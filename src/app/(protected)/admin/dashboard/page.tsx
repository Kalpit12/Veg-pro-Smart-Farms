import { ActivityChart } from "@/features/dashboard/components/activity-chart";
import { AdminDailyAnalytics } from "@/features/dashboard/components/admin-daily-analytics";
import { DashboardPageHeader } from "@/features/dashboard/components/dashboard-page-header";
import { LiveActivityFeed } from "@/features/dashboard/components/live-activity-feed";
import { MetricsGrid } from "@/features/dashboard/components/metrics-grid";
import { OperationsAlerts } from "@/features/dashboard/components/operations-alerts";
import { SprayWorkProgramPanel } from "@/features/scouting/spray-work-program-panel";

export default function AdminDashboardPage() {
  return (
    <section className="space-y-4">
      <DashboardPageHeader
        title="Today on the farm"
        description="Hotspots, sprays, workers, and scouting."
        variant="hero"
      />
      <MetricsGrid audience="admin" />
      <OperationsAlerts audience="admin" />
      <SprayWorkProgramPanel compact basePath="/admin" />
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          <ActivityChart />
          <AdminDailyAnalytics section="mix" />
        </div>
        <LiveActivityFeed className="xl:sticky xl:top-4" />
      </div>
      <AdminDailyAnalytics section="houses" />
    </section>
  );
}
