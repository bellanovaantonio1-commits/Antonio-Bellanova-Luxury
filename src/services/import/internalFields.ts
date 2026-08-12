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

export interface InternalFieldSources {
  analysis?: Record<string, unknown>;
  source?: {
    metadata?: Record<string, unknown>;
    specs?: Record<string, unknown>;
  };
}

export function extractInternalFields({ analysis = {}, source = {} }: InternalFieldSources) {
  const meta = source.metadata || {};
  const specs = source.specs || {};

  const overallRank = normalizeRank(
    pickFirst(analysis.overallRank, meta.overallRank, specs["Overall Rank"], specs["商品ランク"], specs["ランク"])
  );
  const caseRank = normalizeRank(
    pickFirst(analysis.caseRank, meta.caseRank, specs["Case Rank"], specs["ケースランク"])
  );
  const bandRank = normalizeRank(
    pickFirst(analysis.bandRank, meta.bandRank, specs["Band Rank"], specs["バンドランク"], specs["ベルトランク"])
  );
  const sourceRank = normalizeRank(
    pickFirst(analysis.sourceRank, meta.overallRank, overallRank, caseRank)
  );
  const sourceCondition = pickFirst(
    analysis.sourceCondition,
    meta.sourceCondition,
    specs["Condition"],
    specs["状態"],
    overallRank ? `Rank ${overallRank}` : ""
  );
  const conditionRemarks = pickFirst(
    analysis.conditionRemarks,
    meta.conditionRemarks,
    specs["Remarks"],
    specs["備考"],
    specs["Condition Details"]
  );
  const maintenanceDescription = pickFirst(
    analysis.maintenanceDescription,
    meta.maintenanceDescription,
    specs["Maintenance Info"],
    specs["Maintenance"],
    specs["メンテナンス情報"]
  );
  const dailyRateDisplay = pickFirst(
    analysis.dailyRateDisplay,
    meta.dailyRateDisplay,
    specs["Daily Rate"],
    specs["Timing accuracy"],
    specs["日差"]
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
  source: InternalFieldSources["source"]
): T & ReturnType<typeof extractInternalFields> {
  const internal = extractInternalFields({ analysis, source });
  return { ...analysis, ...internal };
}
