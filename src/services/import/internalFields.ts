/** Merge internal condition/rank fields from scraped source data into analysis. */

const VALID_RANKS = new Set(["N", "S", "SA", "A", "AB", "B", "QS", "QA", "QB", "QC"]);

const RANK_CONDITION_DE: Record<string, string> = {
  N: "Neu (Rank N)",
  S: "Ungetragen (Rank S)",
  SA: "Exzellent (Rank SA)",
  A: "Sehr gut (Rank A)",
  AB: "Sehr gut (Rank AB)",
  B: "Gut (Rank B)",
  QS: "Exzellent — Vintage (QS)",
  QA: "Sehr gut — Vintage (QA)",
  QB: "Gut — Vintage (QB)",
  QC: "Gebraucht — Vintage (QC)",
};

export function pickFirst(...values: unknown[]): string {
  for (const v of values) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

export function hasJapanese(text: string): boolean {
  return /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(text);
}

export function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function hasHtmlArtifact(text: string): boolean {
  return /<\/?\w+>/.test(text) || text === "</td>" || text === "</tr>";
}

export function cleanScrapedValue(value: unknown): string {
  const s = stripHtml(String(value ?? "")).trim();
  if (!s || hasHtmlArtifact(s)) return "";
  return s;
}

export function isValidRankCode(value: string): boolean {
  return VALID_RANKS.has(value.trim().toUpperCase());
}

/** Extract TS rank code (A, SA, N, …) — returns empty if not a valid rank. */
export function normalizeRank(value: unknown): string {
  if (value === null || value === undefined) return "";
  const trimmed = cleanScrapedValue(value);
  if (!trimmed || trimmed.length > 12 || hasJapanese(trimmed)) return "";

  const exact = trimmed.match(/^(N|S|SA|A|AB|B|QS|QA|QB|QC)$/i);
  if (exact) return exact[1].toUpperCase();

  const labeled = trimmed.match(/(?:rank|ランク)\s*[:：]?\s*(N|S|SA|AB|QS|QA|QB|QC|A|B)/i);
  if (labeled) return labeled[1].toUpperCase();

  const embedded = trimmed.match(/\b(N|S|SA|AB|QS|QA|QB|QC|A|B)\b/i);
  if (embedded) return embedded[1].toUpperCase();

  return "";
}

export function rankToGermanCondition(rank: string): string {
  return RANK_CONDITION_DE[rank.toUpperCase()] || (rank ? `Rank ${rank}` : "");
}

/** Parse rank / remarks / maintenance / daily rate from free-form text (Latin labels only). */
export function extractFromDescriptionText(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  const normalized = stripHtml(text).replace(/\r\n/g, "\n");
  if (!normalized) return result;

  const fieldPatterns: [key: string, regex: RegExp][] = [
    ["overallRank", /(?:Overall Rank|Product Rank)[：:\s]*([A-Za-z]{1,3})\b/im],
    ["caseRank", /(?:Case Rank)[：:\s]*([A-Za-z]{1,3})\b/im],
    ["bandRank", /(?:Band Rank|Bracelet Rank)[：:\s]*([A-Za-z]{1,3})\b/im],
    [
      "conditionRemarks",
      /(?:Remarks|Condition Notes)[：:\s]*([\s\S]*?)(?=\n\s*(?:Maintenance|Daily|Case Rank|Band Rank)|$)/im,
    ],
    [
      "maintenanceDescription",
      /(?:Maintenance(?: Info)?|Overhaul|Wartung)[：:\s]*([\s\S]*?)(?=\n\s*(?:Daily|Remarks|Case Rank)|$)/im,
    ],
    ["dailyRateDisplay", /(?:Daily Rate|Timing|Accuracy|Gangabweichung)[：:\s]*([^\n|]+)/im],
  ];

  for (const [key, regex] of fieldPatterns) {
    const match = normalized.match(regex);
    if (match?.[1]?.trim()) {
      const val = match[1].trim().replace(/\s+/g, " ");
      if (!hasJapanese(val) && !hasHtmlArtifact(val)) {
        result[key] = val;
      }
    }
  }

  return result;
}

/** Translate common JP maintenance notes to German; skip garbage/HTML. */
export function translateMaintenanceToDe(raw: unknown): string {
  const s = cleanScrapedValue(raw);
  if (!s) return "";
  if (!hasJapanese(s)) return s;

  if (/^(なし|無し|無|ー|−|-+|none|n\/a)$/i.test(s)) {
    return "Keine Wartung dokumentiert";
  }
  if (/オーバーホール|\bOH\b/i.test(s)) return "Overhaul durchgeführt";
  if (/ポリッシュ|研磨|磨き/i.test(s)) return "Politur durchgeführt";
  if (/電池|battery/i.test(s)) return "Batteriewechsel durchgeführt";
  if (/未実施|していない/.test(s)) return "Keine Wartung dokumentiert";

  return "";
}

/** Normalize daily rate to German display; extract seconds from mixed JP/EN text. */
export function formatDailyRateDisplay(raw: unknown): string {
  const t = cleanScrapedValue(raw);
  if (!t) return "";

  if (/sek\.?\/?tag|sec\.?\/?day/i.test(t)) {
    return /^ca\./i.test(t) ? t : `ca. ${t}`;
  }

  const jp = t.match(/([+\-±]?\s*\d+(?:\.\d+)?)\s*秒/);
  if (jp) {
    const num = jp[1].replace(/\s/g, "");
    const sign = num.startsWith("-") ? "" : num.startsWith("+") ? "+" : "±";
    const value = num.replace(/^[+\-±]/, "");
    return `ca. ${sign}${value} Sek./Tag`;
  }

  const en = t.match(/([+\-±]?\s*\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?(?:\/|\s*per\s*)?day/i);
  if (en) {
    const num = en[1].replace(/\s/g, "");
    const sign = num.startsWith("-") ? "" : "+";
    const value = num.replace(/^[+\-±]/, "");
    return `ca. ${sign}${value} Sek./Tag`;
  }

  if (hasJapanese(t) || hasHtmlArtifact(t)) return "";

  return t;
}

/** Pick first value that is clean German/Latin text (no JP, no HTML). */
function pickFirstGerman(...values: unknown[]): string {
  for (const v of values) {
    const s = cleanScrapedValue(v);
    if (s && !hasJapanese(s)) return s;
  }
  return "";
}

export interface InternalFieldSources {
  analysis?: Record<string, unknown>;
  contentDe?: { conditionText?: string };
  source?: {
    description?: string;
    metadata?: Record<string, unknown>;
    specs?: Record<string, unknown>;
  };
}

/** Source data wins over AI — output German-friendly internal fields. */
export function extractInternalFields({ analysis = {}, source = {}, contentDe }: InternalFieldSources) {
  const meta = source.metadata || {};
  const specs = source.specs || {};

  const textBlob = stripHtml(
    [meta.fullDescription, source.description].filter(Boolean).join("\n")
  );
  const fromText = extractFromDescriptionText(textBlob);

  const caseRank = normalizeRank(
    pickFirst(meta.caseRank, specs["Case Rank"], fromText.caseRank, analysis.caseRank)
  );
  const bandRank =
    normalizeRank(pickFirst(meta.bandRank, specs["Band Rank"], fromText.bandRank, analysis.bandRank)) ||
    caseRank;
  const overallRank =
    normalizeRank(
      pickFirst(meta.overallRank, specs["Overall Rank"], fromText.overallRank, analysis.overallRank)
    ) ||
    caseRank ||
    bandRank;
  const sourceRank = overallRank || caseRank || bandRank;

  const sourceCondition =
    rankToGermanCondition(sourceRank) ||
    pickFirstGerman(meta.sourceCondition, specs["Condition"]) ||
    (sourceRank ? `Rank ${sourceRank}` : "");

  const conditionRemarks = pickFirstGerman(
    contentDe?.conditionText,
    analysis.conditionRemarks,
    fromText.conditionRemarks,
    meta.conditionRemarks,
    specs["Remarks"],
    specs["Condition Details"]
  );

  const maintenanceDescription =
    pickFirstGerman(fromText.maintenanceDescription, analysis.maintenanceDescription) ||
    translateMaintenanceToDe(meta.maintenanceDescription) ||
    translateMaintenanceToDe(specs["Maintenance Info"]) ||
    translateMaintenanceToDe(specs["Maintenance"]);

  const dailyRateDisplay = formatDailyRateDisplay(
    pickFirst(
      meta.dailyRateDisplay,
      specs["Daily Rate"],
      specs["Timing accuracy"],
      fromText.dailyRateDisplay,
      analysis.dailyRateDisplay
    )
  );

  return {
    sourceCondition,
    sourceRank,
    caseRank,
    bandRank,
    overallRank,
    conditionRemarks,
    maintenanceDescription,
    dailyRateDisplay,
    maintenancePerformed: Boolean(analysis.maintenancePerformed) || !!maintenanceDescription,
    dailyRateSeconds: analysis.dailyRateSeconds ?? 0,
  };
}

export function mergeInternalFieldsIntoAnalysis<T extends Record<string, unknown>>(
  analysis: T,
  source: InternalFieldSources["source"],
  contentDe?: InternalFieldSources["contentDe"]
): T & ReturnType<typeof extractInternalFields> {
  const internal = extractInternalFields({ source, contentDe });
  return { ...analysis, ...internal };
}
