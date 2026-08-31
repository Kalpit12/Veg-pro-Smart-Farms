"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, ClipboardList, Shield, Users } from "lucide-react";

import { cn } from "@/lib/utils";

export type LoginPortal = "worker" | "manager" | "admin";

export const ROLE_OPTIONS: {
  value: LoginPortal;
  label: string;
  description: string;
  icon: typeof Users;
}[] = [
  {
    value: "worker",
    label: "Field worker",
    description: "Scouting and infestation reports",
    icon: Users,
  },
  {
    value: "manager",
    label: "Farm manager",
    description: "Maps, spray logging, and field ops",
    icon: ClipboardList,
  },
  {
    value: "admin",
    label: "Admin",
    description: "Executive dashboard and approvals",
    icon: Shield,
  },
];

type Props = {
  value: LoginPortal;
  onChange: (value: LoginPortal) => void;
  disabled?: boolean;
};

export function RoleSelect({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = ROLE_OPTIONS.find((o) => o.value === value) ?? ROLE_OPTIONS[0];
  const SelectedIcon = selected.icon;

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
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
    const index = ROLE_OPTIONS.findIndex((o) => o.value === value);
    setHighlightIndex(index >= 0 ? index : 0);
  }, [value, open]);

  const selectOption = (option: LoginPortal) => {
    onChange(option);
    setOpen(false);
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((prev) => !prev);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlightIndex((i) => Math.min(i + 1, ROLE_OPTIONS.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setHighlightIndex((i) => Math.max(i - 1, 0));
    }
  };

  const onListKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, ROLE_OPTIONS.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectOption(ROLE_OPTIONS[highlightIndex].value);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={`${listboxId}-trigger`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border border-border bg-background p-3 text-left text-base transition",
          "hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open && "border-primary/40 ring-2 ring-ring/40",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <SelectedIcon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium leading-tight">{selected.label}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {selected.description}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={`${listboxId}-trigger`}
          tabIndex={-1}
          onKeyDown={onListKeyDown}
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-background p-1 shadow-lg"
        >
          {ROLE_OPTIONS.map((option, index) => {
            const Icon = option.icon;
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
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition",
                    isHighlighted && "bg-primary/10",
                    isSelected && "bg-primary/15",
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                  {isSelected ? (
                    <Check className="size-4 shrink-0 text-primary" aria-hidden />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
