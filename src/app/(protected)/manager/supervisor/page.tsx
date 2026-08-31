import { SupervisorPanel } from "@/features/supervisor/supervisor-panel";

export default function ManagerSupervisorPage() {
  return (
    <section className="space-y-4">
      <div className="glass-card rounded-2xl p-5">
        <h1 className="text-xl font-semibold">Supervisor Panel</h1>
        <p className="text-sm text-muted-foreground">
          Monitor live activities, review evidence, and approve work.
        </p>
      </div>
      <SupervisorPanel />
    </section>
  );
}

