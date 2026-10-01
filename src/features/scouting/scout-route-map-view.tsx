"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { ScoutRouteStop } from "@/lib/scout-route";
import { greenhouseMapGridLines } from "@/lib/greenhouse-grid-georef";
import {
  filterTrackNearGreenhouse,
  greenhouseGeorefForStops,
  greenhouseMapCenter,
  isValidMapCoord,
  resolveStopMapPositions,
  smoothTrackForDisplay,
  trackMatchesGreenhouse,
} from "@/lib/scout-route-alignment";

export type TrackPoint = {
  lat: number;
  lng: number;
  recordedAt?: string;
};

const ROUTE_LINE_COLOR = "#2563eb";

const iconCache = new Map<string, L.DivIcon>();

function stopIcon(index: number, rating: number | null) {
  const key = `stop-${index}-${rating ?? "n"}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const bg =
    rating != null && rating >= 4
      ? "#dc2626"
      : rating != null && rating >= 3
        ? "#f59e0b"
        : "#3b82f6";
  const icon = L.divIcon({
    className: "scout-route-stop-icon",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background:${bg};color:white;font-size:11px;font-weight:700;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.25)">${index}</span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
  iconCache.set(key, icon);
  return icon;
}

const startIcon =
  iconCache.get("start") ??
  (() => {
    const icon = L.divIcon({
      className: "scout-route-start-icon",
      html: `<div style="display:flex;flex-direction:column;align-items:center;gap:1px">
    <span style="display:block;width:18px;height:18px;border-radius:9999px;background:#22c55e;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35)"></span>
    <span style="font-size:9px;font-weight:800;color:#15803d;letter-spacing:.04em;text-shadow:0 0 2px #fff">START</span>
  </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 14],
    });
    iconCache.set("start", icon);
    return icon;
  })();

const finishIcon =
  iconCache.get("finish") ??
  (() => {
    const icon = L.divIcon({
      className: "scout-route-finish-icon",
      html: `<div style="display:flex;flex-direction:column;align-items:center;gap:1px">
    <span style="display:block;width:20px;height:20px;border-radius:9999px;overflow:hidden;border:2px solid #111;box-shadow:0 1px 6px rgba(0,0,0,.35);background:linear-gradient(45deg,#111 25%,#fff 25%,#fff 50%,#111 50%,#111 75%,#fff 75%) 0 0/8px 8px"></span>
    <span style="font-size:9px;font-weight:800;color:#111;letter-spacing:.04em;text-shadow:0 0 2px #fff">STOP</span>
  </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 14],
    });
    iconCache.set("finish", icon);
    return icon;
  })();

const replayIcon =
  iconCache.get("replay") ??
  (() => {
    const icon = L.divIcon({
      className: "scout-route-replay-icon",
      html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:#0ea5e9;border:2px solid #fff;box-shadow:0 0 0 4px rgba(14,165,233,.3)"></span>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    iconCache.set("replay", icon);
    return icon;
  })();

type Props = {
  center: { lat: number; lng: number };
  greenhouseName: string;
  mapAnchor?: { lat: number; lng: number } | null;
  stops: ScoutRouteStop[];
  trackPoints?: TrackPoint[];
  replayIndex?: number | null;
  heatPoints?: TrackPoint[];
};

function boundsWithMinSpan(points: [number, number][], minRadiusM = 35): L.LatLngBounds {
  const valid = points.filter(([lat, lng]) => isValidMapCoord(lat, lng));
  if (!valid.length) return L.latLngBounds([[0, 0], [0, 0]]);
  const bounds = L.latLngBounds(valid);
  if (!bounds.isValid()) return bounds;
  const center = bounds.getCenter();
  const ne = bounds.getNorthEast();
  const spanM = center.distanceTo(ne);
  if (spanM >= minRadiusM) return bounds;
  const latRad = (center.lat * Math.PI) / 180;
  const dLat = minRadiusM / 111_320;
  const dLng = minRadiusM / (111_320 * Math.cos(latRad));
  return L.latLngBounds(
    [center.lat - dLat, center.lng - dLng],
    [center.lat + dLat, center.lng + dLng],
  );
}

function RouteMapLayers({
  center,
  greenhouseName,
  mapAnchor = null,
  stops,
  trackPoints = [],
  replayIndex = null,
  heatPoints = [],
}: {
  center: { lat: number; lng: number };
  greenhouseName: string;
  mapAnchor?: { lat: number; lng: number } | null;
  stops: ScoutRouteStop[];
  trackPoints?: TrackPoint[];
  replayIndex?: number | null;
  heatPoints?: TrackPoint[];
}) {
  const map = useMap();
  const lastAutoFitKey = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const sortedStops = useMemo(
    () =>
      [...stops].sort(
        (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
      ),
    [stops],
  );

  const gpsTrack = useMemo(
    () =>
      trackMatchesGreenhouse(trackPoints, greenhouseName, 200, mapAnchor)
        ? filterTrackNearGreenhouse(trackPoints, greenhouseName, 250, mapAnchor)
        : [],
    [trackPoints, greenhouseName, mapAnchor],
  );

  const displayLine = useMemo(() => smoothTrackForDisplay(gpsTrack), [gpsTrack]);

  const georef = useMemo(
    () => greenhouseGeorefForStops(sortedStops, trackPoints, greenhouseName, mapAnchor),
    [sortedStops, trackPoints, greenhouseName, mapAnchor],
  );

  const houseGrid = useMemo(
    () => greenhouseMapGridLines(greenhouseName, georef, mapAnchor),
    [greenhouseName, georef, mapAnchor],
  );

  const stopPositions = useMemo(
    () =>
      resolveStopMapPositions(sortedStops, gpsTrack, greenhouseName, georef, mapAnchor),
    [sortedStops, gpsTrack, greenhouseName, georef, mapAnchor],
  );

  const pinPositions = useMemo(() => {
    const pts: [number, number][] = [];
    for (const s of sortedStops) {
      const pos = stopPositions.get(s.id);
      if (pos && isValidMapCoord(pos.lat, pos.lng)) pts.push([pos.lat, pos.lng]);
    }
    return pts;
  }, [sortedStops, stopPositions]);

  const trackPositions = useMemo(
    () =>
      displayLine
        .filter((p) => isValidMapCoord(p.lat, p.lng))
        .map((p) => [p.lat, p.lng] as [number, number]),
    [displayLine],
  );

  const outlinePositions = useMemo(
    () =>
      houseGrid.outline
        .filter((p) => isValidMapCoord(p.lat, p.lng))
        .map((p) => [p.lat, p.lng] as [number, number]),
    [houseGrid.outline],
  );

  const autoFitKey = useMemo(
    () =>
      `${greenhouseName}|${georef?.sampleCount ?? 0}|${trackPositions.length}|${sortedStops.length}`,
    [greenhouseName, georef?.sampleCount, trackPositions.length, sortedStops.length],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      lastAutoFitKey.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mountedRef.current) return;
    if (lastAutoFitKey.current === autoFitKey) return;

    const all = [...outlinePositions, ...pinPositions, ...trackPositions].filter(
      ([lat, lng]) => isValidMapCoord(lat, lng),
    );
    const gh = greenhouseMapCenter(greenhouseName, mapAnchor);

    try {
      if (all.length >= 2) {
        map.fitBounds(boundsWithMinSpan(all), { padding: [40, 40], maxZoom: 20, animate: false });
      } else if (all.length === 1) {
        map.setView(all[0], 19, { animate: false });
      } else if (gh) {
        map.setView([gh.lat, gh.lng], 18, { animate: false });
      } else {
        map.setView([center.lat, center.lng], 18, { animate: false });
      }
      lastAutoFitKey.current = autoFitKey;
    } catch {
      /* map torn down */
    }
  }, [
    autoFitKey,
    center.lat,
    center.lng,
    greenhouseName,
    map,
    mapAnchor,
    outlinePositions,
    pinPositions,
    trackPositions,
  ]);

  useEffect(() => {
    if (replayIndex == null || !gpsTrack[replayIndex]) return;
    const p = gpsTrack[replayIndex];
    if (!isValidMapCoord(p.lat, p.lng)) return;
    try {
      map.panTo([p.lat, p.lng], { animate: false });
    } catch {
      /* ignore */
    }
  }, [replayIndex, gpsTrack, map]);

  const start = trackPositions.length ? trackPositions[0] : null;
  const end = trackPositions.length > 1 ? trackPositions[trackPositions.length - 1] : null;

  const startEndSeparationM =
    start && end
      ? L.latLng(start[0], start[1]).distanceTo(L.latLng(end[0], end[1]))
      : 0;

  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxNativeZoom={19}
        maxZoom={22}
      />

      {outlinePositions.length >= 3 ? (
        <Polygon
          positions={outlinePositions}
          pathOptions={{
            color: "#16a34a",
            weight: 2,
            fillColor: "#22c55e",
            fillOpacity: 0.12,
          }}
        />
      ) : null}

      {houseGrid.columnLines.map((line, i) => (
        <Polyline
          key={`col-${i}`}
          positions={line.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: "#16a34a", weight: 1, opacity: 0.35, dashArray: "4 6" }}
        />
      ))}
      {houseGrid.bayLines.map((line, i) => (
        <Polyline
          key={`bay-${i}`}
          positions={line.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: "#16a34a", weight: 1, opacity: 0.35, dashArray: "4 6" }}
        />
      ))}

      {heatPoints
        .filter((p) => isValidMapCoord(p.lat, p.lng))
        .map((p, i) => (
          <CircleMarker
            key={`heat-${i}`}
            center={[p.lat, p.lng]}
            radius={6}
            pathOptions={{
              color: "#ef4444",
              fillColor: "#f97316",
              fillOpacity: 0.18,
              weight: 0,
            }}
          />
        ))}

      {trackPositions.length > 1 ? (
        <Polyline
          positions={trackPositions}
          pathOptions={{
            color: ROUTE_LINE_COLOR,
            weight: 6,
            opacity: 0.95,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
      ) : null}

      {start && isValidMapCoord(start[0], start[1]) ? (
        <Marker position={start} icon={startIcon}>
          <Popup>Walk start{gpsTrack.length ? " (GPS)" : " (visit order)"}.</Popup>
        </Marker>
      ) : null}
      {end &&
      isValidMapCoord(end[0], end[1]) &&
      startEndSeparationM >= 6 &&
      (start?.[0] !== end[0] || start?.[1] !== end[1]) ? (
        <Marker position={end} icon={finishIcon}>
          <Popup>Walk end{gpsTrack.length ? " (GPS)" : ""}.</Popup>
        </Marker>
      ) : null}

      {replayIndex != null &&
      gpsTrack[replayIndex] &&
      isValidMapCoord(gpsTrack[replayIndex].lat, gpsTrack[replayIndex].lng) ? (
        <Marker position={[gpsTrack[replayIndex].lat, gpsTrack[replayIndex].lng]} icon={replayIcon} />
      ) : null}

      {sortedStops.flatMap((s, i) => {
        const pos = stopPositions.get(s.id);
        if (!pos || !isValidMapCoord(pos.lat, pos.lng)) return [];

        const showDrift =
          !georef &&
          pos.source === "cell" &&
          pos.rawLat != null &&
          pos.rawLng != null &&
          pos.offsetM >= 12 &&
          isValidMapCoord(pos.rawLat, pos.rawLng);

        const layers = [];
        if (showDrift && pos.rawLat != null && pos.rawLng != null) {
          layers.push(
            <Polyline
              key={`drift-${s.id}`}
              positions={[[pos.rawLat, pos.rawLng], [pos.lat, pos.lng]]}
              pathOptions={{
                color: "#94a3b8",
                weight: 2,
                opacity: 0.7,
                dashArray: "3 5",
              }}
            />,
          );
        }
        layers.push(
          <Marker key={`stop-${s.id}`} position={[pos.lat, pos.lng]} icon={stopIcon(i + 1, s.rating)}>
            <Popup>
              <strong>
                Stop {i + 1}: {s.issue} {s.rating ? `(${s.rating}/5)` : ""}
              </strong>
              <br />
              {s.label}
              <br />
              {s.scoutName}
              <br />
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  {georef?.kind === "gps-fit"
                    ? "GPS-adjusted bay×column (Scarab-style)"
                    : georef?.kind === "track-footprint"
                      ? "Grid aligned to walk track"
                      : pos.source === "cell"
                        ? "Bay×column grid"
                        : "GPS track"}
                  {showDrift ? ` · raw GPS ~${Math.round(pos.offsetM)} m away` : ""}
                </span>
            </Popup>
          </Marker>,
        );
        return layers;
      })}
    </>
  );
}

export function ScoutRouteMapView({
  center,
  greenhouseName,
  mapAnchor = null,
  stops,
  trackPoints = [],
  replayIndex = null,
  heatPoints = [],
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const mapKey = `${greenhouseName}-${stops.length}-${trackPoints.length}`;

  if (!mounted) {
    return <div className="h-80 w-full rounded-2xl" aria-hidden />;
  }

  return (
    <MapContainer
      key={mapKey}
      center={[center.lat, center.lng]}
      zoom={18}
      minZoom={10}
      maxZoom={22}
      className="h-80 w-full rounded-2xl z-0"
      scrollWheelZoom
      preferCanvas
    >
      <RouteMapLayers
        center={center}
        greenhouseName={greenhouseName}
        mapAnchor={mapAnchor}
        stops={stops}
        trackPoints={trackPoints}
        replayIndex={replayIndex}
        heatPoints={heatPoints}
      />
    </MapContainer>
  );
}
