"use client";

import { useEffect, useState, type ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

import { Skeleton } from "@/components/ui/skeleton";

type ResponsiveChartProps = {
  /** Fixed pixel height — avoids Recharts measuring -1 before layout. */
  height: number;
  children: ReactElement;
  className?: string;
};

/**
 * Defers Recharts until after mount and uses an explicit height so
 * ResponsiveContainer never receives width/height -1.
 */
export function ResponsiveChart({ height, children, className }: ResponsiveChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className={className}
      style={{ height, minHeight: height, width: "100%", minWidth: 0 }}
    >
      {mounted ? (
        <ResponsiveContainer width="100%" height={height} minWidth={0}>
          {children}
        </ResponsiveContainer>
      ) : (
        <Skeleton className="w-full" style={{ height }} />
      )}
    </div>
  );
}
