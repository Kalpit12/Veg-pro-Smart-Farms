"use server";

import {
  deactivateChemical,
  importChemicalsCsv,
  listAdminChemicals,
  upsertChemical,
  type ChemicalRow,
} from "@/services/chemicals-admin-service";
import type { ImportChemicalsResult } from "@/lib/chemicals-csv";

export type { ChemicalRow, ImportChemicalsResult };

export async function listAdminChemicalsAction() {
  return listAdminChemicals();
}

export async function upsertChemicalAction(input: {
  name: string;
  active_ingredient?: string;
}) {
  const name = input.name.trim();
  if (name.length < 2) return { data: null, error: { message: "Enter a product name." } };
  return upsertChemical({ name, active_ingredient: input.active_ingredient });
}

export async function importChemicalsCsvAction(csvText: string) {
  return importChemicalsCsv(csvText);
}

export async function deactivateChemicalAction(id: string) {
  return deactivateChemical(id);
}
