import { ActivityLogsTable } from "@/features/activities/activity-logs-table";

export default function ManagerLogsPage() {
  return (
    <section className="space-y-4">
      <div className="glass-card rounded-2xl p-5">
        <h1 className="text-xl font-semibold">Farm Activity Logs</h1>
      </div>
      <ActivityLogsTable />
    </section>
  );
}

