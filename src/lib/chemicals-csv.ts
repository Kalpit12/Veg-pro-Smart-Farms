export const CHEMICALS_CSV_HEADERS = ["name", "active_ingredient"] as const;

export type ChemicalsCsvRow = {
  name: string;
  active_ingredient?: string;
};

export type ImportChemicalsResult = {
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
};

export function chemicalsCsvTemplateContent() {
  return `${CHEMICALS_CSV_HEADERS.join(",")}\nNeem oil,\nSpinosad,Spinosad A+D\n`;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseChemicalsCsv(csvText: string): { rows: ChemicalsCsvRow[]; errors: string[] } {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const errors: string[] = [];
  if (!lines.length) {
    return { rows: [], errors: ["CSV is empty."] };
  }

  const headerCells = splitCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const nameIdx = headerCells.indexOf("name");
  const aiIdx = headerCells.indexOf("active_ingredient");
  const startLine = nameIdx >= 0 ? 1 : 0;
  const nameColumn = nameIdx >= 0 ? nameIdx : 0;
  const aiColumn = aiIdx >= 0 ? aiIdx : 1;

  const rows: ChemicalsCsvRow[] = [];
  for (let i = startLine; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!);
    const name = (cells[nameColumn] ?? "").trim();
    if (!name) {
      errors.push(`Line ${i + 1}: missing product name.`);
      continue;
    }
    const active_ingredient = (cells[aiColumn] ?? "").trim() || undefined;
    rows.push({ name, active_ingredient });
  }

  return { rows, errors };
}
