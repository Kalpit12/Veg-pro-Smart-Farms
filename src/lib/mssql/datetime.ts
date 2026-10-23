import { toSqlDateTime2Kenya } from "@/lib/kenya-time";

/** Bind JavaScript dates / ISO strings as Kenya wall-clock `DATETIME2`. */
export function bindSqlDateTime2(value: Date | string): string {
  return toSqlDateTime2Kenya(value);
}

/** SQL expression: current Kenya local time (EAT, UTC+3). */
export const SQL_KENYA_NOW = "DATEADD(HOUR, 3, SYSUTCDATETIME())";
