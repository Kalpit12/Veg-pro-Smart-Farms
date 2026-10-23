/** Extract a message from thrown values or `{ error: { message } }` service results. */
export function readServiceError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Unknown error";
}

/** Replace opaque Next.js production server-action errors with actionable text. */
export function friendlyDataErrorMessage(err: unknown): string {
  const raw = readServiceError(err);
  if (
    raw.includes("Server Components render") ||
    raw.includes("digest property")
  ) {
    return "Database request failed or timed out. On the Scouting SQL database, run sql/mssql/014_dashboard_performance_indexes.sql, then restart the app.";
  }
  if (raw.includes("Query timeout expired") || raw.includes("ETIMEOUT")) {
    return "SQL query timed out. Run sql/mssql/014_dashboard_performance_indexes.sql on the Scouting database and redeploy the latest app build.";
  }
  return raw;
}
