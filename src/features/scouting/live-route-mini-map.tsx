"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type LivePathPoint = { lat: number; lng: number; recordedAt?: string };

const startIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:#22c55e;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const liveIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:12px;height:12px;border-radius:9999px;background:#f97316;border:2px solid #fff;box-shadow:0 0 0 4px rgba(249,115,22,.25)"></span>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

function FitPath({ path }: { path: LivePathPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (path.length < 1) return;
    if (path.length === 1) {
      map.setView([path[0].lat, path[0].lng], 18);
      return;
    }
    const bounds = L.latLngBounds(path.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 19 });
  }, [map, path]);
  return null;
}

type Props = {
  path: LivePathPoint[];
  className?: string;
};

export function LiveRouteMiniMap({ path, className }: Props) {
  const center = useMemo(() => {
    if (!path.length) return { lat: -1.2921, lng: 36.8219 };
    const last = path[path.length - 1];
    return { lat: last.lat, lng: last.lng };
  }, [path]);

  const positions = path.map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <div className={className ?? "h-40 w-full"}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={18}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitPath path={path} />
        {positions.length > 1 ? (
          <Polyline
            positions={positions}
            pathOptions={{ color: "#f97316", weight: 4, opacity: 0.9 }}
          />
        ) : null}
        {path[0] ? (
          <Marker position={[path[0].lat, path[0].lng]} icon={startIcon} />
        ) : null}
        {path.length > 1 ? (
          <Marker
            position={[path[path.length - 1].lat, path[path.length - 1].lng]}
            icon={liveIcon}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
