/** Parse numbers with German (1.234,56) or English (1234.56) formatting */
export function parseLocaleNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;

  let s = String(value).trim().replace(/\s/g, "");
  if (!s) return fallback;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    s = s.replace(",", ".");
  }

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
}

export function toDbNumeric(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseLocaleNumber(value, NaN);
  return Number.isFinite(n) ? n.toString() : null;
}
