import L from "leaflet";

const pinSvg = (fill: string, label?: string) => `
  <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M16 0C8.82 0 3 5.58 3 12.45c0 9.2 13 27.55 13 27.55S29 21.65 29 12.45C29 5.58 23.18 0 16 0z" fill="${fill}" stroke="#fff" stroke-width="2"/>
    ${label ? `<text x="16" y="17" text-anchor="middle" fill="#fff" font-size="10" font-weight="700" font-family="system-ui,sans-serif">${label}</text>` : ""}
  </svg>
`;

export const hotspotIcon = (severity: number) =>
  L.divIcon({
    className: "farm-map-marker",
    html: pinSvg(severity >= 4 ? "#dc2626" : "#ef4444", String(severity)),
    iconSize: [32, 40],
    iconAnchor: [16, 38],
    popupAnchor: [0, -34],
  });

export const sprayIcon = L.divIcon({
  className: "farm-map-marker",
  html: pinSvg("#16a34a"),
  iconSize: [28, 36],
  iconAnchor: [14, 34],
  popupAnchor: [0, -30],
});

export const workerIcon = L.divIcon({
  className: "farm-map-marker farm-map-worker-marker",
  html: pinSvg("#2563eb", "W"),
  iconSize: [32, 40],
  iconAnchor: [16, 38],
  popupAnchor: [0, -34],
});
