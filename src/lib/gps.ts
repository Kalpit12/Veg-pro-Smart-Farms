export type GpsCoords = { latitude: number; longitude: number };

export type GpsPositionSample = GpsCoords & {
  accuracyM: number | null;
  recordedAt: string;
};

export type GeolocationFailureCode =
  | "PERMISSION_DENIED"
  | "POSITION_UNAVAILABLE"
  | "TIMEOUT"
  | "UNSUPPORTED";

export class GeolocationCaptureError extends Error {
  code: GeolocationFailureCode;

  constructor(code: GeolocationFailureCode, message: string) {
    super(message);
    this.name = "GeolocationCaptureError";
    this.code = code;
  }
}

export function parseGpsString(gps: string | null | undefined): GpsCoords | null {
  if (!gps) return null;
  const [lat, lng] = gps.split(",").map((v) => Number(v.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng };
}

export function formatGps(coords: GpsCoords): string {
  return `${coords.latitude},${coords.longitude}`;
}

/** Demo fallback at Star STGH01A anchor (Kenya floriculture coords) */
export const DEMO_GPS: GpsCoords = { latitude: -1.2921, longitude: 36.8219 };

function toFailureCode(error: GeolocationPositionError): GeolocationFailureCode {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "PERMISSION_DENIED";
    case error.POSITION_UNAVAILABLE:
      return "POSITION_UNAVAILABLE";
    case error.TIMEOUT:
      return "TIMEOUT";
    default:
      return "POSITION_UNAVAILABLE";
  }
}

export function geolocationErrorMessage(code: GeolocationFailureCode): string {
  switch (code) {
    case "PERMISSION_DENIED":
      return "Location is blocked — allow location for this site in the phone or browser settings.";
    case "POSITION_UNAVAILABLE":
      return "Location unavailable — step outdoors with a clear sky, or pick a greenhouse below.";
    case "TIMEOUT":
      return "Location timed out — wait for GPS outdoors, or pick a greenhouse below.";
    case "UNSUPPORTED":
      return "GPS is not available on this device.";
    default:
      return "Could not get location.";
  }
}

let lastKnown: { coords: GpsCoords; at: number } | null = null;

/** Keep a short-lived fix so scouting/infestation saves do not wait on a new high-accuracy lock. */
export function rememberGpsSample(coords: GpsCoords) {
  lastKnown = { coords, at: Date.now() };
}

export function lastKnownGps(maxAgeMs = 180_000): GpsCoords | null {
  if (!lastKnown) return null;
  if (Date.now() - lastKnown.at > maxAgeMs) return null;
  return lastKnown.coords;
}

function getCurrentPosition(options: PositionOptions): Promise<GpsCoords> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        rememberGpsSample(coords);
        resolve(coords);
      },
      (error) => reject(error),
      options,
    );
  });
}

/** Browser permission state when Permissions API is available. */
export async function queryGeolocationPermission(): Promise<PermissionState | "unknown"> {
  if (!navigator.permissions?.query) return "unknown";
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "unknown";
  }
}

/**
 * Continuous GPS watch for scouting routes.
 * Prefer watchPosition; only poll if watch goes quiet (avoids double-firing jitter).
 */
export function watchScoutingPosition(
  onSample: (sample: GpsPositionSample) => void,
  options?: {
    pollMs?: number;
    enableHighAccuracy?: boolean;
    onError?: (error: GeolocationCaptureError) => void;
  },
): () => void {
  const pollMs = options?.pollMs ?? 8000;
  const enableHighAccuracy = options?.enableHighAccuracy ?? true;

  if (!("geolocation" in navigator)) {
    options?.onError?.(
      new GeolocationCaptureError("UNSUPPORTED", geolocationErrorMessage("UNSUPPORTED")),
    );
    return () => undefined;
  }

  let watchId: number | null = null;
  let pollTimer: number | null = null;
  let stopped = false;
  let lastEmitAt = 0;
  let lastCoords: GpsCoords | null = null;
  let watchAlive = false;

  const emit = (position: GeolocationPosition) => {
    if (stopped) return;
    const now = Date.now();
    const sample: GpsPositionSample = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracyM:
        typeof position.coords.accuracy === "number" && Number.isFinite(position.coords.accuracy)
          ? position.coords.accuracy
          : null,
      recordedAt: new Date(position.timestamp || Date.now()).toISOString(),
    };

    // Hold steady against micro-jitter before higher-level filters run
    if (lastCoords) {
      const dLat = (sample.latitude - lastCoords.latitude) * 111_320;
      const dLng =
        (sample.longitude - lastCoords.longitude) *
        111_320 *
        Math.cos((sample.latitude * Math.PI) / 180);
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      const holdM = Math.max(8, (sample.accuracyM ?? 25) * 0.35);
      if (dist < holdM && now - lastEmitAt < 12_000) {
        return;
      }
    }

    // Cap emit rate — watchPosition can fire many times/sec indoors
    if (now - lastEmitAt < 4000 && lastCoords) {
      return;
    }

    lastEmitAt = now;
    lastCoords = { latitude: sample.latitude, longitude: sample.longitude };
    rememberGpsSample(lastCoords);
    onSample(sample);
  };

  const onWatchError = (error: GeolocationPositionError) => {
    options?.onError?.(
      new GeolocationCaptureError(toFailureCode(error), geolocationErrorMessage(toFailureCode(error))),
    );
  };

  try {
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        watchAlive = true;
        emit(pos);
      },
      onWatchError,
      {
        enableHighAccuracy,
        maximumAge: 5000,
        timeout: 20_000,
      },
    );
  } catch {
    watchId = null;
  }

  pollTimer = window.setInterval(() => {
    if (stopped) return;
    // Skip poll while watch is delivering fresh samples
    if (watchAlive && Date.now() - lastEmitAt < pollMs * 1.5) return;
    navigator.geolocation.getCurrentPosition(emit, onWatchError, {
      enableHighAccuracy,
      maximumAge: pollMs,
      timeout: 15_000,
    });
  }, pollMs);

  return () => {
    stopped = true;
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
    if (pollTimer != null) window.clearInterval(pollTimer);
  };
}

export async function captureGps(options?: {
  allowDemoFallback?: boolean;
  /** Used when GPS is denied/unavailable but greenhouse is already assigned */
  anchorFallback?: GpsCoords;
}): Promise<GpsCoords> {
  if (!("geolocation" in navigator)) {
    if (options?.anchorFallback) return options.anchorFallback;
    if (options?.allowDemoFallback) return DEMO_GPS;
    throw new GeolocationCaptureError(
      "UNSUPPORTED",
      geolocationErrorMessage("UNSUPPORTED"),
    );
  }

  const fresh = lastKnownGps(30_000);
  if (fresh) return fresh;

  const cached = lastKnownGps();
  const attempts: PositionOptions[] = [
    { enableHighAccuracy: false, timeout: 4_000, maximumAge: 90_000 },
    { enableHighAccuracy: true, timeout: 8_000, maximumAge: 15_000 },
  ];

  let lastError: GeolocationPositionError | null = null;

  for (const attempt of attempts) {
    try {
      return await getCurrentPosition(attempt);
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        lastError = err;
        if (err.code === err.PERMISSION_DENIED) break;
      } else {
        throw err;
      }
    }
  }

  if (cached) return cached;
  if (options?.anchorFallback) return options.anchorFallback;
  if (options?.allowDemoFallback) return DEMO_GPS;

  const code = lastError ? toFailureCode(lastError) : "POSITION_UNAVAILABLE";
  throw new GeolocationCaptureError(code, geolocationErrorMessage(code));
}
