export interface SpecRow {
  label: string;
  value: string;
}

const SPEC_ORDER: string[] = [
  "Marke",
  "Brand",
  "Modell",
  "Model",
  "Referenz",
  "Reference",
  "Werk",
  "Movement",
  "Uhrwerk",
  "Gehäusegröße",
  "Gehäuse",
  "Case",
  "Material",
  "Zifferblatt",
  "Dial",
  "Armumfang",
  "Bracelet",
  "Baujahr",
  "Year",
  "Form",
  "Shape",
  "Zielgruppe",
  "Target",
  "Zustand",
  "Condition",
  "Zustandsrang",
  "Rank",
  "Gehäuse Rank",
  "Case Rank",
  "Band Rank",
  "Band",
  "Lieferumfang",
  "Scope of delivery",
  "Box",
  "Papiere",
  "Papers",
  "Gangabweichung",
  "Daily rate",
  "Wartung",
  "Maintenance",
];

function normalizeLabel(label: string): string {
  return label.replace(/[:：]$/, "").trim();
}

function specSortIndex(label: string): number {
  const normalized = normalizeLabel(label).toLowerCase();
  const idx = SPEC_ORDER.findIndex((entry) => entry.toLowerCase() === normalized);
  return idx === -1 ? 999 : idx;
}

export function sortSpecRows(rows: SpecRow[]): SpecRow[] {
  return [...rows].sort((a, b) => {
    const diff = specSortIndex(a.label) - specSortIndex(b.label);
    if (diff !== 0) return diff;
    return a.label.localeCompare(b.label, "de");
  });
}

export function dedupeSpecRows(rows: SpecRow[]): SpecRow[] {
  const seen = new Set<string>();
  const result: SpecRow[] = [];
  for (const row of rows) {
    const key = normalizeLabel(row.label).toLowerCase();
    if (!row.value?.trim() || seen.has(key)) continue;
    seen.add(key);
    result.push({ label: normalizeLabel(row.label), value: row.value.trim() });
  }
  return result;
}

function parseKeyValueChunk(chunk: string): SpecRow | null {
  const clean = chunk.replace(/^[\*•\-]\s*/, "").trim();
  if (!clean) return null;

  const colonIndex = clean.indexOf(":");
  if (colonIndex <= 0) return null;

  const label = normalizeLabel(clean.slice(0, colonIndex));
  const value = clean.slice(colonIndex + 1).trim();
  if (!label || !value) return null;
  return { label, value };
}

/** Split prose from embedded *Details:* bullet lists inside descriptions. */
export function splitDescriptionAndDetails(text: string): { paragraphs: string[]; details: SpecRow[] } {
  const source = (text || "").replace(/\r\n/g, "\n").trim();
  if (!source) return { paragraphs: [], details: [] };

  const hinweisIndex = source.search(/\b(?:Hinweis|Note)\s*:/i);
  const mainPart = hinweisIndex > -1 ? source.slice(0, hinweisIndex).trim() : source;
  const tailPart = hinweisIndex > -1 ? source.slice(hinweisIndex).trim() : "";

  const detailsMatch = mainPart.match(/\*?\s*Details\s*:\s*([\s\S]*)/i);
  const paragraphs: string[] = [];
  const details: SpecRow[] = [];

  const prosePart = detailsMatch ? mainPart.slice(0, detailsMatch.index).trim() : mainPart;

  prosePart
    .split(/\n{2,}/)
    .map((part) => part.replace(/\*+$/, "").trim())
    .filter(Boolean)
    .forEach((part) => paragraphs.push(part));

  if (detailsMatch?.[1]) {
    detailsMatch[1]
      .trim()
      .split(/\s*\*\s*/)
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .forEach((chunk) => {
        const row = parseKeyValueChunk(chunk);
        if (row) details.push(row);
      });
  }

  if (tailPart) {
    tailPart
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => paragraphs.push(part));
  }

  return { paragraphs, details };
}

export function parseSpecificationsText(text: string): SpecRow[] {
  const source = (text || "").replace(/\r\n/g, "\n").trim();
  if (!source) return [];

  const rows: SpecRow[] = [];

  if (source.includes("|")) {
    source.split("|").forEach((part) => {
      const row = parseKeyValueChunk(part);
      if (row) rows.push(row);
    });
    return rows;
  }

  source.split("\n").forEach((line) => {
    const row = parseKeyValueChunk(line);
    if (row) rows.push(row);
  });

  return rows;
}

export function mergeSpecRows(...groups: SpecRow[][]): SpecRow[] {
  return sortSpecRows(dedupeSpecRows(groups.flat()));
}
