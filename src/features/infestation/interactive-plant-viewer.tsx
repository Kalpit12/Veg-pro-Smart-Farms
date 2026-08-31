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
      <div className="relative mx-auto aspect-[2/3] w-full max-w-md">
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
                "absolute rounded-[28%] border-2 transition-all",
                active
                  ? "border-primary bg-primary/25 shadow-[0_0_0_4px_rgba(34,197,94,0.25)]"
                  : "border-white/30 bg-white/5 hover:border-white/70 hover:bg-white/15",
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
                  "absolute left-1/2 top-2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow sm:text-xs",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-black/55 text-white",
                )}
              >
                {id === "top" ? "Upper" : id === "middle" ? "Middle" : "Lower"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-white/10 bg-black/40 px-3 py-2 text-center text-xs text-white/90">
        Tap where you see the issue. Pest and disease choices follow the VegPro top / mid / bottom list.
      </div>
    </div>
  );
}
