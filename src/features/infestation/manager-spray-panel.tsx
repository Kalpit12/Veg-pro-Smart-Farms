"use client";

import { LogSprayForm } from "@/features/infestation/log-spray-form";
import { PendingInfestationQueue } from "@/features/infestation/pending-infestation-queue";
import { useResumeHotspotStore } from "@/store/resume-hotspot-store";

export function ManagerSprayPanel() {
  const resumeHotspot = useResumeHotspotStore((s) => s.hotspot);

  return (
    <section className="space-y-4">
      <PendingInfestationQueue />

      <div className="glass-card rounded-2xl p-4">
        <div className="mb-4 space-y-1">
          <h2 className="text-lg font-semibold">Log spray</h2>
          <p className="text-sm text-muted-foreground">
            {resumeHotspot ? (
              <>
                Responding to <span className="font-medium">{resumeHotspot.pest_type}</span> at{" "}
                <span className="font-medium text-foreground">
                  {resumeHotspot.greenhouse_name}
                </span>{" "}
                (severity {resumeHotspot.severity}/5). Location comes from the worker report, not
                GPS.
              </>
            ) : (
              <>
                Select a worker report above, then log the spray. The greenhouse and severity are
                taken from that report.
              </>
            )}
          </p>
        </div>
        <LogSprayForm audience="manager" />
      </div>
    </section>
  );
}
