"use client";

import { useRef } from "react";
import { format } from "date-fns";

import { DownloadPagePdfButton } from "@/components/download-page-pdf-button";
import { HistoryList } from "@/features/infestation/history-list";

export function HistoryPageView() {
  const reportRef = useRef<HTMLDivElement>(null);
  const filename = `vegpro-history-report-${format(new Date(), "yyyy-MM-dd")}`;

  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <DownloadPagePdfButton
          targetRef={reportRef}
          filename={filename}
          label="Download full report"
        />
      </div>

      <div ref={reportRef} className="space-y-6 rounded-2xl bg-background p-1">
        <header>
          <h1 className="text-xl font-semibold">History</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Greenhouse health, improvement chart, and field activity for the last 3 months.
          </p>
        </header>
        <HistoryList />
      </div>
    </section>
  );
}
