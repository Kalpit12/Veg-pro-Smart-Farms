"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Pencil, Upload } from "lucide-react";

import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  createFarmAction,
  importSitesCsvAction,
  listAdminFarmsAction,
  listAdminGreenhousesAction,
  saveGreenhouseAction,
  updateFarmAction,
  type AdminFarmRow,
  type AdminGreenhouseRow,
} from "@/features/admin/farm-sites-actions";
import { SITES_CSV_HEADERS, sitesCsvTemplateContent } from "@/lib/sites-csv";
import { hasConfiguredBackend } from "@/lib/data-backend";
import { listCropVarieties } from "@/services/supabase/scouting-service";

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportSitesCsv(farms: AdminFarmRow[], greenhouses: AdminGreenhouseRow[]) {
  const lines = [SITES_CSV_HEADERS.join(",")];
  for (const f of farms) {
    lines.push(
      [
        "farm",
        csvCell(f.name),
        csvCell(f.location),
        csvCell(f.type),
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ].join(","),
    );
  }
  for (const g of greenhouses) {
    lines.push(
      [
        "greenhouse",
        csvCell(g.farm_name),
        "",
        "",
        g.id,
        csvCell(g.name),
        csvCell(g.crop_type),
        g.latitude ?? "",
        g.longitude ?? "",
        g.area_sqm ?? "",
        g.area_ha ?? "",
        g.bay_count ?? "",
        g.column_count ?? "",
      ].join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

const emptyGhForm = {
  id: "",
  farm_id: "",
  name: "",
  crop_type: "",
  latitude: "",
  longitude: "",
  area_sqm: "",
  area_ha: "",
  bay_count: "",
  column_count: "",
};

export function FarmSitesPanel() {
  const { toast } = useToast();
  const [farms, setFarms] = useState<AdminFarmRow[]>([]);
  const [greenhouses, setGreenhouses] = useState<AdminGreenhouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [farmForm, setFarmForm] = useState({ name: "", location: "", type: "Greenhouse" });
  const [editFarmId, setEditFarmId] = useState<string | null>(null);
  const [ghForm, setGhForm] = useState(emptyGhForm);
  const [busy, setBusy] = useState(false);
  const [importPreview, setImportPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [varietyOptions, setVarietyOptions] = useState<{ value: string; label: string }[]>([]);

  const farmOptions = useMemo(
    () => farms.map((f) => ({ value: f.id, label: f.name })),
    [farms],
  );

  const refresh = useCallback(async () => {
    if (!hasConfiguredBackend()) {
      setFarms([]);
      setGreenhouses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [fRes, gRes] = await Promise.all([
      listAdminFarmsAction(),
      listAdminGreenhousesAction(),
    ]);
    if (fRes.error) {
      toast({ title: "Could not load farms", description: fRes.error.message, tone: "error" });
    } else {
      setFarms(fRes.data ?? []);
    }
    if (gRes.error) {
      toast({
        title: "Could not load greenhouses",
        description: gRes.error.message,
        tone: "error",
      });
    } else {
      setGreenhouses(gRes.data ?? []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!hasConfiguredBackend()) return;
    void listCropVarieties().then((res) => {
      const rows =
        res && "data" in res && Array.isArray(res.data)
          ? (res.data as { name: string }[])
          : [];
      setVarietyOptions(
        rows.map((v) => ({ value: v.name, label: v.name })).sort((a, b) => a.label.localeCompare(b.label)),
      );
    });
  }, []);

  const varietySelectOptions = useMemo(() => {
    const names = new Set(varietyOptions.map((o) => o.value));
    const extra =
      ghForm.crop_type && !names.has(ghForm.crop_type)
        ? [{ value: ghForm.crop_type, label: `${ghForm.crop_type} (current)` }]
        : [];
    return [{ value: "", label: "Select variety…" }, ...extra, ...varietyOptions];
  }, [varietyOptions, ghForm.crop_type]);

  const onSaveFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const result = editFarmId
        ? await updateFarmAction(editFarmId, farmForm)
        : await createFarmAction(farmForm);
      if (!result.ok) {
        toast({ title: "Farm not saved", description: result.error, tone: "error" });
        return;
      }
      toast({
        title: editFarmId ? "Farm updated" : "Farm created",
        tone: "success",
      });
      setFarmForm({ name: "", location: "", type: "Greenhouse" });
      setEditFarmId(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onSaveGreenhouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const result = await saveGreenhouseAction({
        id: ghForm.id || undefined,
        farm_id: ghForm.farm_id,
        name: ghForm.name,
        crop_type: ghForm.crop_type,
        latitude: ghForm.latitude,
        longitude: ghForm.longitude,
        area_sqm: ghForm.area_sqm,
        area_ha: ghForm.area_ha,
        bay_count: ghForm.bay_count,
        column_count: ghForm.column_count,
      });
      if (!result.ok) {
        toast({ title: "Greenhouse not saved", description: result.error, tone: "error" });
        return;
      }
      toast({
        title: ghForm.id ? "Greenhouse updated" : "Greenhouse created",
        tone: "success",
      });
      setGhForm(emptyGhForm);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const startEditGreenhouse = (g: AdminGreenhouseRow) => {
    setGhForm({
      id: g.id,
      farm_id: g.farm_id,
      name: g.name,
      crop_type: g.crop_type,
      latitude: g.latitude?.toString() ?? "",
      longitude: g.longitude?.toString() ?? "",
      area_sqm: g.area_sqm?.toString() ?? "",
      area_ha: g.area_ha?.toString() ?? "",
      bay_count: g.bay_count?.toString() ?? "",
      column_count: g.column_count?.toString() ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onImportFile = async (file: File) => {
    const text = await file.text();
    setImportPreview(text.slice(0, 2000));
    setBusy(true);
    try {
      const result = await importSitesCsvAction(text);
      toast({
        title: "Import finished",
        description: `${result.farmsCreated} farm(s) created, ${result.greenhousesCreated} greenhouse(s) created, ${result.greenhousesUpdated} updated.`,
        tone: result.errors.length ? "error" : "success",
      });
      if (result.errors.length) {
        toast({
          title: "Import issues",
          description: result.errors.slice(0, 5).join(" "),
          tone: "error",
        });
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!hasConfiguredBackend()) {
    return (
      <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
        Connect Supabase or MSSQL to manage farms and greenhouses.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card space-y-4 rounded-2xl p-4">
        <h2 className="text-lg font-semibold">Bulk import</h2>
        <p className="text-sm text-muted-foreground">
          Use the CSV template with columns matching your greenhouses (GPS, area, bays, columns).
          Rows with <span className="font-mono">record_type=farm</span> add farms;{" "}
          <span className="font-mono">greenhouse</span> rows add or update houses (set{" "}
          <span className="font-mono">greenhouse_id</span> to update).
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => downloadTextFile("vegpro-sites-template.csv", sitesCsvTemplateContent())}
          >
            <Download className="mr-2 size-4" />
            Blank template
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!farms.length && !greenhouses.length}
            onClick={() =>
              downloadTextFile(
                "vegpro-sites-export.csv",
                exportSitesCsv(farms, greenhouses),
              )
            }
          >
            <Download className="mr-2 size-4" />
            Export current sites
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onImportFile(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="default"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 size-4" />
            Upload CSV
          </Button>
        </div>
        {importPreview ? (
          <pre className="max-h-40 overflow-auto rounded-lg bg-muted/40 p-2 text-xs">{importPreview}</pre>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card space-y-3 rounded-2xl p-4">
          <h2 className="text-lg font-semibold">{editFarmId ? "Edit farm" : "Add farm"}</h2>
          <form className="grid gap-3" onSubmit={(e) => void onSaveFarm(e)}>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Name</span>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
                value={farmForm.name}
                onChange={(e) => setFarmForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Location</span>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
                value={farmForm.location}
                onChange={(e) => setFarmForm((f) => ({ ...f, location: e.target.value }))}
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Type</span>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
                value={farmForm.type}
                onChange={(e) => setFarmForm((f) => ({ ...f, type: e.target.value }))}
                required
              />
            </label>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {editFarmId ? "Save farm" : "Add farm"}
              </Button>
              {editFarmId ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditFarmId(null);
                    setFarmForm({ name: "", location: "", type: "Greenhouse" });
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="glass-card space-y-3 rounded-2xl p-4">
          <h2 className="text-lg font-semibold">
            {ghForm.id ? "Edit greenhouse" : "Add greenhouse"}
          </h2>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => void onSaveGreenhouse(e)}>
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-sm font-medium">Farm</span>
              <AppSelect
                aria-label="Farm"
                value={ghForm.farm_id}
                onChange={(v) => setGhForm((g) => ({ ...g, farm_id: v }))}
                options={[{ value: "", label: "Select farm…" }, ...farmOptions]}
              />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-sm font-medium">Greenhouse name</span>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
                value={ghForm.name}
                onChange={(e) => setGhForm((g) => ({ ...g, name: e.target.value }))}
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Variety</span>
              <AppSelect
                aria-label="Variety"
                value={ghForm.crop_type}
                onChange={(v) => setGhForm((g) => ({ ...g, crop_type: v }))}
                options={varietySelectOptions}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Area (sqm)</span>
              <input
                type="number"
                step="any"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
                value={ghForm.area_sqm}
                onChange={(e) => setGhForm((g) => ({ ...g, area_sqm: e.target.value }))}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Latitude</span>
              <input
                type="number"
                step="any"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
                value={ghForm.latitude}
                onChange={(e) => setGhForm((g) => ({ ...g, latitude: e.target.value }))}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Longitude</span>
              <input
                type="number"
                step="any"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
                value={ghForm.longitude}
                onChange={(e) => setGhForm((g) => ({ ...g, longitude: e.target.value }))}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Bay count</span>
              <input
                type="number"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
                value={ghForm.bay_count}
                onChange={(e) => setGhForm((g) => ({ ...g, bay_count: e.target.value }))}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Columns per bay</span>
              <input
                type="number"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
                value={ghForm.column_count}
                onChange={(e) => setGhForm((g) => ({ ...g, column_count: e.target.value }))}
              />
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={busy || !ghForm.farm_id}>
                {ghForm.id ? "Save greenhouse" : "Add greenhouse"}
              </Button>
              {ghForm.id ? (
                <Button type="button" variant="ghost" onClick={() => setGhForm(emptyGhForm)}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </div>
      </div>

      <div className="glass-card rounded-2xl">
        <h3 className="border-b border-border/70 bg-muted/30 px-4 py-3 text-sm font-semibold">
          Farms
        </h3>
        {loading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
        ) : !farms.length ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No farms yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/70 text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Location</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Greenhouses</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {farms.map((f) => (
                  <tr key={f.id} className="border-b border-border/50">
                    <td className="px-4 py-3 font-medium">{f.name}</td>
                    <td className="px-4 py-3">{f.location}</td>
                    <td className="px-4 py-3">{f.type}</td>
                    <td className="px-4 py-3">{f.greenhouse_count}</td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditFarmId(f.id);
                          setFarmForm({
                            name: f.name,
                            location: f.location,
                            type: f.type,
                          });
                        }}
                      >
                        <Pencil className="mr-1 size-3.5" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl">
        <h3 className="border-b border-border/70 bg-muted/30 px-4 py-3 text-sm font-semibold">
          Greenhouses
        </h3>
        {loading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
        ) : !greenhouses.length ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No greenhouses yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/70 text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Farm</th>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Variety</th>
                  <th className="px-4 py-2 font-medium">GPS</th>
                  <th className="px-4 py-2 font-medium">Area sqm</th>
                  <th className="px-4 py-2 font-medium">Bays</th>
                  <th className="px-4 py-2 font-medium">Columns</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {greenhouses.map((g) => (
                  <tr key={g.id} className="border-b border-border/50">
                    <td className="px-4 py-3">{g.farm_name}</td>
                    <td className="px-4 py-3 font-medium">{g.name}</td>
                    <td className="px-4 py-3">{g.crop_type}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {g.latitude != null && g.longitude != null
                        ? `${g.latitude.toFixed(4)}, ${g.longitude.toFixed(4)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">{g.area_sqm ?? "—"}</td>
                    <td className="px-4 py-3">{g.bay_count ?? "—"}</td>
                    <td className="px-4 py-3">{g.column_count ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditGreenhouse(g)}
                      >
                        <Pencil className="mr-1 size-3.5" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
