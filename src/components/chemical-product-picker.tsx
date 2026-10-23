"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type ChemicalPickerOption = {
  id: string;
  name: string;
  active_ingredient?: string | null;
};

type Props = {
  value: string;
  onChange: (name: string) => void;
  options: ChemicalPickerOption[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export function ChemicalProductPicker({
  value,
  onChange,
  options,
  disabled,
  placeholder = "Search insecticide…",
  className,
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
    () => [...options].sort((a, b) => a.name.localeCompare(b.name)),
    [options],
  );

  const selected = sorted.find((o) => o.name === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((o) => {
      const ai = o.active_ingredient?.toLowerCase() ?? "";
      return o.name.toLowerCase().includes(q) || ai.includes(q);
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
    const maxHeight = Math.min(window.innerHeight * 0.55, 320);
    const spaceBelow = window.innerHeight - rect.bottom - gap - 12;
    const spaceAbove = rect.top - gap - 12;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
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
    searchRef.current?.focus();
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
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, open]);

  const panel =
    open && mounted ? (
      <div
        ref={panelRef}
        role="listbox"
        id={listboxId}
        className="flex flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
        style={panelStyle}
      >
        <div className="border-b border-border p-2">
          <input
            ref={searchRef}
            type="search"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Type to search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && filtered[highlightIndex]) {
                e.preventDefault();
                onChange(filtered[highlightIndex]!.name);
                setOpen(false);
              }
            }}
          />
        </div>
        <ul className="max-h-[min(280px,50vh)] overflow-y-auto p-1">
          {filtered.length ? (
            filtered.map((opt, index) => {
              const isSelected = opt.name === value;
              const highlighted = index === highlightIndex;
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm",
                      highlighted && "bg-muted",
                      isSelected && "text-primary",
                    )}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => {
                      onChange(opt.name);
                      setOpen(false);
                    }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{opt.name}</span>
                      {opt.active_ingredient ? (
                        <span className="block text-xs text-muted-foreground">
                          {opt.active_ingredient}
                        </span>
                      ) : null}
                    </span>
                    {isSelected ? <Check className="mt-0.5 size-4 shrink-0" /> : null}
                  </button>
                </li>
              );
            })
          ) : (
            <li className="px-3 py-4 text-center text-sm text-muted-foreground">
              No matching products.
            </li>
          )}
        </ul>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || !options.length}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className="flex h-12 w-full items-center gap-2 rounded-xl border border-border bg-background px-3 text-left text-base disabled:opacity-60"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected ? (
            <>
              <span className="font-medium">{selected.name}</span>
              {selected.active_ingredient ? (
                <span className="ml-1 text-sm text-muted-foreground">
                  · {selected.active_ingredient}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {panel && createPortal(panel, document.body)}
    </div>
  );
}
