import { ActivityLogsTable } from "@/features/activities/activity-logs-table";

export default function AdminLogsPage() {
  return (
    <section className="space-y-4">
      <header className="glass-card rounded-2xl p-5">
        <h1 className="text-xl font-semibold">Activity logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Full audit trail — worker reports, manager sprays, scouting, and field tasks.
        </p>
      </header>
      <ActivityLogsTable />
    </section>
  );
}
