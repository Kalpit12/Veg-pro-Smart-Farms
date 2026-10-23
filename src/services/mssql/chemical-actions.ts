"use server";

import * as q from "@/services/mssql/chemical-queries";

export async function mssqlListChemicalsAction(includeInactive?: boolean) {
  return q.mssqlListChemicals({ includeInactive });
}

export async function mssqlListAdminChemicalsAction() {
  return q.mssqlListAdminChemicals();
}

export async function mssqlUpsertChemicalAction(input: {
  name: string;
  active_ingredient?: string;
}) {
  return q.mssqlUpsertChemical(input);
}

export async function mssqlImportChemicalsRowsAction(
  rows: { name: string; active_ingredient?: string }[],
) {
  return q.mssqlImportChemicalsRows(rows);
}

export async function mssqlDeactivateChemicalAction(id: string) {
  return q.mssqlDeactivateChemical(id);
}
