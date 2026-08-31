"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
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
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const showSearch = options.length > 12;

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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

      {open ? (
        <div
          className={cn(
            "absolute z-[80] mt-1.5 min-w-full overflow-hidden rounded-xl border border-primary/20 bg-background",
            align === "end" ? "right-0" : "left-0",
            "w-[min(100vw-2rem,22rem)]",
          )}
        >
          {showSearch ? (
            <div className="border-b border-border p-2">
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
            className="max-h-64 overflow-y-auto p-1"
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
        </div>
      ) : null}
    </div>
  );
}
