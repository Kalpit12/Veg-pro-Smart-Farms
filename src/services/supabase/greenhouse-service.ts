import { routeDataThroughMssql } from "@/lib/mssql/client-routing";
import { createClient } from "@/lib/supabase/client";
import type { GreenhouseAnchor } from "@/lib/greenhouse-locations";
import { mssqlListGreenhouseAnchorsAction } from "@/services/mssql/scouting-actions";

type GreenhouseAnchorRow = {
  id: string;
  name: string;
  farm_id: string;
  latitude: number | null;
  longitude: number | null;
  farms?: { name?: string } | null;
};

export async function listGreenhouseAnchors(): Promise<{
  data: GreenhouseAnchor[];
  error: Error | null;
}> {
  if (routeDataThroughMssql()) {
    return mssqlListGreenhouseAnchorsAction();
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("greenhouses")
    .select("id, name, farm_id, latitude, longitude, farms(name)")
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  const anchors: GreenhouseAnchor[] = ((data ?? []) as GreenhouseAnchorRow[])
    .filter((row) => row.latitude != null && row.longitude != null)
    .map((row) => ({
      farmId: row.farm_id,
      farmName: row.farms?.name ?? "Farm",
      greenhouseId: row.id,
      greenhouseName: row.name,
      lat: row.latitude as number,
      lng: row.longitude as number,
      fromDb: true,
    }));

  return { data: anchors, error: null };
}
