"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { ScoutRouteStop } from "@/lib/scout-route";

export type TrackPoint = {
  lat: number;
  lng: number;
  recordedAt?: string;
};

const stopIcon = (index: number, rating: number | null) => {
  const bg =
    rating != null && rating >= 4
      ? "#dc2626"
      : rating != null && rating >= 3
        ? "#f59e0b"
        : "#3b82f6";
  return L.divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background:${bg};color:white;font-size:11px;font-weight:700;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.25)">${index}</span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

const startIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:#22c55e;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4)"></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const finishIcon = L.divIcon({
  className: "",
  html: `<span style="display:flex;width:20px;height:20px;border-radius:9999px;overflow:hidden;border:2px solid #111;box-shadow:0 1px 6px rgba(0,0,0,.4);background:
    linear-gradient(45deg,#111 25%,#fff 25%,#fff 50%,#111 50%,#111 75%,#fff 75%) 0 0/8px 8px"></span>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const replayIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:#0ea5e9;border:2px solid #fff;box-shadow:0 0 0 4px rgba(14,165,233,.3)"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

type Props = {
  center: { lat: number; lng: number };
  stops: ScoutRouteStop[];
  trackPoints?: TrackPoint[];
  replayIndex?: number | null;
  heatPoints?: TrackPoint[];
};

function RouteMapLayers({
  center,
  stops,
  trackPoints = [],
  replayIndex = null,
  heatPoints = [],
}: {
  center: { lat: number; lng: number };
  stops: ScoutRouteStop[];
  trackPoints?: TrackPoint[];
  replayIndex?: number | null;
  heatPoints?: TrackPoint[];
}) {
  const map = useMap();
  const [ready, setReady] = useState(false);
  const skipNextCenterPan = useRef(true);

  const gpsStops = stops.filter((s) => s.lat != null && s.lng != null);
  const trackPositions = trackPoints.map((p) => [p.lat, p.lng] as [number, number]);

  useEffect(() => {
    let active = true;
    map.whenReady(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
      setReady(false);
      skipNextCenterPan.current = true;
    };
  }, [map]);

  useEffect(() => {
    if (!ready) return;
    const all = [
      ...trackPoints.map((p) => [p.lat, p.lng] as [number, number]),
      ...gpsStops.map((s) => [s.lat!, s.lng!] as [number, number]),
    ];
    if (all.length >= 2) {
      map.fitBounds(L.latLngBounds(all), { padding: [28, 28], maxZoom: 19 });
      return;
    }
    if (skipNextCenterPan.current) {
      skipNextCenterPan.current = false;
      return;
    }
    map.flyTo([center.lat, center.lng], Math.max(map.getZoom(), 17), { duration: 0.45 });
  }, [ready, center.lat, center.lng, map, trackPoints, gpsStops]);

  useEffect(() => {
    if (!ready || replayIndex == null || !trackPoints[replayIndex]) return;
    const p = trackPoints[replayIndex];
    map.panTo([p.lat, p.lng], { animate: true, duration: 0.2 });
  }, [ready, replayIndex, trackPoints, map]);

  if (!ready) return null;

  const start = trackPoints[0] ?? (gpsStops[0] ? { lat: gpsStops[0].lat!, lng: gpsStops[0].lng! } : null);
  const end =
    trackPoints.length > 1
      ? trackPoints[trackPoints.length - 1]
      : gpsStops.length > 1
        ? { lat: gpsStops[gpsStops.length - 1].lat!, lng: gpsStops[gpsStops.length - 1].lng! }
        : null;

  const stopPolyline =
    trackPositions.length < 2
      ? gpsStops.map((s) => [s.lat!, s.lng!] as [number, number])
      : [];

  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {heatPoints.map((p, i) => (
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
          pathOptions={{ color: "#f97316", weight: 5, opacity: 0.92 }}
        />
      ) : stopPolyline.length > 1 ? (
        <Polyline
          positions={stopPolyline}
          pathOptions={{ color: "#f97316", weight: 4, opacity: 0.85 }}
        />
      ) : null}

      {start ? <Marker position={[start.lat, start.lng]} icon={startIcon} /> : null}
      {end && (!start || end.lat !== start.lat || end.lng !== start.lng) ? (
        <Marker position={[end.lat, end.lng]} icon={finishIcon} />
      ) : null}

      {replayIndex != null && trackPoints[replayIndex] ? (
        <Marker
          position={[trackPoints[replayIndex].lat, trackPoints[replayIndex].lng]}
          icon={replayIcon}
        />
      ) : null}

      {gpsStops.map((s, i) => (
        <Marker
          key={s.id}
          position={[s.lat!, s.lng!]}
          icon={stopIcon(i + 1, s.rating)}
        >
          <Popup>
            <strong>
              {s.issue} {s.rating ? `(${s.rating}/5)` : ""}
            </strong>
            <br />
            {s.label}
            <br />
            {s.scoutName}
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export function ScoutRouteMapView({
  center,
  stops,
  trackPoints = [],
  replayIndex = null,
  heatPoints = [],
}: Props) {
  const [mounted, setMounted] = useState(false);
  const mapKey = useMemo(
    () => `scout-route-${trackPoints.length}-${stops.length}`,
    [trackPoints.length, stops.length],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-80 w-full rounded-2xl" aria-hidden />;
  }

  return (
    <MapContainer
      key={mapKey}
      center={[center.lat, center.lng]}
      zoom={17}
      className="h-80 w-full rounded-2xl z-0"
      scrollWheelZoom
    >
      <RouteMapLayers
        center={center}
        stops={stops}
        trackPoints={trackPoints}
        replayIndex={replayIndex}
        heatPoints={heatPoints}
      />
    </MapContainer>
  );
}
