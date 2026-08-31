"use client";

import { useState, type RefObject } from "react";
import { FileDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { downloadElementAsPdf } from "@/lib/download-page-pdf";
import { cn } from "@/lib/utils";

type Props = {
  targetRef: RefObject<HTMLElement | null>;
  filename: string;
  label?: string;
  disabled?: boolean;
  className?: string;
};

export function DownloadPagePdfButton({
  targetRef,
  filename,
  label = "Download report",
  disabled,
  className,
}: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("gap-1.5", className)}
      disabled={disabled || busy}
      onClick={async () => {
        const element = targetRef.current;
        if (!element) {
          toast({
            title: "Report not ready",
            description: "Wait for the page to finish loading, then try again.",
            tone: "error",
          });
          return;
        }

        try {
          setBusy(true);
          await downloadElementAsPdf(element, filename);
          toast({
            title: "Report downloaded",
            description: "History page saved as PDF with charts and activity.",
            tone: "success",
          });
        } catch (e) {
          toast({
            title: "Download failed",
            description: e instanceof Error ? e.message : "Could not create PDF.",
            tone: "error",
          });
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <FileDown className="size-3.5" />
      )}
      {busy ? "Preparing…" : label}
    </Button>
  );
}
