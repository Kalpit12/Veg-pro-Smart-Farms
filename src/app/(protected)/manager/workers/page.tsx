import { WorkerTrendsPanel } from "@/features/infestation/worker-trends-panel";
import { WorkersTable } from "@/features/infestation/workers-table";

export default function ManagerWorkersPage() {
  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold">Workers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Who is working where, plus work history and greenhouse coverage trends.
        </p>
      </header>
      <WorkersTable />
      <WorkerTrendsPanel />
    </section>
  );
}
