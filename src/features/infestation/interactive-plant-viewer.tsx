"use client";

import Image from "next/image";

import {
  PLANT_ZONE_HOTSPOTS,
  PLANT_ZONES,
  type PlantZoneId,
} from "@/lib/plant-zones";
import { cn } from "@/lib/utils";

type Props = {
  selectedZone: PlantZoneId | null;
  onSelectZone: (zone: PlantZoneId) => void;
  className?: string;
};

const ZONE_CHIP: Record<PlantZoneId, string> = {
  top: "Upper",
  middle: "Middle",
  lower: "Lower",
};

/**
 * Interactive rose used on worker field reports.
 * Zones mark WHERE on the plant — pest vs disease is chosen next.
 */
export function InteractivePlantViewer({
  selectedZone,
  onSelectZone,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-[#1f2428]",
        className,
      )}
    >
      {/* Cap height on phones; keep width in sync so zone hotspots stay aligned */}
      <div className="relative mx-auto aspect-[2/3] h-[min(52vh,380px)] w-auto max-w-full">
        <Image
          src="/plants/interactive-flower.webp"
          alt="Interactive rose — tap bloom, leaves, or roots"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 420px"
          className="object-contain"
        />

        {(Object.keys(PLANT_ZONE_HOTSPOTS) as PlantZoneId[]).map((id) => {
          const box = PLANT_ZONE_HOTSPOTS[id];
          const active = selectedZone === id;
          return (
            <button
              key={id}
              type="button"
              aria-label={`Select ${PLANT_ZONES[id].label}`}
              aria-pressed={active}
              className={cn(
                "absolute z-10 touch-manipulation rounded-[28%] border-2 transition-all",
                active
                  ? "border-primary bg-primary/25 shadow-[0_0_0_4px_rgba(34,197,94,0.25)]"
                  : "border-white/40 bg-white/10 hover:border-white/80 hover:bg-white/20",
              )}
              style={{
                top: box.top,
                left: box.left,
                width: box.width,
                height: box.height,
              }}
              onClick={() => onSelectZone(id)}
            >
              <span
                className={cn(
                  "pointer-events-none absolute left-1/2 top-1.5 z-20 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm sm:text-xs",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-zinc-950/90 text-white",
                )}
              >
                {ZONE_CHIP[id]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-white/10 bg-black/40 px-3 py-2 text-center text-xs text-white/90">
        Tap Upper (bloom), Middle (leaves), or Lower (roots). Then choose pest or disease.
      </div>
    </div>
  );
}
