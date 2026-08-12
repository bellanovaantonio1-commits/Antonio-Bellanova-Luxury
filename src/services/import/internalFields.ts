/** Merge internal condition/rank fields from scraped source data into analysis. */

export function pickFirst(...values: unknown[]): string {
  for (const v of values) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

/** Extract TS rank code (A, SA, N, …) from labels like "Rank A" or "ランクA". */
export function normalizeRank(value: unknown): string {
  if (value === null || value === undefined) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";

  const exact = trimmed.match(/^(N|S|SA|A|AB|B|QS|QA|QB|QC)$/i);
  if (exact) return exact[1].toUpperCase();

  const labeled = trimmed.match(/(?:rank|ランク)\s*[:：]?\s*(N|S|SA|AB|QS|QA|QB|QC|A|B)/i);
  if (labeled) return labeled[1].toUpperCase();

  const embedded = trimmed.match(/\b(N|S|SA|AB|QS|QA|QB|QC|A|B)\b/i);
  if (embedded) return embedded[1].toUpperCase();

  return trimmed;
}

/** Parse rank / remarks / maintenance / daily rate from free-form TS Trading text. */
export function extractFromDescriptionText(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!text?.trim()) return result;

  const normalized = text.replace(/\r\n/g, "\n");

  const fieldPatterns: [key: string, regex: RegExp][] = [
    ["overallRank", /(?:商品ランク|Overall Rank|^ランク)[：:\s]*([^\n|]+)/im],
    ["caseRank", /(?:ケースランク|Case Rank)[：:\s]*([^\n|]+)/im],
    ["bandRank", /(?:ベルトランク|バンドランク|Band Rank|Bracelet Rank)[：:\s]*([^\n|]+)/im],
    [
      "conditionRemarks",
      /(?:備考|Remarks|リマーク|Condition Notes|Individuelle Bemerkungen)[：:\s]*([\s\S]*?)(?=\n\s*(?:メンテナンス|Maintenance|日差|Daily|Case Rank|Band Rank|ケース|ベルト|バンド)|$)/im,
    ],
    [
      "maintenanceDescription",
      /(?:メンテナンス(?:情報)?|Maintenance(?: Info)?|Overhaul|Wartung)[：:\s]*([\s\S]*?)(?=\n\s*(?:日差|Daily|備考|Remarks|Case Rank)|$)/im,
    ],
    ["dailyRateDisplay", /(?:日差|Daily Rate|Timing|Accuracy|Gangabweichung)[：:\s]*([^\n|]+)/im],
  ];

  for (const [key, regex] of fieldPatterns) {
    const match = normalized.match(regex);
    if (match?.[1]?.trim()) {
      result[key] = match[1].trim().replace(/\s+/g, " ");
    }
  }

  return result;
}

/** Normalize daily rate to a readable DE display string. */
export function formatDailyRateDisplay(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  const t = String(raw).trim();
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

  return t;
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

/** Source data wins over AI analysis for internal-only fields. */
export function extractInternalFields({ analysis = {}, source = {}, contentDe }: InternalFieldSources) {
  const meta = source.metadata || {};
  const specs = source.specs || {};

  const textBlob = [
    meta.fullDescription,
    source.description,
    specs["Remarks"],
    specs["備考"],
  ]
    .filter(Boolean)
    .join("\n");
  const fromText = extractFromDescriptionText(textBlob);

  const overallRank = normalizeRank(
    pickFirst(meta.overallRank, specs["Overall Rank"], specs["商品ランク"], specs["ランク"], fromText.overallRank, analysis.overallRank)
  );
  const caseRank = normalizeRank(
    pickFirst(meta.caseRank, specs["Case Rank"], specs["ケースランク"], fromText.caseRank, analysis.caseRank, overallRank)
  );
  const bandRank =
    normalizeRank(
      pickFirst(meta.bandRank, specs["Band Rank"], specs["バンドランク"], specs["ベルトランク"], fromText.bandRank, analysis.bandRank)
    ) || caseRank;
  const sourceRank = normalizeRank(
    pickFirst(meta.overallRank, overallRank, caseRank, analysis.sourceRank)
  );
  const sourceCondition = pickFirst(
    meta.sourceCondition,
    specs["Condition"],
    specs["状態"],
    overallRank ? `Rank ${overallRank}` : "",
    caseRank ? `Case Rank ${caseRank}` : "",
    analysis.sourceCondition
  );
  const conditionRemarks = pickFirst(
    meta.conditionRemarks,
    specs["Remarks"],
    specs["備考"],
    specs["Condition Details"],
    fromText.conditionRemarks,
    contentDe?.conditionText,
    analysis.conditionRemarks
  );
  const maintenanceDescription = pickFirst(
    meta.maintenanceDescription,
    specs["Maintenance Info"],
    specs["Maintenance"],
    specs["メンテナンス情報"],
    fromText.maintenanceDescription,
    analysis.maintenanceDescription
  );
  const dailyRateDisplay = formatDailyRateDisplay(
    pickFirst(meta.dailyRateDisplay, specs["Daily Rate"], specs["Timing accuracy"], specs["日差"], fromText.dailyRateDisplay, analysis.dailyRateDisplay)
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
