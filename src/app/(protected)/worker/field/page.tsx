import { FieldWorkPanel } from "@/features/infestation/field-work-panel";

export default function WorkerFieldPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Field work</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live GPS assigns your greenhouse unless you check in or override (then the house
          stays locked). Tap a heat-map cell — that bay × column is the scouting record.
        </p>
      </header>
      <FieldWorkPanel />
    </section>
  );
}
