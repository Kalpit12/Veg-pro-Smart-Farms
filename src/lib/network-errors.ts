export function isLikelyOfflineError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error ?? "");
  return /failed to fetch|network|offline|ERR_INTERNET|Load failed|fetch|ECONN|ETIMEDOUT|NetworkError/i.test(
    msg,
  );
}
