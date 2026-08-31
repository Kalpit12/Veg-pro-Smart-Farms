import { FarmMap } from "@/features/infestation/farm-map";

export default function AdminMapPage() {
  return (
    <section className="space-y-4">
      <FarmMap basePath="/admin" />
    </section>
  );
}
