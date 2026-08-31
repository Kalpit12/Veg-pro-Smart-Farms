import { StaffAccountsPanel } from "@/features/admin/staff-accounts-panel";
import { WorkerTrendsPanel } from "@/features/infestation/worker-trends-panel";
import { WorkersTable } from "@/features/infestation/workers-table";

export default function AdminWorkforcePage() {
  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold">Staff</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create field worker and farm manager logins, then see who is in the field today.
        </p>
      </header>
      <StaffAccountsPanel />
      <WorkersTable />
      <WorkerTrendsPanel />
    </section>
  );
}
