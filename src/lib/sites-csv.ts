/** CSV bulk import for admin Farms & Greenhouses page. */

export const SITES_CSV_HEADERS = [
  "record_type",
  "farm_name",
  "farm_location",
  "farm_type",
  "greenhouse_id",
  "greenhouse_name",
  "crop_type",
  "latitude",
  "longitude",
  "area_sqm",
  "area_ha",
  "bay_count",
  "column_count",
] as const;

export type SitesCsvRow = Partial<Record<(typeof SITES_CSV_HEADERS)[number], string>>;

export function sitesCsvTemplateContent() {
  const header = SITES_CSV_HEADERS.join(",");
  const farmExample = "farm,Star Farm,Naivasha Kenya,Floriculture,,,,,,,,";
  const ghExample =
    "greenhouse,Star Farm,,,,GH-101,Tomato,-0.7172,36.431,4840,0.484,11,11";
  return `${header}\n${farmExample}\n${ghExample}\n`;
}

export function parseSitesCsv(text: string): { rows: SitesCsvRow[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows: [], errors: ["File is empty."] };

  const headerLine = lines[0];
  const headers = splitCsvLine(headerLine).map((h) => h.trim().toLowerCase());
  const missing = SITES_CSV_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length) {
    errors.push(`Missing columns: ${missing.join(", ")}. Download the template and try again.`);
    return { rows: [], errors };
  }

  const rows: SitesCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    if (cells.every((c) => !c.trim())) continue;
    const row: SitesCsvRow = {};
    headers.forEach((key, idx) => {
      row[key as keyof SitesCsvRow] = (cells[idx] ?? "").trim();
    });
    rows.push(row);
  }
  return { rows, errors };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

export function parseOptionalNumber(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function parseOptionalInt(raw: string | undefined): number | null {
  const n = parseOptionalNumber(raw);
  if (n == null) return null;
  return Math.round(n);
}
