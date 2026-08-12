import {
  cleanScrapedValue,
  cleanMaintenanceSnippet,
  extractInternalFields,
  hasJapanese,
  pickFirst,
  rankToGermanCondition,
  stripHtml,
} from "./internalFields.ts";

export interface ShopContentBlock {
  title?: string;
  shortDescription?: string;
  description?: string;
  specificationsText?: string;
  scopeOfDelivery?: string;
  conditionText?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface ResolvedShopContent {
  titleDe: string;
  titleEn: string;
  shortDescriptionDe: string;
  shortDescriptionEn: string;
  descriptionDe: string;
  descriptionEn: string;
  specificationsDe: string;
  specificationsEn: string;
  scopeOfDeliveryDe: string;
  scopeOfDeliveryEn: string;
  conditionDe: string;
  conditionEn: string;
  seoTitleDe: string;
  seoTitleEn: string;
  seoDescriptionDe: string;
  seoDescriptionEn: string;
}

const GENERIC_CONDITION = /zustand siehe quellseite|condition see source/i;
const RAW_LISTING = /used item very clean|product number \d+|please refer to the product description|stored in a separate warehouse/i;

const RANK_CONDITION_EN: Record<string, string> = {
  N: "New condition (Rank N)",
  S: "Unused condition (Rank S)",
  SA: "Excellent condition (Rank SA)",
  A: "Very good condition (Rank A)",
  AB: "Very good condition (Rank AB)",
  B: "Good condition (Rank B)",
  QS: "Excellent vintage condition (QS)",
  QA: "Very good vintage condition (QA)",
  QB: "Good vintage condition (QB)",
  QC: "Used vintage condition (QC)",
};

function translateSpecValueDe(value: string): string {
  return value
    .replace(/\bStainless steel\b/gi, "Edelstahl")
    .replace(/\bAutomatic winding\b/gi, "Automatik")
    .replace(/\bAutomatic\b/gi, "Automatik")
    .replace(/\bBlack\b/gi, "Schwarz")
    .replace(/\bWhite\b/gi, "Weiß")
    .replace(/\bBlue\b/gi, "Blau")
    .replace(/\bSilver\b/gi, "Silber")
    .replace(/\bMen'?s\b/gi, "Herren")
    .replace(/\bWomen'?s\b/gi, "Damen")
    .replace(/\bApprox\.\s*/gi, "ca. ")
    .replace(/\bmm\b/gi, "mm");
}

function translateAccessoriesDe(value: string): string {
  return value
    .replace(/\bBox\b/gi, "Originalbox")
    .replace(/\bGuarantee \(blank\)/gi, "Garantiekarte (blanko)")
    .replace(/\bGuarantee\b/gi, "Garantie")
    .replace(/\bWarranty card\b/gi, "Garantiekarte")
    .replace(/\bOriginal papers\b/gi, "Originalpapiere")
    .replace(/\bPapers\b/gi, "Originalpapiere")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMaintenanceText(value: string): string {
  return cleanMaintenanceSnippet(value);
}

function buildSpecifications(
  specs: Record<string, string>,
  analysis: Record<string, unknown>,
  internal?: ReturnType<typeof extractInternalFields>
): { de: string; en: string } {
  const rows: { de: string; en: string }[] = [];

  const add = (deLabel: string, enLabel: string, ...values: unknown[]) => {
    const raw = pickFirst(...values);
    if (!raw || hasJapanese(raw)) return;
    rows.push({
      de: `${deLabel}: ${translateSpecValueDe(raw)}`,
      en: `${enLabel}: ${raw}`,
    });
  };

  add("Marke", "Brand", analysis.brand, specs["Brand"]);
  add("Modell", "Model", analysis.model, specs["Model"]);
  add("Referenz", "Reference", analysis.sku, specs["Product Number"], specs["Ref No."], specs["Product No."]);
  add("Werk", "Movement", specs["Movement"], analysis.movement);
  add("Gehäusegröße", "Case size", specs["Case Size"], specs["Case size"], analysis.diameter);
  add("Material", "Material", specs["Material"], analysis.material);
  add("Zifferblatt", "Dial", specs["Dial Color"], specs["Dial"]);
  add("Armumfang", "Bracelet", specs["Bracelet Size"]);
  add("Baujahr", "Year", analysis.year, specs["Year"], specs["Manufacture Year"]);
  add("Form", "Shape", specs["Shape"]);
  add("Zielgruppe", "Target", specs["Target"]);

  if (internal?.overallRank || internal?.sourceRank) {
    const rank = internal.overallRank || internal.sourceRank;
    rows.push({ de: `Zustandsrang: ${rank}`, en: `Condition rank: ${rank}` });
  }
  if (internal?.caseRank) {
    rows.push({ de: `Gehäuse: Rank ${internal.caseRank}`, en: `Case: Rank ${internal.caseRank}` });
  }
  if (internal?.bandRank) {
    rows.push({ de: `Band: Rank ${internal.bandRank}`, en: `Band: Rank ${internal.bandRank}` });
  }

  if (rows.length === 0) return { de: "", en: "" };
  return {
    de: rows.map((row) => row.de).join("\n"),
    en: rows.map((row) => row.en).join("\n"),
  };
}

function buildScopeOfDelivery(
  specs: Record<string, string>,
  analysis: Record<string, unknown>
): { de: string; en: string } {
  const accessories = cleanScrapedValue(
    pickFirst(specs["Accessories"], specs["Scope of Delivery"], specs["Included"])
  );

  if (accessories && !hasJapanese(accessories)) {
    return {
      de: translateAccessoriesDe(accessories),
      en: accessories,
    };
  }

  const partsDe: string[] = [];
  const partsEn: string[] = [];
  if (analysis.box === true || analysis.box === "true") {
    partsDe.push("Originalbox");
    partsEn.push("Original box");
  }
  if (analysis.papers === true || analysis.papers === "true") {
    partsDe.push("Originalpapiere");
    partsEn.push("Original papers");
  }

  return {
    de: partsDe.join(", "),
    en: partsEn.join(", "),
  };
}

function buildConditionText(
  internal: ReturnType<typeof extractInternalFields>,
  remarks?: string
): { de: string; en: string } {
  const rank = internal.overallRank || internal.caseRank || internal.bandRank || internal.sourceRank;
  const cleanRemarks = cleanScrapedValue(remarks || internal.conditionRemarks);

  let de = rank ? rankToGermanCondition(rank) : internal.sourceCondition || "";
  let en = rank ? RANK_CONDITION_EN[rank] || `Rank ${rank}` : "";

  if (internal.caseRank && internal.bandRank) {
    de += ` — Gehäuse Rank ${internal.caseRank}, Band Rank ${internal.bandRank}`;
    en += ` — Case Rank ${internal.caseRank}, Band Rank ${internal.bandRank}`;
  }

  if (cleanRemarks) {
    de = de ? `${de}. ${cleanRemarks}` : cleanRemarks;
    en = en ? `${en}. ${cleanRemarks}` : cleanRemarks;
  }

  return { de: de.trim(), en: en.trim() };
}

function buildTitle(
  brand: string,
  model: string,
  sku: string,
  scopeDe: string
): { de: string; en: string } {
  const base = [brand, model].filter(Boolean).join(" ").trim();
  const ref = sku ? ` Ref. ${sku}` : "";
  const title = `${base}${ref}`.trim();

  if (!title) return { de: "", en: "" };

  const scopeHintDe = scopeDe ? ` — ${scopeDe}` : "";
  const scopeHintEn = scopeDe
    ? ` — ${scopeDe.replace(/Originalbox/gi, "with box").replace(/Garantiekarte \(blanko\)/gi, "warranty card")}`
    : "";

  return {
    de: `${title}${scopeHintDe}`.trim(),
    en: `${title}${scopeHintEn}`.trim(),
  };
}

function buildDescription(
  brand: string,
  model: string,
  specs: Record<string, string>,
  condition: { de: string; en: string },
  scope: { de: string; en: string },
  maintenance: string,
  dailyRate: string
): { de: string; en: string } {
  const caseSize = pickFirst(specs["Case Size"], specs["Case size"]);
  const material = pickFirst(specs["Material"]);
  const movement = pickFirst(specs["Movement"]);
  const dial = pickFirst(specs["Dial Color"], specs["Dial"]);
  const maintenanceClean = cleanMaintenanceText(maintenance);

  const deParts: string[] = [];
  const enParts: string[] = [];

  if (brand && model) {
    deParts.push(
      `Die ${brand} ${model} vereint markantes Design mit präziser Uhrmacherkunst — ein charaktervolles Stück für anspruchsvolle Sammler.`
    );
    enParts.push(
      `The ${brand} ${model} combines distinctive design with precise watchmaking — a characterful piece for discerning collectors.`
    );
  }

  const specSentenceDe = [
    caseSize ? `Gehäuse ${translateSpecValueDe(caseSize)}` : "",
    material ? translateSpecValueDe(material) : "",
    movement ? translateSpecValueDe(movement) : "",
    dial ? `Zifferblatt ${translateSpecValueDe(dial)}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const specSentenceEn = [
    caseSize ? `Case ${caseSize}` : "",
    material || "",
    movement ? `${movement} movement` : "",
    dial ? `${dial} dial` : "",
  ]
    .filter(Boolean)
    .join(", ");

  if (specSentenceDe) deParts.push(`Technische Highlights: ${specSentenceDe}.`);
  if (specSentenceEn) enParts.push(`Technical highlights: ${specSentenceEn}.`);

  return {
    de: deParts.join("\n\n"),
    en: enParts.join("\n\n"),
  };
}

function isWeakField(value: string | undefined, kind: "condition" | "description" | "title" | "specs" | "scope"): boolean {
  const text = (value || "").trim();
  if (!text) return true;
  if (kind === "condition") return GENERIC_CONDITION.test(text);
  if (kind === "description") return RAW_LISTING.test(text) || text.length > 800;
  if (kind === "title") return RAW_LISTING.test(text);
  return false;
}

function looksEnglish(text: string): boolean {
  if (!text.trim()) return false;
  if (/[äöüß]/i.test(text)) return false;
  return /\b(the|with|condition|box|warranty|automatic|stainless|very good|excellent)\b/i.test(text);
}

function pickBetter(existing: string | undefined, fallback: string, kind: Parameters<typeof isWeakField>[1]): string {
  if (isWeakField(existing, kind) && fallback.trim()) return fallback;
  return (existing || fallback || "").trim();
}

function pickBetterDe(existing: string | undefined, fallback: string, kind: Parameters<typeof isWeakField>[1]): string {
  const current = (existing || "").trim();
  const next = (fallback || "").trim();
  if (isWeakField(current, kind) && next) return next;
  if (next && looksEnglish(current) && !looksEnglish(next)) return next;
  return current || next;
}

export function resolveShopContentFields(input: {
  analysis?: Record<string, unknown>;
  source?: {
    description?: string;
    metadata?: Record<string, unknown>;
    specs?: Record<string, unknown>;
  };
  contentDe?: ShopContentBlock;
  contentEn?: ShopContentBlock;
}): ResolvedShopContent {
  const analysis = input.analysis || {};
  const source = input.source || {};
  const specs = (source.specs || {}) as Record<string, string>;
  const contentDe = input.contentDe || {};
  const contentEn = input.contentEn || {};

  const internal = extractInternalFields({
    analysis,
    source,
    contentDe,
  });

  const brand = pickFirst(analysis.brand, specs["Brand"]);
  const model = pickFirst(analysis.model, specs["Model"]);
  const sku = pickFirst(analysis.sku, specs["Product Number"], specs["Ref No."]);

  const specifications = buildSpecifications(specs, analysis, internal);
  const scope = buildScopeOfDelivery(specs, analysis);
  const condition = buildConditionText(internal, internal.conditionRemarks);
  const titles = buildTitle(brand, model, sku, scope.de);
  const descriptions = buildDescription(
    brand,
    model,
    specs,
    condition,
    scope,
    internal.maintenanceDescription,
    internal.dailyRateDisplay
  );

  const shortDe = brand && model ? `${brand} ${model}${sku ? ` · Ref. ${sku}` : ""}` : titles.de;
  const shortEn = shortDe;

  return {
    titleDe: pickBetterDe(contentDe.title, titles.de, "title"),
    titleEn: pickBetter(contentEn.title, titles.en, "title"),
    shortDescriptionDe: pickBetterDe(contentDe.shortDescription, shortDe, "description"),
    shortDescriptionEn: pickBetter(contentEn.shortDescription, shortEn, "description"),
    descriptionDe: pickBetterDe(contentDe.description, descriptions.de, "description"),
    descriptionEn: pickBetter(contentEn.description, descriptions.en, "description"),
    specificationsDe: pickBetterDe(contentDe.specificationsText, specifications.de, "specs"),
    specificationsEn: pickBetter(contentEn.specificationsText, specifications.en, "specs"),
    scopeOfDeliveryDe: pickBetterDe(contentDe.scopeOfDelivery, scope.de, "scope"),
    scopeOfDeliveryEn: pickBetter(contentEn.scopeOfDelivery, scope.en, "scope"),
    conditionDe: pickBetterDe(contentDe.conditionText, condition.de, "condition"),
    conditionEn: pickBetter(contentEn.conditionText, condition.en, "condition"),
    seoTitleDe: pickBetterDe(contentDe.seoTitle, titles.de, "title"),
    seoTitleEn: pickBetter(contentEn.seoTitle, titles.en, "title"),
    seoDescriptionDe: pickBetterDe(contentDe.seoDescription, descriptions.de.split("\n\n")[0] || "", "description"),
    seoDescriptionEn: pickBetter(contentEn.seoDescription, descriptions.en.split("\n\n")[0] || "", "description"),
  };
}

export function enrichAnalysisContent(
  analysis: Record<string, unknown>,
  source: NonNullable<Parameters<typeof resolveShopContentFields>[0]["source"]>,
  contentDe?: ShopContentBlock,
  contentEn?: ShopContentBlock
) {
  const resolved = resolveShopContentFields({ analysis, source, contentDe, contentEn });
  return {
    contentDe: {
      ...contentDe,
      title: resolved.titleDe,
      shortDescription: resolved.shortDescriptionDe,
      description: resolved.descriptionDe,
      specificationsText: resolved.specificationsDe,
      scopeOfDelivery: resolved.scopeOfDeliveryDe,
      conditionText: resolved.conditionDe,
      seoTitle: resolved.seoTitleDe,
      seoDescription: resolved.seoDescriptionDe,
    },
    contentEn: {
      ...contentEn,
      title: resolved.titleEn,
      shortDescription: resolved.shortDescriptionEn,
      description: resolved.descriptionEn,
      specificationsText: resolved.specificationsEn,
      scopeOfDelivery: resolved.scopeOfDeliveryEn,
      conditionText: resolved.conditionEn,
      seoTitle: resolved.seoTitleEn,
      seoDescription: resolved.seoDescriptionEn,
    },
  };
}

/** Strip raw supplier listing text from description blobs. */
export function sanitizeSourceDescription(text: unknown): string {
  const cleaned = stripHtml(String(text || ""));
  if (!cleaned || hasJapanese(cleaned) || RAW_LISTING.test(cleaned)) return "";
  return cleaned;
}
