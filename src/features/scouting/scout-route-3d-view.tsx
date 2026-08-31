"use client";

import { useId, useMemo, useState } from "react";

import type { ScoutRouteStop } from "@/lib/scout-route";
import {
  buildGreenhouseIsoLayout,
  isoPoly,
  stopSeverityColor,
  type IsoPoint,
} from "@/lib/greenhouse-iso-layout";

type Props = {
  greenhouseName: string;
  stops: ScoutRouteStop[];
  activeStopId?: string | null;
  onSelectStop?: (id: string) => void;
};

function gridLines(layout: ReturnType<typeof buildGreenhouseIsoLayout>) {
  const lines: { a: IsoPoint; b: IsoPoint }[] = [];
  for (let c = 1; c < layout.maxColumn; c += 1) {
    lines.push({
      a: layout.project(c + 0.5, 0.5),
      b: layout.project(c + 0.5, layout.maxBay + 0.5),
    });
  }
  for (let b = 1; b < layout.maxBay; b += 1) {
    lines.push({
      a: layout.project(0.5, b + 0.5),
      b: layout.project(layout.maxColumn + 0.5, b + 0.5),
    });
  }
  return lines;
}

export function ScoutRoute3DView({
  greenhouseName,
  stops,
  activeStopId,
  onSelectStop,
}: Props) {
  const uid = useId();
  const width = 640;
  const height = 320;
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const layout = useMemo(
    () => buildGreenhouseIsoLayout(stops, width, height),
    [stops],
  );

  const projected = useMemo(
    () =>
      stops.map((stop) => ({
        stop,
        point: layout.project(stop.columnNo, stop.bayNo),
      })),
    [layout, stops],
  );

  const routePath = projected.map((p) => `${p.point.x},${p.point.y}`).join(" ");
  const latestStopId = stops[stops.length - 1]?.id;
  const focusId = activeStopId ?? hoveredId ?? latestStopId;
  const lines = gridLines(layout);

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-sky-100/80 to-emerald-50/40 dark:from-slate-900 dark:to-emerald-950/30">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-72 w-full"
          role="img"
          aria-label={`3D greenhouse route for ${greenhouseName}`}
        >
          <defs>
            <linearGradient id={`${uid}-floor`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0fdf4" />
              <stop offset="100%" stopColor="#dcfce7" />
            </linearGradient>
            <linearGradient id={`${uid}-wall`} x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#86efac" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#bbf7d0" stopOpacity="0.85" />
            </linearGradient>
            <filter id={`${uid}-shadow`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
            </filter>
          </defs>

          <ellipse
            cx={width / 2}
            cy={height * 0.84}
            rx={width * 0.34}
            ry={height * 0.05}
            fill="rgb(0 0 0 / 8%)"
          />

          <polygon points={isoPoly(layout.wallBack)} fill={`url(#${uid}-wall)`} opacity="0.7" />
          <polygon points={isoPoly(layout.wallLeft)} fill={`url(#${uid}-wall)`} opacity="0.85" />
          <polygon points={isoPoly(layout.wallRight)} fill={`url(#${uid}-wall)`} opacity="0.65" />
          <polygon
            points={isoPoly(layout.floor)}
            fill={`url(#${uid}-floor)`}
            stroke="#16a34a"
            strokeWidth="1.5"
          />

          {lines.map((line, i) => (
            <line
              key={i}
              x1={line.a.x}
              y1={line.a.y}
              x2={line.b.x}
              y2={line.b.y}
              stroke="rgb(22 163 74 / 18%)"
              strokeWidth="1"
            />
          ))}

          {routePath ? (
            <polyline
              points={routePath}
              fill="none"
              stroke="#2563eb"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6 4"
              opacity="0.9"
            />
          ) : null}

          {projected.map(({ stop, point }, index) => {
            const isLatest = stop.id === latestStopId;
            const isFocus = stop.id === focusId;
            const color = stopSeverityColor(stop.rating);
            const pinH = 18 + (stop.rating ?? 2) * 3;

            return (
              <g
                key={stop.id}
                filter={`url(#${uid}-shadow)`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredId(stop.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelectStop?.(stop.id)}
              >
                {isLatest ? (
                  <circle
                    cx={point.x}
                    cy={point.y - pinH - 4}
                    r={isFocus ? 16 : 12}
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="2"
                    opacity="0.45"
                  >
                    <animate
                      attributeName="r"
                      values={isFocus ? "14;18;14" : "10;14;10"}
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                ) : null}

                <line
                  x1={point.x}
                  y1={point.y}
                  x2={point.x}
                  y2={point.y - pinH}
                  stroke={color}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx={point.x} cy={point.y - pinH - 8} r={isFocus ? 11 : 9} fill={color} />
                <text
                  x={point.x}
                  y={point.y - pinH - 5}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill="white"
                >
                  {index + 1}
                </text>
                <circle cx={point.x} cy={point.y} r={4} fill={color} opacity="0.35" />
              </g>
            );
          })}

          <text x={layout.floor[0].x + 8} y={layout.floor[0].y + 18} fontSize="11" fill="#166534">
            Entrance
          </text>
          <text x={width - 118} y={28} fontSize="12" fontWeight="600" fill="#14532d">
            {greenhouseName}
          </text>
          <text x={width - 118} y={44} fontSize="10" fill="#4b5563">
            Columns → · Bays ↓
          </text>
        </svg>

        {focusId ? (
          <div className="absolute bottom-3 left-3 rounded-lg bg-card/90 px-3 py-2 text-xs shadow-sm backdrop-blur-sm">
            {(() => {
              const stop = stops.find((s) => s.id === focusId);
              if (!stop) return null;
              return (
                <>
                  <p className="font-semibold">
                    Stop {stops.findIndex((s) => s.id === focusId) + 1} · Col {stop.columnNo} Bay{" "}
                    {stop.bayNo}
                  </p>
                  <p className="text-muted-foreground">
                    {stop.issue}
                    {stop.rating != null ? ` · ${stop.rating}/5` : ""}
                    {stop.id === latestStopId ? " · Worker here" : ""}
                  </p>
                </>
              );
            })()}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-blue-500" /> Stop
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-amber-500" /> Medium issue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red-600" /> High issue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-emerald-600" /> Latest stop
        </span>
      </div>
    </div>
  );
}
