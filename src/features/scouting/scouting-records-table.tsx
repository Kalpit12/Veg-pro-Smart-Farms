"use client";

import { format } from "date-fns";

import { ExportExcelButton } from "@/components/export-excel-button";
import { useScoutingData } from "@/hooks/use-scouting-data";
import { excelFilename, scoutingRecordsToExcel } from "@/lib/admin-export-mappers";

export function ScoutingRecordsTable() {
  const { records, loading } = useScoutingData(30);
  const exportRows = scoutingRecordsToExcel(records);

  const display = records.map((r) => ({
    id: r.id,
    date: r.recordedAt,
    scout: r.scoutName,
    farm: r.farmName,
    gh: r.greenhouseName,
    category: r.category,
    variety: r.variety,
    beds: r.beds,
    column: r.columnNo,
    bay: r.bayNo,
    issueType: r.issueType,
    issue: r.issue,
    rating: r.rating,
    gps:
      r.latitude != null && r.longitude != null
        ? `${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}`
        : "—",
  }));

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading scouting records…</p>;
  }

  if (!display.length) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <ExportExcelButton
            rows={exportRows}
            filename={excelFilename("scouting-stops")}
            sheetName="Scouting stops"
            disabled
          />
        </div>
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No scouting stops yet. Workers save stops from Field work → Scout stop (Star).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportExcelButton
          rows={exportRows}
          filename={excelFilename("scouting-stops")}
          sheetName="Scouting stops"
        />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[1000px] text-left text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Scout</th>
            <th className="px-3 py-2">Farm</th>
            <th className="px-3 py-2">GH</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">Variety</th>
            <th className="px-3 py-2">Bed/Col/Bay</th>
            <th className="px-3 py-2">Issue</th>
            <th className="px-3 py-2">Rating</th>
            <th className="px-3 py-2">GPS</th>
          </tr>
        </thead>
        <tbody>
          {display.map((r) => (
            <tr key={r.id} className="border-t border-border/70">
              <td className="px-3 py-2 whitespace-nowrap">
                {format(new Date(r.date), "MMM d, yyyy HH:mm")}
              </td>
              <td className="px-3 py-2">{r.scout}</td>
              <td className="px-3 py-2">{r.farm}</td>
              <td className="px-3 py-2 font-medium">{r.gh}</td>
              <td className="px-3 py-2">{r.category}</td>
              <td className="px-3 py-2">{r.variety}</td>
              <td className="px-3 py-2 tabular-nums">
                {r.beds}/{r.column}/{r.bay}
              </td>
              <td className="px-3 py-2">
                <span className="text-xs capitalize text-muted-foreground">{r.issueType}</span>
                {" · "}
                {r.issue}
              </td>
              <td className="px-3 py-2 tabular-nums">{r.rating ?? "—"}</td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.gps}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
