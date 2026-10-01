export type ServiceError = { message: string };

export function ok<T>(data: T) {
  return { data, error: null as ServiceError | null };
}

export function fail(message: string) {
  return { data: null, error: { message } };
}

export function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return String(value ?? "");
}
