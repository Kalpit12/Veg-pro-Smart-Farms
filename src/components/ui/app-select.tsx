"use client";

import { usePathname } from "next/navigation";

import { AdminSelect, type AdminSelectOption } from "@/components/ui/admin-select";
import { cn } from "@/lib/utils";

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

/** Custom admin listbox on `/admin/*`; native select everywhere else. */
export function AppSelect({
  value,
  onChange,
  options,
  disabled,
  placeholder,
  className,
  nativeClassName,
  size = "md",
  align = "end",
  "aria-label": ariaLabel,
}: Props) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  if (isAdmin) {
    return (
      <AdminSelect
        value={value}
        onChange={onChange}
        options={options}
        disabled={disabled}
        placeholder={placeholder}
        className={className}
        size={size}
        align={align}
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <select
      className={cn(
        "rounded-lg border border-border bg-background px-3 py-2 text-sm",
        nativeClassName,
      )}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    >
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
