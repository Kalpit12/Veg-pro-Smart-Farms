/** East Africa Time — Kenya (UTC+3, no DST). */
export const KENYA_TIME_ZONE = "Africa/Nairobi";

const KENYA_OFFSET = "+03:00";

type DateParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
  fraction: string;
};

function partsInKenya(date: Date): DateParts {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: KENYA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const map = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const ms = date.getMilliseconds();
  return {
    year: map.year ?? "1970",
    month: map.month ?? "01",
    day: map.day ?? "01",
    hour: map.hour ?? "00",
    minute: map.minute ?? "00",
    second: map.second ?? "00",
    fraction: String(ms).padStart(3, "0"),
  };
}

/** ISO-8601 with +03:00 for the current instant (API / client writes). */
export function kenyaNowIso(): string {
  return formatKenyaOffsetIso(new Date());
}

/** @deprecated Use {@link kenyaNowIso} — kept as a short alias for migrations from UTC `toISOString()`. */
export const appNowIso = kenyaNowIso;

export function formatKenyaOffsetIso(date: Date): string {
  const p = partsInKenya(date);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.${p.fraction}${KENYA_OFFSET}`;
}

/** Kenya wall clock for SQL `DATETIME2` (no timezone suffix). */
export function toSqlDateTime2Kenya(value?: Date | string): string {
  const date =
    value == null
      ? new Date()
      : typeof value === "string"
        ? parseAppDateTime(value)
        : value;
  const p = partsInKenya(date);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}.${p.fraction}`;
}

export function parseAppDateTime(value: string): Date {
  const trimmed = value.trim();
  if (!trimmed) return new Date(Number.NaN);
  if (/[zZ]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }
  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  return new Date(`${normalized}${KENYA_OFFSET}`);
}

/**
 * Serialize DB / API timestamps for the UI and JSON.
 * Naive SQL datetimes are treated as Kenya wall clock; UTC (Z) values are converted to EAT.
 */
export function toAppDateTimeIso(value: unknown): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return formatKenyaOffsetIso(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/[zZ]$/.test(trimmed)) {
      return formatKenyaOffsetIso(new Date(trimmed));
    }
    if (/[+-]\d{2}:\d{2}$/.test(trimmed)) {
      return formatKenyaOffsetIso(new Date(trimmed));
    }
    const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
    const withMs = /\.\d{1,3}$/.test(normalized) ? normalized : `${normalized}.000`;
    return `${withMs}${KENYA_OFFSET}`;
  }
  return String(value ?? "");
}

type KenyaFormatStyle = "short" | "medium" | "long" | "time";

const KENYA_FORMAT: Record<
  KenyaFormatStyle,
  Intl.DateTimeFormatOptions
> = {
  short: {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  },
  medium: {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  },
  long: {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  },
  time: { hour: "2-digit", minute: "2-digit", hour12: false },
};

/** User-visible date/time in Kenya, independent of browser timezone. */
export function formatKenyaDateTime(
  value: string | Date,
  style: KenyaFormatStyle = "short",
): string {
  const date = typeof value === "string" ? parseAppDateTime(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: KENYA_TIME_ZONE,
    ...KENYA_FORMAT[style],
  }).format(date);
}
