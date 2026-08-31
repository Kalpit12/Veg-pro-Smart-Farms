import { SupervisorPanel } from "@/features/supervisor/supervisor-panel";

export default function AdminApprovalsPage() {
  return (
    <section className="space-y-4">
      <header className="glass-card rounded-2xl p-5">
        <h1 className="text-xl font-semibold">Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review pending field submissions, evidence, and approve or reject worker activities.
        </p>
      </header>
      <SupervisorPanel />
    </section>
  );
}
