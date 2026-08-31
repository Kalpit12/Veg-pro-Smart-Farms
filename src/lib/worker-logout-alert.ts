export type WorkerLogoutContext = {
  workerName: string;
  farmName?: string | null;
  greenhouseName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  loggedOutAt?: Date;
};

export function formatWorkerLogoutMessage(ctx: WorkerLogoutContext): string {
  const when = (ctx.loggedOutAt ?? new Date()).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const placeParts = [ctx.farmName, ctx.greenhouseName].filter(Boolean);
  const place = placeParts.length ? placeParts.join(" · ") : "Unknown location";

  const coords =
    ctx.latitude != null && ctx.longitude != null
      ? ` (GPS: ${ctx.latitude.toFixed(4)}, ${ctx.longitude.toFixed(4)})`
      : "";

  return `${ctx.workerName} logged out at ${when} from ${place}${coords}.`;
}
