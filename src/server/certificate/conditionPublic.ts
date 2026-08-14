const NOT_SPECIFIED_DE = "Nicht angegeben";
const NOT_SPECIFIED_EN = "Not specified";

/** Öffentliche Zustandsbeschreibung ohne interne Rank-Codes. */
const RANK_PUBLIC_DE: Record<string, string> = {
  N: "Neuwertiger Zustand",
  S: "Ungetragener Zustand",
  SA: "Exzellenter gebrauchter Zustand",
  A: "Sehr guter gebrauchter Zustand",
  AB: "Sehr guter gebrauchter Zustand",
  B: "Guter gebrauchter Zustand",
  QS: "Exzellenter Vintage-Zustand",
  QA: "Sehr guter Vintage-Zustand",
  QB: "Guter Vintage-Zustand",
  QC: "Gebrauchter Vintage-Zustand",
};

const RANK_PUBLIC_EN: Record<string, string> = {
  N: "Like-new condition",
  S: "Unworn condition",
  SA: "Excellent pre-owned condition",
  A: "Very good pre-owned condition",
  AB: "Very good pre-owned condition",
  B: "Good pre-owned condition",
  QS: "Excellent vintage condition",
  QA: "Very good vintage condition",
  QB: "Good vintage condition",
  QC: "Used vintage condition",
};

function stripRankCodes(text: string): string {
  return text
    .replace(/\(?\s*Rank\s+[A-Z]{1,2}\s*\)?/gi, "")
    .replace(/\bRank\s+[A-Z]{1,2}\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function hasJapanese(text: string): boolean {
  return /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(text);
}

function cleanText(value: unknown): string {
  const s = String(value ?? "").trim();
  if (!s || hasJapanese(s)) return "";
  return s;
}

export function resolvePublicCondition(
  product: {
    conditionDe?: string | null;
    conditionEn?: string | null;
    overallRank?: string | null;
    sourceRank?: string | null;
    caseRank?: string | null;
    bandRank?: string | null;
  },
  lang: "de" | "en"
): string {
  const fallback = lang === "de" ? NOT_SPECIFIED_DE : NOT_SPECIFIED_EN;
  const raw = lang === "de" ? product.conditionDe : product.conditionEn;
  const cleaned = cleanText(raw);
  if (cleaned) {
    const withoutRank = stripRankCodes(cleaned);
    if (withoutRank && !/\bRank\b/i.test(withoutRank)) return withoutRank;
  }

  const rank = cleanText(
    product.overallRank || product.sourceRank || product.caseRank || product.bandRank
  ).toUpperCase();

  if (rank && (lang === "de" ? RANK_PUBLIC_DE[rank] : RANK_PUBLIC_EN[rank])) {
    return lang === "de" ? RANK_PUBLIC_DE[rank] : RANK_PUBLIC_EN[rank];
  }

  return fallback;
}

export function displayOrNotSpecified(value: unknown, lang: "de" | "en"): string {
  const cleaned = cleanText(value);
  return cleaned || (lang === "de" ? NOT_SPECIFIED_DE : NOT_SPECIFIED_EN);
}
