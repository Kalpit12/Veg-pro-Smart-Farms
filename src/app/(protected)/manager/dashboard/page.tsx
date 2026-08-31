import { DashboardPageHeader } from "@/features/dashboard/components/dashboard-page-header";
import { LiveActivityFeed } from "@/features/dashboard/components/live-activity-feed";
import { ManagerQuickActions } from "@/features/dashboard/components/manager-quick-actions";
import { MetricsGrid } from "@/features/dashboard/components/metrics-grid";
import { OperationsAlerts } from "@/features/dashboard/components/operations-alerts";
import { PendingInfestationQueue } from "@/features/infestation/pending-infestation-queue";
import { SprayWorkProgramPanel } from "@/features/scouting/spray-work-program-panel";

export default function ManagerDashboardPage() {
  return (
    <section className="space-y-4">
      <DashboardPageHeader
        variant="simple"
        title="Today's priorities"
        description="Hotspots and sprays that need action in the field."
      />
      <MetricsGrid audience="manager" />
      <PendingInfestationQueue compact />
      <div className="grid gap-4 lg:grid-cols-2">
        <SprayWorkProgramPanel basePath="/manager" />
        <OperationsAlerts audience="manager" />
      </div>
      <ManagerQuickActions />
      <LiveActivityFeed variant="manager" />
    </section>
  );
}
