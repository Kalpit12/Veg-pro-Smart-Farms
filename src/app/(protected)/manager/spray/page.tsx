import { ManagerSprayPanel } from "@/features/infestation/manager-spray-panel";

export default function ManagerSprayPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Log spray</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Farm managers record spray treatments in the field. Workers report infestations; you
          execute and log the spray response.
        </p>
      </header>
      <ManagerSprayPanel />
    </section>
  );
}
