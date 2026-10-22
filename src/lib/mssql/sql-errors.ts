/** True when SQL Server reports a missing table/view (error 208). */
export function isMssqlMissingObjectError(e: unknown, objectName?: string): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  if (!/Invalid object name|does not exist/i.test(msg)) return false;
  if (!objectName) return true;
  return msg.toLowerCase().includes(objectName.toLowerCase());
}
