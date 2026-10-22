import { FarmSitesPanel } from "@/features/admin/farm-sites-panel";

export default function AdminSitesPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Farms &amp; greenhouses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add or edit farms and greenhouses, or upload a CSV using the same fields as your
          existing houses (GPS anchors, area, bays, and columns).
        </p>
      </header>
      <FarmSitesPanel />
    </section>
  );
}
