import { toAppDateTimeIso } from "@/lib/kenya-time";

export type ServiceError = { message: string };

export function ok<T>(data: T) {
  return { data, error: null as ServiceError | null };
}

export function fail(message: string) {
  return { data: null, error: { message } };
}

/**
 * Serialize an MS SQL timestamp for the app.
 *
 * The database stores Kenya wall-clock time in DATETIME2 (no time zone), e.g.
 * 19:17 for a report saved at 19:17 EAT. The driver (useUTC, its default) returns
 * that as a Date of 19:17 *UTC*. Treat its UTC fields as the
 * Kenya wall clock — converting it as a real UTC instant added 3 hours.
 */
export function toIso(value: unknown): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return `${value.toISOString().slice(0, 23)}+03:00`;
  }
  return toAppDateTimeIso(value);
}
