import { FieldWorkPanel } from "@/features/infestation/field-work-panel";

export default function WorkerFieldPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Field work</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          1. Confirm greenhouse · 2. Start walking · 3. Walk rows and report
        </p>
      </header>
      <FieldWorkPanel />
    </section>
  );
}
