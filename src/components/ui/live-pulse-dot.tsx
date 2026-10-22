import { cn } from "@/lib/utils";

/** Pulsing green dot for live / realtime panels. */
export function LivePulseDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex size-2.5 shrink-0", className)}>
      <span className="live-pulse absolute inline-flex size-full rounded-full bg-emerald-500/70" />
      <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
    </span>
  );
}
