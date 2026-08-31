import * as XLSX from "xlsx";

export type ExcelRow = Record<string, string | number | boolean | null | undefined>;

export function downloadExcel(
  rows: ExcelRow[],
  filename: string,
  sheetName = "Data",
): boolean {
  if (!rows.length) return false;

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  const safeName = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, safeName);
  return true;
}
