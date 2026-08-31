export const HISTORY_LOOKBACK_MONTHS = 3;

export function getHistorySinceDate(months = HISTORY_LOOKBACK_MONTHS) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  since.setHours(0, 0, 0, 0);
  return since;
}
