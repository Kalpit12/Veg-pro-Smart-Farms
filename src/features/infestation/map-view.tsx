"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { hotspotIcon, sprayIcon, workerIcon } from "@/features/infestation/farm-map-markers";
import { MapViewControls } from "@/features/infestation/map-view-controls";
import { trailStopMarkers, type TrailPoint } from "@/lib/hotspot-trail";
import type { HotspotRow } from "@/services/supabase/infestation-service";

const trailStopIcon = (index: number, kind: TrailPoint["kind"]) =>
  L.divIcon({
    className: "farm-map-marker",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:9999px;background:${kind === "scout" ? "#3b82f6" : "#16a34a"};color:white;font-size:10px;font-weight:700;border:2px solid white;box-shadow:0 1px 4px rgb(0 0 0 / 25%)">${index}</span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

type SprayMarker = {
  id: string;
  latitude: number;
  longitude: number;
  product_name: string;
  created_at: string;
  notes?: string | null;
  farms?: { name?: string } | null;
  greenhouses?: { name?: string } | null;
  users?: { full_name?: string } | null;
};

type WorkerMarker = {
  worker_id: string;
  latitude: number;
  longitude: number;
  updated_at?: string;
  users?: { full_name?: string; role?: string } | null;
};

type MapFocus = {
  lat: number;
  lng: number;
  key: string;
};

function MapFocusController({ focus }: { focus: MapFocus | null }) {
  const map = useMap();

  useEffect(() => {
    if (!focus) return;
    map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 17), { duration: 0.55 });
  }, [focus, map]);

  return null;
}

/** Fit viewport so hotspots, sprays, and workers are all visible (fixes off-screen GPS markers). */
function MapBoundsController({
  hotspots,
  sprays,
  positions,
}: {
  hotspots: HotspotRow[];
  sprays: SprayMarker[];
  positions: WorkerMarker[];
}) {
  const map = useMap();
  const [fittedKey, setFittedKey] = useState("");

  useEffect(() => {
    const points: [number, number][] = [
      ...hotspots
        .filter((h) => h.status === "active" || h.status === "sprayed")
        .map((h) => [h.latitude, h.longitude] as [number, number]),
      ...sprays.map((s) => [s.latitude, s.longitude] as [number, number]),
      ...positions.map((p) => [p.latitude, p.longitude] as [number, number]),
    ].filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

    if (!points.length) return;

    const key = points.map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join("|");
    if (key === fittedKey) return;

    if (points.length === 1) {
      map.setView(points[0], 16, { animate: true });
    } else {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16, animate: true });
    }
    setFittedKey(key);
  }, [map, hotspots, sprays, positions, fittedKey]);

  return null;
}

function MapLayers({
  focus,
  trail,
  hotspots,
  sprays,
  positions,
  onSelectHotspot,
  onSelectSpray,
  onSelectWorker,
}: {
  focus: MapFocus | null;
  trail: TrailPoint[] | null;
  hotspots: HotspotRow[];
  sprays: SprayMarker[];
  positions: WorkerMarker[];
  onSelectHotspot: (row: HotspotRow) => void;
  onSelectSpray?: (row: SprayMarker) => void;
  onSelectWorker?: (row: WorkerMarker) => void;
}) {
  const map = useMap();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    map.whenReady(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
      setReady(false);
    };
  }, [map]);

  if (!ready) return null;

  const trailLine = trail?.map((point) => [point.lat, point.lng] as [number, number]) ?? [];
  const trailMarkers = trail ? trailStopMarkers(trail) : [];

  return (
    <>
      <MapFocusController focus={focus} />
      <MapBoundsController hotspots={hotspots} sprays={sprays} positions={positions} />

      {trailLine.length > 1 ? (
        <Polyline
          positions={trailLine}
          pathOptions={{ color: "#f97316", weight: 4, opacity: 0.9, dashArray: "8 6" }}
        />
      ) : null}

      {trailMarkers.map((point, index) => (
        <Marker
          key={point.id}
          position={[point.lat, point.lng]}
          icon={trailStopIcon(index + 1, point.kind)}
          zIndexOffset={2500}
        >
          <Popup className="farm-map-popup">
            <strong>{point.label}</strong>
          </Popup>
        </Marker>
      ))}

      {hotspots
        .filter((h) => h.status === "active" || h.status === "sprayed")
        .map((h) => (
          <Marker
            key={h.id}
            position={[h.latitude, h.longitude]}
            icon={hotspotIcon(h.severity)}
            zIndexOffset={2000}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e);
                onSelectHotspot(h);
              },
            }}
          >
            <Popup className="farm-map-popup">
              <strong>{h.pest_type}</strong>
              <br />
              {h.greenhouses?.name}
              <br />
              Severity {h.severity}/5
            </Popup>
          </Marker>
        ))}

      {sprays.map((s) => (
        <Marker
          key={s.id}
          position={[s.latitude, s.longitude]}
          icon={sprayIcon}
          zIndexOffset={1500}
          eventHandlers={{
            click: (e) => {
              L.DomEvent.stopPropagation(e);
              onSelectSpray?.(s);
            },
          }}
        >
          <Popup className="farm-map-popup">
            <strong>Spray</strong>
            <br />
            {s.product_name}
            <br />
            {s.greenhouses?.name ?? s.farms?.name ?? "Field location"}
            <br />
            {s.users?.full_name ?? "Worker"}
          </Popup>
        </Marker>
      ))}

      {positions.map((p) => (
        <Marker
          key={p.worker_id}
          position={[p.latitude, p.longitude]}
          icon={workerIcon}
          zIndexOffset={3000}
          eventHandlers={{
            click: (e) => {
              L.DomEvent.stopPropagation(e);
              onSelectWorker?.(p);
            },
          }}
        >
          <Popup className="farm-map-popup">
            <strong>{p.users?.full_name ?? "Worker"}</strong>
            <br />
            Live GPS
            <br />
            {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
            {p.updated_at ? (
              <>
                <br />
                Updated{" "}
                {formatDistanceToNow(new Date(p.updated_at), { addSuffix: true })}
              </>
            ) : null}
          </Popup>
        </Marker>
      ))}
    </>
  );
}

type MapViewProps = {
  center: { lat: number; lng: number };
  focus?: MapFocus | null;
  trail?: TrailPoint[] | null;
  hotspots: HotspotRow[];
  sprays: SprayMarker[];
  positions: WorkerMarker[];
  onSelectHotspot: (row: HotspotRow) => void;
  onSelectSpray?: (row: SprayMarker) => void;
  onSelectWorker?: (row: WorkerMarker) => void;
  className?: string;
};

export function MapView({
  center,
  focus = null,
  trail = null,
  hotspots,
  sprays,
  positions,
  onSelectHotspot,
  onSelectSpray,
  onSelectWorker,
  className = "farm-map-view",
}: MapViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={className} aria-hidden />;
  }

  return (
    <MapContainer
      key="vegpro-farm-map"
      center={[center.lat, center.lng]}
      zoom={16}
      minZoom={12}
      maxZoom={19}
      zoomControl={false}
      attributionControl={false}
      className={className}
      scrollWheelZoom
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
      <MapLayers
        focus={focus}
        trail={trail}
        hotspots={hotspots}
        sprays={sprays}
        positions={positions}
        onSelectHotspot={onSelectHotspot}
        onSelectSpray={onSelectSpray}
        onSelectWorker={onSelectWorker}
      />
      <MapViewControls center={center} />
    </MapContainer>
  );
}

export type { SprayMarker, WorkerMarker, MapFocus };
