"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Apple, Flower2, Sprout } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ResponsiveChart } from "@/components/charts/responsive-chart";
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
} from "@/features/dashboard/components/chart-theme";
import { VegProChartTooltip } from "@/features/dashboard/components/vegpro-chart-tooltip";
import { compareStarGreenhouseName, formatAreaSqm, starGreenhouseRow } from "@/lib/bemack-master-data";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

type CropRow = {
  crop_type: string;
  name: string;
  farms?: { name?: string } | null;
};

type Category = "Flowers" | "Fruits" | "Vegetables" | "Other";

function categorizeCrop(cropType: string): Category {
  const c = cropType.toLowerCase();
  if (/(rose|lily|marigold|jasmine|flower)/.test(c)) return "Flowers";
  if (/(apple|banana|mango|orange|grape|fruit|berry|papaya)/.test(c))
    return "Fruits";
  if (
    /(tomato|capsicum|pepper|onion|potato|okra|carrot|spinach|vegetable|cabbage|cauliflower|cucumber)/.test(
      c,
    )
  )
    return "Vegetables";
  return "Other";
}

const COLORS: Record<Category, string> = {
  Flowers: "#f472b6",
  Fruits: "#f59e0b",
  Vegetables: "#22c55e",
  Other: "#94a3b8",
};

export function CropIntelligencePanel() {
  const { toast } = useToast();
  const [rows, setRows] = useState<CropRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarm, setSelectedFarm] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  const load = useCallback(async () => {
    if (!hasSupabaseEnv()) {
      setRows([
        { crop_type: "Cut Rose", name: "STGH01A", farms: { name: "Star" } },
        { crop_type: "Cut Rose", name: "STGH02A", farms: { name: "Star" } },
        { crop_type: "Cut Rose", name: "STGH03A", farms: { name: "Star" } },
      ]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("greenhouses")
        .select("crop_type, name, farms(name)")
        .order("name");
      if (error) throw error;
      setRows((data as CropRow[]) ?? []);
    } catch (e) {
      toast({
        title: "Crop insights unavailable",
        description: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const farmOptions = useMemo(() => {
    const farms = new Set<string>();
    rows.forEach((r) => {
      if (r.farms?.name) farms.add(r.farms.name);
    });
    return [...farms].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const cropTypeOptions = useMemo(() => {
    const types = new Set<string>();
    rows.forEach((r) => types.add(r.crop_type));
    return [...types].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows
      .filter((r) => {
        const farmOk =
          selectedFarm === "all" ? true : (r.farms?.name ?? "") === selectedFarm;
        const categoryOk =
          selectedCategory === "all"
            ? true
            : categorizeCrop(r.crop_type) === selectedCategory;
        const typeOk = selectedType === "all" ? true : r.crop_type === selectedType;
        return farmOk && categoryOk && typeOk;
      })
      .sort((a, b) => compareStarGreenhouseName(a.name, b.name));
  }, [rows, selectedFarm, selectedCategory, selectedType]);

  const categoryData = useMemo(() => {
    const counts: Record<Category, number> = {
      Flowers: 0,
      Fruits: 0,
      Vegetables: 0,
      Other: 0,
    };
    filteredRows.forEach((r) => {
      counts[categorizeCrop(r.crop_type)] += 1;
    });
    return (Object.keys(counts) as Category[]).map((name) => ({
      name,
      value: counts[name],
    }));
  }, [filteredRows]);

  const typeData = useMemo(() => {
    const map = new Map<string, number>();
    filteredRows.forEach((r) =>
      map.set(r.crop_type, (map.get(r.crop_type) ?? 0) + 1),
    );
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredRows]);

  const totals = useMemo(
    () => ({
      flowers: categoryData.find((c) => c.name === "Flowers")?.value ?? 0,
      fruits: categoryData.find((c) => c.name === "Fruits")?.value ?? 0,
      vegetables: categoryData.find((c) => c.name === "Vegetables")?.value ?? 0,
    }),
    [categoryData],
  );

  return (
    <section className="space-y-4">
      <div className="glass-card rounded-2xl p-4">
        <h3 className="text-base font-semibold">Crops by greenhouse</h3>
        <p className="text-sm text-muted-foreground">Greenhouse crop mix.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <select
            className="veg-select"
            value={selectedFarm}
            onChange={(e) => setSelectedFarm(e.target.value)}
          >
            <option value="all">All farms</option>
            {farmOptions.map((farm) => (
              <option key={farm} value={farm}>
                {farm}
              </option>
            ))}
          </select>
          <select
            className="veg-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as Category | "all")}
          >
            <option value="all">All categories</option>
            <option value="Flowers">Flowers</option>
            <option value="Fruits">Fruits</option>
            <option value="Vegetables">Vegetables</option>
            <option value="Other">Other</option>
          </select>
          <select
            className="veg-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="all">All crop types</option>
            {cropTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-pink-400">
            <Flower2 className="size-4" />
            <p className="text-sm">Flowers</p>
          </div>
          <p className="mt-2 text-2xl font-semibold">{totals.flowers}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Apple className="size-4" />
            <p className="text-sm">Fruits</p>
          </div>
          <p className="mt-2 text-2xl font-semibold">{totals.fruits}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Sprout className="size-4" />
            <p className="text-sm">Vegetables</p>
          </div>
          <p className="mt-2 text-2xl font-semibold">{totals.vegetables}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="glass-card rounded-2xl p-4 xl:col-span-1">
          <h4 className="font-chart-display mb-3 text-base font-semibold">Category Mix</h4>
          <div className="chart-surface">
            <ResponsiveChart height={256} className="chart-surface">
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={90}>
                  {categoryData.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name as Category]} />
                  ))}
                </Pie>
                <Tooltip content={(props) => <VegProChartTooltip {...props} />} />
              </PieChart>
            </ResponsiveChart>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 xl:col-span-2">
          <h4 className="font-chart-display mb-3 text-base font-semibold">Top Crop Types</h4>
          <div className="chart-surface">
            <ResponsiveChart height={256} className="chart-surface">
              <BarChart data={typeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray="4 6" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={CHART_AXIS_TICK}
                  width={32}
                />
                <Tooltip content={(props) => <VegProChartTooltip {...props} />} />
                <Bar dataKey="value" name="Greenhouses" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveChart>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-4">
        <h4 className="mb-3 text-sm font-semibold">Tracked Produce by Greenhouse</h4>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading crop details…</p>
        ) : filteredRows.length ? (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {filteredRows.map((r, idx) => (
              <div key={`${r.name}-${r.crop_type}-${idx}`} className="rounded-lg bg-background/60 p-3">
                <p className="text-sm font-semibold">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {starGreenhouseRow(r.name).varieties.join(" / ")} ·{" "}
                  {formatAreaSqm(starGreenhouseRow(r.name).areaSqm)} ·{" "}
                  {starGreenhouseRow(r.name).bayMax} bays
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.crop_type} • {r.farms?.name ?? "Farm"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No crop data found for the selected filters.
          </p>
        )}
      </div>
    </section>
  );
}

