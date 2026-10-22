"use client";

import { cn } from "@/lib/utils";

export type { AdminSelectOption } from "@/components/ui/admin-select";

type AdminSelectOption = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: AdminSelectOption[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  nativeClassName?: string;
  size?: "sm" | "md";
  align?: "start" | "end";
  "aria-label"?: string;
};

/** Native select everywhere — avoids clipped custom listboxes in admin layouts. */
export function AppSelect({
  value,
  onChange,
  options,
  disabled,
  placeholder,
  className,
  nativeClassName,
  size = "md",
  "aria-label": ariaLabel,
}: Props) {
  const hasEmpty = options.some((o) => o.value === "");
  const showPlaceholder = placeholder && !hasEmpty && !value;

  return (
    <select
      className={cn(
        "w-full min-w-0 border border-primary/25 bg-primary/[0.04] font-medium text-foreground",
        "hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        size === "sm" ? "rounded-lg px-2.5 py-1.5 text-sm" : "rounded-xl px-3 py-2.5 text-sm",
        disabled && "cursor-not-allowed opacity-50",
        className,
        nativeClassName,
      )}
      value={showPlaceholder ? "" : value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    >
      {placeholder && !hasEmpty ? (
        <option value="" disabled={!!value}>
          {placeholder}
        </option>
      ) : null}
      {options.map((opt) => (
        <option key={opt.value || "__empty__"} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
