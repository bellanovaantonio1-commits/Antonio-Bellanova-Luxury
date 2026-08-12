import type { products } from "../../db/schema.ts";
import { resolveShopContentFields, type ResolvedShopContent } from "../import/shopContent.ts";

type ProductRow = typeof products.$inferSelect;

function parseJsonField<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === "object") return value as T;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return null;
}

function buildAnalysisFromProduct(product: ProductRow, brandName?: string): Record<string, unknown> {
  return {
    brand: brandName,
    model: product.model,
    sku: product.sku,
    year: product.year,
    box: product.box,
    papers: product.papers,
    movement: product.movement,
    material: product.material,
    diameter: product.diameter,
    conditionGroup: product.conditionGroup,
    sourceCondition: product.sourceCondition,
    sourceRank: product.sourceRank,
    caseRank: product.caseRank,
    bandRank: product.bandRank,
    overallRank: product.overallRank,
    conditionRemarks: product.conditionRemarks,
    maintenanceDescription: product.maintenanceDescription,
    dailyRateDisplay: product.dailyRateDisplay,
    name: product.name,
  };
}

function buildSourceFromProduct(
  product: ProductRow,
  sourceData: Record<string, unknown> | null
): NonNullable<Parameters<typeof resolveShopContentFields>[0]["source"]> {
  if (sourceData) {
    const specs =
      (sourceData.specs as Record<string, unknown> | undefined) ||
      parseJsonField<Record<string, unknown>>(product.specifications) ||
      {};
    return {
      description: String(sourceData.description || product.descriptionDe || product.descriptionEn || ""),
      metadata: (sourceData.metadata as Record<string, unknown> | undefined) || {},
      specs,
    };
  }

  const specs = parseJsonField<Record<string, string>>(product.specifications) || {};
  return {
    description: product.descriptionDe || product.descriptionEn || "",
    metadata: {},
    specs,
  };
}

export function reEnrichProductFields(product: ProductRow, brandName?: string): ResolvedShopContent {
  const sourceData = parseJsonField<Record<string, unknown>>(product.sourceData);
  const analysis = buildAnalysisFromProduct(product, brandName);
  const source = buildSourceFromProduct(product, sourceData);

  return resolveShopContentFields({
    analysis,
    source,
    contentDe: {
      title: product.titleDe || undefined,
      shortDescription: product.shortDescriptionDe || undefined,
      description: product.descriptionDe || undefined,
      specificationsText: product.specificationsDe || undefined,
      scopeOfDelivery: product.scopeOfDeliveryDe || undefined,
      conditionText: product.conditionDe || undefined,
      seoTitle: product.seoTitleDe || undefined,
      seoDescription: product.seoDescriptionDe || undefined,
    },
    contentEn: {
      title: product.titleEn || undefined,
      shortDescription: product.shortDescriptionEn || undefined,
      description: product.descriptionEn || undefined,
      specificationsText: product.specificationsEn || undefined,
      scopeOfDelivery: product.scopeOfDeliveryEn || undefined,
      conditionText: product.conditionEn || undefined,
      seoTitle: product.seoTitleEn || undefined,
      seoDescription: product.seoDescriptionEn || undefined,
    },
  });
}

export function resolvedContentToDbFields(resolved: ResolvedShopContent) {
  return {
    titleDe: resolved.titleDe,
    titleEn: resolved.titleEn,
    shortDescriptionDe: resolved.shortDescriptionDe,
    shortDescriptionEn: resolved.shortDescriptionEn,
    descriptionDe: resolved.descriptionDe,
    descriptionEn: resolved.descriptionEn,
    specificationsDe: resolved.specificationsDe,
    specificationsEn: resolved.specificationsEn,
    scopeOfDeliveryDe: resolved.scopeOfDeliveryDe,
    scopeOfDeliveryEn: resolved.scopeOfDeliveryEn,
    conditionDe: resolved.conditionDe,
    conditionEn: resolved.conditionEn,
    seoTitleDe: resolved.seoTitleDe,
    seoTitleEn: resolved.seoTitleEn,
    seoDescriptionDe: resolved.seoDescriptionDe,
    seoDescriptionEn: resolved.seoDescriptionEn,
  };
}
