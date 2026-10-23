import { routeDataThroughMssql } from "@/lib/mssql/client-routing";
import { createClient } from "@/lib/supabase/client";
import { mssqlListChemicalsAction } from "@/services/mssql/chemical-actions";

export type ChemicalProduct = {
  id: string;
  name: string;
  active_ingredient: string | null;
};

export async function listChemicalProductsForSpray() {
  if (routeDataThroughMssql()) {
    const { data, error } = await mssqlListChemicalsAction();
    return {
      data: (data ?? []) as ChemicalProduct[],
      error: error ? { message: error.message } : null,
    };
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chemicals")
    .select("id, name, active_ingredient")
    .eq("is_active", true)
    .order("name");
  return { data: (data ?? []) as ChemicalProduct[], error };
}
