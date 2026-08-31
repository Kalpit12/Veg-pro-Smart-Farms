"use client";

import { TrendsGrid } from "@/features/infestation/trends-grid";

export function TrendsPageView() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Trends</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scarab-style pressure across all greenhouses by date. Filter by pest,
          disease, or variety; red ↑ is pressure, black ↓ is okay. Spray markers
          and History/Map links help you act on what you see.
        </p>
      </header>

      <TrendsGrid />
    </section>
  );
}
