"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  loading?: boolean;
  tone?: "default" | "alert" | "success";
  delay?: number;
};

const toneStyles = {
  default: "var(--color-primary)",
  alert: "var(--color-destructive)",
  success: "oklch(0.62 0.16 150)",
} as const;

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  loading = false,
  tone = "default",
  delay = 0,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card stat-card rounded-2xl p-4 pl-5"
      style={{ "--stat-accent": toneStyles[tone] } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-3 h-8 w-20" />
          ) : (
            <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          )}
          {hint ? (
            <p
              className={cn(
                "mt-2 text-xs",
                tone === "alert" ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {hint}
            </p>
          ) : null}
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
      </div>
    </motion.div>
  );
}
