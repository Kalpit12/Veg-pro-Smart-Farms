"use client";

import { format } from "date-fns";
import { Sprout } from "lucide-react";

import { LiveConnectionStatus } from "@/features/dashboard/components/live-connection-status";

export function DashboardPageHeader({
  title,
  description,
  eyebrow,
  variant = "hero",
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  variant?: "hero" | "simple";
}) {
  const shellClass =
    variant === "hero"
      ? "dashboard-hero rounded-3xl p-5 md:p-6"
      : "glass-card rounded-2xl p-5";

  return (
    <div className={shellClass}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          {eyebrow ? (
            <div className="flex items-center gap-2 text-primary">
              <span className="flex size-9 items-center justify-center rounded-2xl bg-primary/12">
                <Sprout className="size-4" />
              </span>
              <p className="text-xs font-semibold tracking-[0.18em] uppercase">{eyebrow}</p>
            </div>
          ) : null}
          <div>
            <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {variant === "hero" ? (
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, MMMM d")}
            </p>
            <LiveConnectionStatus />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
        )}
      </div>
    </div>
  );
}
