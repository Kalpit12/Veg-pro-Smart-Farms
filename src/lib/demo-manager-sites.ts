import { STAR_GREENHOUSE_ROWS } from "@/lib/star-greenhouse-rows";
import type { FarmGreenhouseCatalogItem } from "@/services/supervisor-access-service";

const STAR_FARM_ID = "beee0001-0001-4001-8001-000000000001";

/** Demo / offline catalog so manager filters work without a database. */
export function demoManagerAssignedSites(): FarmGreenhouseCatalogItem[] {
  return [
    {
      farmId: STAR_FARM_ID,
      farmName: "Star",
      greenhouses: STAR_GREENHOUSE_ROWS.map((row) => ({
        id: row.id,
        name: row.name,
        cropType: row.varieties[0] ?? null,
      })),
    },
  ];
}
