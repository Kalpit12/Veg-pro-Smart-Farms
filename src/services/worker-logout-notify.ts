"use client";

import { bemackLocationByGreenhouseId } from "@/lib/bemack-master-data";
import { captureGps } from "@/lib/gps";
import {
  formatWorkerLogoutMessage,
  type WorkerLogoutContext,
} from "@/lib/worker-logout-alert";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/services/supabase/auth-service";
import { createAlert } from "@/services/supabase/alert-service";
import { getWorkerPosition } from "@/services/supabase/position-service";
import { useFieldOpsStore } from "@/store/field-ops-store";
import { useScanStore } from "@/store/scan-store";

async function resolveWorkerName(): Promise<string> {
  if (!hasSupabaseEnv()) return "Demo Worker";

  const user = await getCurrentUser();
  if (!user) return "Unknown worker";

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  return profile?.full_name ?? profile?.email ?? user.email ?? user.id;
}

async function resolveCoordinates(
  greenhouseId: string | null,
): Promise<{ latitude: number | null; longitude: number | null }> {
  const anchor = greenhouseId ? bemackLocationByGreenhouseId(greenhouseId) : null;
  const anchorFallback = anchor
    ? { latitude: anchor.lat, longitude: anchor.lng }
    : undefined;

  try {
    const coords = await captureGps({
      allowDemoFallback: !hasSupabaseEnv(),
      anchorFallback,
    });
    return { latitude: coords.latitude, longitude: coords.longitude };
  } catch {
    if (anchor) {
      return { latitude: anchor.lat, longitude: anchor.lng };
    }
  }

  if (hasSupabaseEnv()) {
    const user = await getCurrentUser();
    if (user) {
      const { data: position } = await getWorkerPosition(user.id);
      if (position) {
        return {
          latitude: position.latitude,
          longitude: position.longitude,
        };
      }
    }
  }

  return { latitude: null, longitude: null };
}

export async function gatherWorkerLogoutContext(): Promise<WorkerLogoutContext> {
  const scan = useScanStore.getState();
  const workerName = await resolveWorkerName();
  const { latitude, longitude } = await resolveCoordinates(scan.greenhouseId);

  return {
    workerName,
    farmName: scan.farmName ?? null,
    greenhouseName: scan.greenhouseName ?? null,
    latitude,
    longitude,
    loggedOutAt: new Date(),
  };
}

export async function notifyAdminWorkerLogout(): Promise<WorkerLogoutContext> {
  const context = await gatherWorkerLogoutContext();
  const message = formatWorkerLogoutMessage(context);

  if (hasSupabaseEnv()) {
    const { error } = await createAlert("worker_logout", message);
    if (error) throw error;
  } else {
    useFieldOpsStore.getState().addDemoAlert("worker_logout", message);
  }

  return context;
}
