"use client";

import { Crosshair, Minus, Plus } from "lucide-react";
import { useMap } from "react-leaflet";

type MapViewControlsProps = {
  center: { lat: number; lng: number };
};

export function MapViewControls({ center }: MapViewControlsProps) {
  const map = useMap();

  return (
    <>
      <button
        type="button"
        className="farm-map-control-btn farm-map-control-btn--locate"
        aria-label="Center map on farm activity"
        onClick={() => map.setView([center.lat, center.lng], map.getZoom(), { animate: true })}
      >
        <Crosshair className="size-5" />
      </button>

      <div className="farm-map-zoom-stack">
        <button
          type="button"
          className="farm-map-control-btn farm-map-zoom-btn"
          aria-label="Zoom in"
          onClick={() => map.zoomIn()}
        >
          <Plus className="size-5" />
        </button>
        <button
          type="button"
          className="farm-map-control-btn farm-map-zoom-btn"
          aria-label="Zoom out"
          onClick={() => map.zoomOut()}
        >
          <Minus className="size-5" />
        </button>
      </div>
    </>
  );
}
