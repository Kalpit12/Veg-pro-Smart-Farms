export const CHART_AXIS_TICK = {
  fill: "currentColor",
  fontFamily: "var(--font-chart-label), sans-serif",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
} as const;

export const CHART_LEGEND_STYLE = {
  fontFamily: "var(--font-chart-label), sans-serif",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
};

export const CHART_GRID_STROKE = "color-mix(in oklab, var(--color-border) 70%, transparent)";

export function formatChartSeriesName(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
