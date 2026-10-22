/** RFC UUID (versions 1–5). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Any GUID SQL Server stores (includes Bemack seed IDs like beeeee01-0001-0001-0001-…). */
const SQL_GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function isSqlGuid(value: string | null | undefined): value is string {
  return typeof value === "string" && SQL_GUID_RE.test(value);
}
