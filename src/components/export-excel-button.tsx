"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { downloadExcel, type ExcelRow } from "@/lib/export-excel";
import { cn } from "@/lib/utils";

type ExportExcelButtonProps = {
  rows: ExcelRow[];
  filename: string;
  sheetName?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
};

export function ExportExcelButton({
  rows,
  filename,
  sheetName,
  label = "Download Excel",
  disabled,
  className,
}: ExportExcelButtonProps) {
  const { toast } = useToast();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("gap-1.5", className)}
      disabled={disabled || rows.length === 0}
      onClick={() => {
        if (!rows.length) {
          toast({
            title: "Nothing to export",
            description: "There is no data in this view yet.",
            tone: "error",
          });
          return;
        }

        downloadExcel(rows, filename, sheetName);
        toast({
          title: "Excel downloaded",
          description: `${rows.length} row${rows.length === 1 ? "" : "s"} exported.`,
          tone: "success",
        });
      }}
    >
      <Download className="size-3.5" />
      {label}
    </Button>
  );
}
