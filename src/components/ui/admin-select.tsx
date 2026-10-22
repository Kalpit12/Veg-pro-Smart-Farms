"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type AdminSelectOption = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: AdminSelectOption[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Wider lists (greenhouses) stay usable. */
  size?: "sm" | "md";
  align?: "start" | "end";
  "aria-label"?: string;
};

export function AdminSelect({
  value,
  onChange,
  options,
  disabled,
  placeholder = "Select…",
  className,
  size = "md",
  align = "end",
  "aria-label": ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const showSearch = options.length > 12;
  const [panelStyle, setPanelStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  const updatePanelPosition = () => {
    const trigger = rootRef.current?.querySelector("button");
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const viewportPad = 8;
    const panelWidth = Math.min(window.innerWidth - viewportPad * 2, Math.max(rect.width, 280));
    let left = align === "end" ? rect.right - panelWidth : rect.left;
    left = Math.max(viewportPad, Math.min(left, window.innerWidth - panelWidth - viewportPad));

    const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPad;
    const spaceAbove = rect.top - gap - viewportPad;
    const preferBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove;
    const maxHeight = Math.min(320, Math.max(120, preferBelow ? spaceBelow : spaceAbove));
    const top = preferBelow ? rect.bottom + gap : rect.top - gap - maxHeight;

    setPanelStyle({ top, left, width: panelWidth, maxHeight });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return;
    }
    updatePanelPosition();
    const onReposition = () => updatePanelPosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, align, options.length]);

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
    const index = filtered.findIndex((o) => o.value === value);
    setHighlightIndex(index >= 0 ? index : 0);
  }, [value, open, filtered]);

  const selectOption = (next: string) => {
    onChange(next);
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
      if (opt) selectOption(opt.value);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center gap-2 border text-left transition",
          "border-primary/25 bg-primary/[0.04] hover:border-primary/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          size === "sm" ? "rounded-lg px-2.5 py-1.5 text-sm" : "rounded-xl px-3 py-2.5 text-sm",
          open && "border-primary/50 ring-2 ring-primary/25",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate font-medium",
            !selected && "font-normal text-muted-foreground",
          )}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-primary/80 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && panelStyle && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              style={{
                position: "fixed",
                top: panelStyle.top,
                left: panelStyle.left,
                width: panelStyle.width,
                maxHeight: panelStyle.maxHeight,
                zIndex: 9999,
              }}
              className="flex flex-col overflow-hidden rounded-xl border border-primary/20 bg-background shadow-lg"
            >
              {showSearch ? (
                <div className="shrink-0 border-b border-border p-2">
                  <input
                    ref={searchRef}
                    className="w-full rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-sm"
                    placeholder="Search…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onListKeyDown}
                  />
                </div>
              ) : null}
              <ul
                id={listboxId}
                role="listbox"
                tabIndex={-1}
                onKeyDown={onListKeyDown}
                className="min-h-0 flex-1 overflow-y-auto p-1"
              >
                {filtered.length ? (
                  filtered.map((option, index) => {
                    const isSelected = option.value === value;
                    const isHighlighted = index === highlightIndex;
                    return (
                      <li key={option.value} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onMouseEnter={() => setHighlightIndex(index)}
                          onClick={() => selectOption(option.value)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
                            isHighlighted && "bg-primary/10",
                            isSelected && "bg-primary/15 font-medium",
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate">{option.label}</span>
                          {isSelected ? (
                            <Check className="size-4 shrink-0 text-primary" aria-hidden />
                          ) : null}
                        </button>
                      </li>
                    );
                  })
                ) : (
                  <li className="px-3 py-2 text-sm text-muted-foreground">No matches</li>
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
