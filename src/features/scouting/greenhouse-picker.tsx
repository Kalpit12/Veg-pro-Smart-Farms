"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

import {
  compareStarGreenhouseName,
  formatAreaSqm,
  starGreenhouseRow,
} from "@/lib/bemack-master-data";
import { cn } from "@/lib/utils";

export type GreenhousePickerOption = {
  id: string;
  name: string;
};

type Props = {
  value: string;
  onChange: (greenhouseName: string) => void;
  options: GreenhousePickerOption[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
};

type RowMeta = {
  name: string;
  variety: string;
  area: string;
  bays: string;
  cols: string;
};

function metaFor(name: string): RowMeta {
  const row = starGreenhouseRow(name);
  return {
    name: row.name,
    variety: row.varieties.join(" / ") || "—",
    area: formatAreaSqm(row.areaSqm),
    bays: String(row.bayMax),
    cols: String(row.columnMax),
  };
}

function TriggerSummary({ meta }: { meta: RowMeta }) {
  return (
    <span className="min-w-0 flex-1 text-left">
      <span className="block truncate font-semibold tabular-nums">{meta.name}</span>
      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
        {meta.variety}
        <span className="text-muted-foreground/80">
          {" "}
          · {meta.area} · {meta.bays} bays · {meta.cols} cols
        </span>
      </span>
    </span>
  );
}

function OptionContent({ meta, selected }: { meta: RowMeta; selected?: boolean }) {
  return (
    <span className="min-w-0 flex-1">
      {/* Mobile: stacked, always fits viewport */}
      <span className="block sm:hidden">
        <span className="flex items-start justify-between gap-2">
          <span className={cn("font-semibold tabular-nums", selected && "text-primary")}>
            {meta.name}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {meta.variety}
        </span>
        <span className="mt-1 grid grid-cols-3 gap-2 text-[11px] tabular-nums text-muted-foreground">
          <span className="truncate">{meta.area}</span>
          <span className="truncate text-center">{meta.bays} bays</span>
          <span className="truncate text-right">{meta.cols} cols</span>
        </span>
      </span>

      {/* Desktop: aligned columns that fit the panel width (no fixed min-width) */}
      <span className="hidden w-full grid-cols-[6rem_minmax(0,1.5fr)_5.25rem_3rem_3rem] items-center gap-x-2 text-sm sm:grid">
        <span className={cn("truncate font-semibold tabular-nums", selected && "text-primary")}>
          {meta.name}
        </span>
        <span className="truncate text-muted-foreground">{meta.variety}</span>
        <span className="truncate text-right tabular-nums text-muted-foreground">
          {meta.area}
        </span>
        <span className="truncate text-right tabular-nums text-muted-foreground">
          {meta.bays}
        </span>
        <span className="truncate text-right tabular-nums text-muted-foreground">
          {meta.cols}
        </span>
      </span>
    </span>
  );
}

/**
 * Custom greenhouse listbox — mobile-safe (no wide min-width), portal panel so parents can’t clip it.
 */
export function GreenhousePicker({
  value,
  onChange,
  options,
  disabled,
  placeholder = "Choose greenhouse…",
  className,
  "data-testid": testId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const sorted = useMemo(
    () => [...options].sort((a, b) => compareStarGreenhouseName(a.name, b.name)),
    [options],
  );

  const selectedMeta = value ? metaFor(value) : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((o) => {
      const m = metaFor(o.name);
      return (
        m.name.toLowerCase().includes(q) ||
        m.variety.toLowerCase().includes(q) ||
        m.area.toLowerCase().includes(q)
      );
    });
  }, [sorted, query]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePanelPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const maxHeight = Math.min(window.innerHeight * 0.55, 360);
    const spaceBelow = window.innerHeight - rect.bottom - gap - 12;
    const spaceAbove = rect.top - gap - 12;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const height = Math.min(maxHeight, openUp ? spaceAbove : spaceBelow);

    setPanelStyle({
      position: "fixed",
      left: Math.max(8, rect.left),
      width: Math.min(rect.width, window.innerWidth - 16),
      maxWidth: window.innerWidth - 16,
      zIndex: 200,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + gap, maxHeight: height }
        : { top: rect.bottom + gap, maxHeight: height }),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
    const onReposition = () => updatePanelPosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    const index = filtered.findIndex((o) => o.name === value);
    setHighlightIndex(index >= 0 ? index : 0);
  }, [value, open, filtered]);

  const selectOption = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  const onListKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const opt = filtered[highlightIndex];
      if (opt) selectOption(opt.name);
    }
  };

  const panel = open && mounted ? (
    <div
      ref={panelRef}
      style={panelStyle}
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl"
    >
      <div className="shrink-0 border-b border-border p-2">
        <input
          ref={searchRef}
          className="w-full rounded-lg border border-border bg-muted/40 px-2.5 py-2 text-sm"
          placeholder="Search house or variety…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onListKeyDown}
        />
      </div>

      <div className="hidden shrink-0 border-b border-border bg-muted/30 px-3 py-1.5 sm:block">
        <div className="grid w-full grid-cols-[6rem_minmax(0,1.5fr)_5.25rem_3rem_3rem] gap-x-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>House</span>
          <span>Variety</span>
          <span className="text-right">Area</span>
          <span className="text-right">Bays</span>
          <span className="text-right">Cols</span>
        </div>
      </div>

      <ul
        id={listboxId}
        role="listbox"
        tabIndex={-1}
        onKeyDown={onListKeyDown}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1"
      >
        {filtered.length ? (
          filtered.map((option, index) => {
            const meta = metaFor(option.name);
            const isSelected = option.name === value;
            const isHighlighted = index === highlightIndex;
            return (
              <li key={option.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => selectOption(option.name)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg px-2.5 py-2.5 text-left transition",
                    isHighlighted && "bg-primary/10",
                    isSelected && "bg-primary/15",
                  )}
                >
                  <OptionContent meta={meta} selected={isSelected} />
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                    {isSelected ? (
                      <Check className="size-4 text-primary" aria-hidden />
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })
        ) : (
          <li className="px-3 py-3 text-sm text-muted-foreground">No matches</li>
        )}
      </ul>
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={cn("relative min-w-0 w-full", className)}>
      <button
        ref={triggerRef}
        type="button"
        data-testid={testId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label="Pick greenhouse"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={cn(
          "flex w-full max-w-full items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm transition",
          "hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          open && "border-primary/50 ring-2 ring-primary/25",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        {selectedMeta ? (
          <TriggerSummary meta={selectedMeta} />
        ) : (
          <span className="min-w-0 flex-1 text-left text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180 text-primary",
          )}
          aria-hidden
        />
      </button>

      {mounted ? createPortal(panel, document.body) : null}
    </div>
  );
}
