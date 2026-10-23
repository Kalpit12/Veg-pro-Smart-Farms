"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { chemicalsCsvTemplateContent } from "@/lib/chemicals-csv";
import { hasConfiguredBackend } from "@/lib/data-backend";
import {
  deactivateChemicalAction,
  importChemicalsCsvAction,
  listAdminChemicalsAction,
  upsertChemicalAction,
  type ChemicalRow,
} from "@/features/admin/chemicals-actions";

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ChemicalsPanel() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ChemicalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [activeIngredient, setActiveIngredient] = useState("");
  const [importPreview, setImportPreview] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listAdminChemicalsAction();
    if (error) {
      toast({ title: "Could not load chemicals", description: error.message, tone: "error" });
    } else {
      setRows((data ?? []) as ChemicalRow[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onImportFile = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const result = await importChemicalsCsvAction(text);
      setImportPreview(
        `Added ${result.added}, updated ${result.updated}, skipped ${result.skipped}` +
          (result.errors.length ? `\n${result.errors.slice(0, 8).join("\n")}` : ""),
      );
      toast({
        title: "Import finished",
        description: `${result.added} added, ${result.updated} updated.`,
        tone: result.errors.length ? "default" : "success",
      });
      await refresh();
    } catch (e) {
      toast({
        title: "Import failed",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await upsertChemicalAction({
      name,
      active_ingredient: activeIngredient || undefined,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, tone: "error" });
      return;
    }
    setName("");
    setActiveIngredient("");
    toast({ title: "Product saved", tone: "success" });
    await refresh();
  };

  const onDeactivate = async (row: ChemicalRow) => {
    if (!row.is_active) return;
    setBusy(true);
    const { error } = await deactivateChemicalAction(row.id);
    setBusy(false);
    if (error) {
      toast({ title: "Could not remove", description: error.message, tone: "error" });
      return;
    }
    toast({ title: "Product removed from spray list", tone: "success" });
    await refresh();
  };

  if (!hasConfiguredBackend()) {
    return (
      <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
        Connect the database to manage insecticide products.
      </p>
    );
  }

  const activeRows = rows.filter((r) => r.is_active);

  return (
    <div className="space-y-6">
      <div className="glass-card space-y-4 rounded-2xl p-4">
        <h2 className="text-lg font-semibold">Upload chemical list</h2>
        <p className="text-sm text-muted-foreground">
          CSV with columns <span className="font-mono">name</span> and optional{" "}
          <span className="font-mono">active_ingredient</span>. Managers pick from this list
          when logging sprays.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              downloadTextFile("vegpro-chemicals-template.csv", chemicalsCsvTemplateContent())
            }
          >
            <Download className="mr-2 size-4" />
            Blank template
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
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 size-4" />
            Upload CSV
          </Button>
        </div>
        {importPreview ? (
          <pre className="max-h-32 overflow-auto rounded-lg bg-muted/40 p-2 text-xs">
            {importPreview}
          </pre>
        ) : null}
      </div>

      <div className="glass-card space-y-3 rounded-2xl p-4">
        <h2 className="text-lg font-semibold">Add product</h2>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => void onAdd(e)}>
          <label className="block space-y-1 sm:col-span-1">
            <span className="text-sm font-medium">Product name</span>
            <input
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1 sm:col-span-1">
            <span className="text-sm font-medium">Active ingredient (optional)</span>
            <input
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
              value={activeIngredient}
              onChange={(e) => setActiveIngredient(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={busy} className="sm:col-span-2 sm:w-fit">
            Save product
          </Button>
        </form>
      </div>

      <div className="glass-card space-y-3 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Spray products</h2>
          <span className="text-sm text-muted-foreground">
            {activeRows.length} active
          </span>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : activeRows.length ? (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {activeRows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">{row.name}</p>
                  {row.active_ingredient ? (
                    <p className="text-xs text-muted-foreground">{row.active_ingredient}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void onDeactivate(row)}
                  aria-label={`Remove ${row.name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No products yet. Upload a CSV or add one above.
          </p>
        )}
      </div>
    </div>
  );
}
