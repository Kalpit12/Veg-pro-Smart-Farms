import { ChemicalsPanel } from "@/features/admin/chemicals-panel";

export default function AdminChemicalsPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Insecticide products</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload and maintain the product list managers use when logging sprays.
        </p>
      </header>
      <ChemicalsPanel />
    </section>
  );
}
