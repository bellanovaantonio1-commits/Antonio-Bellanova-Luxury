/**
 * Zentrale Shop-Preislogik — einzige Quelle für alle Preisberechnungen.
 */

export type ProductPricingModel = "STANDARD" | "PREPAYMENT_DISCOUNT";

export type RoundingStep = 1 | 5 | 10 | 25 | 50 | 100;

export type RoundingMode = "ROUND_UP" | "ROUND" | "ROUND_DOWN";

export type PaymentMethodId = "STRIPE" | "BANK_TRANSFER" | "PREPAYMENT";

export const VALID_ROUNDING_STEPS: RoundingStep[] = [1, 5, 10, 25, 50, 100];

export const ROUNDING_MODE_LABELS: Record<RoundingMode, string> = {
  ROUND_UP: "Immer aufrunden",
  ROUND: "Mathematisch runden",
  ROUND_DOWN: "Abrunden",
};

export const PRICING_MODEL_LABELS: Record<ProductPricingModel, string> = {
  STANDARD: "Standardpreis",
  PREPAYMENT_DISCOUNT: "Automatischer Vorkasse-Rabatt",
};

export interface StripeFeeTier {
  id: "standard" | "premium" | "international";
  label: string;
  percent: number;
  fixed: number;
}

export interface PaymentMethodConfig {
  id: PaymentMethodId;
  enabled: boolean;
  name: string;
  description: string;
  sortOrder: number;
}

export interface ShopPricingConfig {
  stripeFeePercent: number;
  stripeFeeFixed: number;
  premiumCardFeePercent: number;
  premiumCardFeeFixed: number;
  internationalCardFeePercent: number;
  internationalCardFeeFixed: number;
  stripeCurrency: string;
  roundingStep: RoundingStep;
  roundingMode: RoundingMode;
  defaultPricingModel: ProductPricingModel;
  stripeEnabledAdmin: boolean;
  bankTransferEnabled: boolean;
  prepaymentEnabled: boolean;
  paymentMethods: PaymentMethodConfig[];
}

export interface ShopPriceBreakdown {
  basePrice: number;
  rawStripePrice: number;
  shopPrice: number;
  prepaymentDiscount: number;
  estimatedStripeFee: number;
}

export interface ResolvedProductPricing {
  pricingModel: ProductPricingModel;
  fixedSalePrice: number | null;
  basePrice: number | null;
  calculatedStripePrice: number | null;
  roundedShopPrice: number;
  bankTransferDiscount: number;
  estimatedStripeFee: number | null;
}

export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: "STRIPE",
    enabled: true,
    name: "Karte (Stripe)",
    description: "Sichere Online-Zahlung per Kredit- oder Debitkarte",
    sortOrder: 1,
  },
  {
    id: "BANK_TRANSFER",
    enabled: true,
    name: "Banküberweisung",
    description: "Zahlung per Banküberweisung",
    sortOrder: 2,
  },
  {
    id: "PREPAYMENT",
    enabled: true,
    name: "Vorkasse",
    description: "Zahlung im Voraus per Überweisung",
    sortOrder: 3,
  },
];

export const PRICING_SETTING_KEYS = [
  "stripeFeePercent",
  "stripeFeeFixed",
  "premiumCardFeePercent",
  "premiumCardFeeFixed",
  "internationalCardFeePercent",
  "internationalCardFeeFixed",
  "stripeCurrency",
  "roundingStep",
  "roundingMode",
  "defaultPricingModel",
  "stripeEnabled",
  "bankTransferEnabled",
  "prepaymentEnabled",
  "paymentMethodsJson",
] as const;

export type PricingSettingKey = (typeof PRICING_SETTING_KEYS)[number];

export const PRICING_SETTING_LABELS: Record<PricingSettingKey, string> = {
  stripeFeePercent: "Stripe-Gebühr (Standardkarte, %)",
  stripeFeeFixed: "Stripe-Fixgebühr (Standardkarte, EUR)",
  premiumCardFeePercent: "Stripe-Gebühr (Premiumkarte, %)",
  premiumCardFeeFixed: "Stripe-Fixgebühr (Premiumkarte, EUR)",
  internationalCardFeePercent: "Stripe-Gebühr (international, %)",
  internationalCardFeeFixed: "Stripe-Fixgebühr (international, EUR)",
  stripeCurrency: "Stripe-Währung",
  roundingStep: "Rundungsschritt",
  roundingMode: "Rundungsart",
  defaultPricingModel: "Standard-Preismodell",
  stripeEnabled: "Stripe aktiv",
  bankTransferEnabled: "Banküberweisung aktiv",
  prepaymentEnabled: "Vorkasse aktiv",
  paymentMethodsJson: "Zahlungsarten",
};

export const DEFAULT_SHOP_PRICING_CONFIG: ShopPricingConfig = {
  stripeFeePercent: 1.5,
  stripeFeeFixed: 0.25,
  premiumCardFeePercent: 2.8,
  premiumCardFeeFixed: 0.25,
  internationalCardFeePercent: 3.15,
  internationalCardFeeFixed: 0.25,
  stripeCurrency: "EUR",
  roundingStep: 10,
  roundingMode: "ROUND_UP",
  defaultPricingModel: "STANDARD",
  stripeEnabledAdmin: true,
  bankTransferEnabled: true,
  prepaymentEnabled: true,
  paymentMethods: DEFAULT_PAYMENT_METHODS,
};

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundUpToStep(value: number, step: RoundingStep): number {
  return applyRounding(value, step, "ROUND_UP");
}

export function applyRounding(value: number, step: RoundingStep, mode: RoundingMode): number {
  if (!Number.isFinite(value)) return 0;
  if (step <= 0) return roundMoney(value);
  switch (mode) {
    case "ROUND_DOWN":
      return Math.floor(value / step) * step;
    case "ROUND":
      return Math.round(value / step) * step;
    case "ROUND_UP":
    default:
      return Math.ceil(value / step) * step;
  }
}

export function normalizePricingModel(value: unknown): ProductPricingModel {
  return value === "PREPAYMENT_DISCOUNT" ? "PREPAYMENT_DISCOUNT" : "STANDARD";
}

export function normalizeRoundingMode(value: unknown): RoundingMode {
  if (value === "ROUND" || value === "ROUND_DOWN") return value;
  return "ROUND_UP";
}

export function parsePaymentMethodsJson(raw: unknown): PaymentMethodConfig[] {
  if (typeof raw !== "string" || !raw.trim()) return DEFAULT_PAYMENT_METHODS;
  try {
    const parsed = JSON.parse(raw) as PaymentMethodConfig[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PAYMENT_METHODS;
    return parsed
      .map((m, idx) => ({
        id: (m.id === "STRIPE" || m.id === "BANK_TRANSFER" || m.id === "PREPAYMENT"
          ? m.id
          : DEFAULT_PAYMENT_METHODS[idx]?.id || "BANK_TRANSFER") as PaymentMethodId,
        enabled: m.enabled !== false,
        name: String(m.name || "").trim() || "Zahlungsart",
        description: String(m.description || "").trim(),
        sortOrder: Number.isFinite(m.sortOrder) ? m.sortOrder : idx + 1,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  } catch {
    return DEFAULT_PAYMENT_METHODS;
  }
}

export function serializePaymentMethods(methods: PaymentMethodConfig[]): string {
  return JSON.stringify(methods);
}

export function calculateShopPriceFromBase(
  basePrice: number,
  config: Pick<
    ShopPricingConfig,
    "stripeFeePercent" | "stripeFeeFixed" | "roundingStep" | "roundingMode"
  >
): ShopPriceBreakdown {
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    throw new Error("Ungültiger Basispreis.");
  }

  if (basePrice === 0) {
    return {
      basePrice: 0,
      rawStripePrice: 0,
      shopPrice: 0,
      prepaymentDiscount: 0,
      estimatedStripeFee: 0,
    };
  }

  const percentFraction = config.stripeFeePercent / 100;
  if (percentFraction >= 1) {
    throw new Error("Stripe-Prozentsatz muss unter 100 % liegen.");
  }

  const rawStripePrice = (basePrice + config.stripeFeeFixed) / (1 - percentFraction);
  let shopPrice = applyRounding(rawStripePrice, config.roundingStep, config.roundingMode);
  shopPrice = Math.max(shopPrice, basePrice);

  const prepaymentDiscount = roundMoney(shopPrice - basePrice);
  const estimatedStripeFee = roundMoney(shopPrice * percentFraction + config.stripeFeeFixed);

  return {
    basePrice: roundMoney(basePrice),
    rawStripePrice: roundMoney(rawStripePrice),
    shopPrice: roundMoney(shopPrice),
    prepaymentDiscount,
    estimatedStripeFee,
  };
}

function parsePercent(settings: Record<string, string>, key: string, fallback: number): number {
  const val = parseFloat(settings[key] ?? String(fallback));
  return Number.isFinite(val) && val >= 0 ? val : fallback;
}

function parseFixed(settings: Record<string, string>, key: string, fallback: number): number {
  const val = parseFloat(settings[key] ?? String(fallback));
  return Number.isFinite(val) && val >= 0 ? val : fallback;
}

export function parseShopPricingConfig(settings: Record<string, string>): ShopPricingConfig {
  const stepRaw = parseInt(settings.roundingStep || "10", 10);
  const roundingStep = VALID_ROUNDING_STEPS.includes(stepRaw as RoundingStep)
    ? (stepRaw as RoundingStep)
    : DEFAULT_SHOP_PRICING_CONFIG.roundingStep;

  return {
    stripeFeePercent: parsePercent(settings, "stripeFeePercent", DEFAULT_SHOP_PRICING_CONFIG.stripeFeePercent),
    stripeFeeFixed: parseFixed(settings, "stripeFeeFixed", DEFAULT_SHOP_PRICING_CONFIG.stripeFeeFixed),
    premiumCardFeePercent: parsePercent(
      settings,
      "premiumCardFeePercent",
      DEFAULT_SHOP_PRICING_CONFIG.premiumCardFeePercent
    ),
    premiumCardFeeFixed: parseFixed(
      settings,
      "premiumCardFeeFixed",
      DEFAULT_SHOP_PRICING_CONFIG.premiumCardFeeFixed
    ),
    internationalCardFeePercent: parsePercent(
      settings,
      "internationalCardFeePercent",
      DEFAULT_SHOP_PRICING_CONFIG.internationalCardFeePercent
    ),
    internationalCardFeeFixed: parseFixed(
      settings,
      "internationalCardFeeFixed",
      DEFAULT_SHOP_PRICING_CONFIG.internationalCardFeeFixed
    ),
    stripeCurrency: (settings.stripeCurrency || "EUR").trim().toUpperCase() || "EUR",
    roundingStep,
    roundingMode: normalizeRoundingMode(settings.roundingMode),
    defaultPricingModel: normalizePricingModel(settings.defaultPricingModel),
    stripeEnabledAdmin: settings.stripeEnabled !== "false",
    bankTransferEnabled: settings.bankTransferEnabled !== "false",
    prepaymentEnabled: settings.prepaymentEnabled !== "false",
    paymentMethods: parsePaymentMethodsJson(settings.paymentMethodsJson),
  };
}

export function getStripeFeeTiers(config: ShopPricingConfig): StripeFeeTier[] {
  return [
    {
      id: "standard",
      label: "Standardkarte",
      percent: config.stripeFeePercent,
      fixed: config.stripeFeeFixed,
    },
    {
      id: "premium",
      label: "Premiumkarte",
      percent: config.premiumCardFeePercent,
      fixed: config.premiumCardFeeFixed,
    },
    {
      id: "international",
      label: "Internationale Karte",
      percent: config.internationalCardFeePercent,
      fixed: config.internationalCardFeeFixed,
    },
  ];
}

export function hasStripeEnvKey(): boolean {
  return !!process.env.STRIPE_SECRET_KEY?.trim();
}

export function isStripePaymentAvailable(settings: Record<string, string>): boolean {
  const config = parseShopPricingConfig(settings);
  return hasStripeEnvKey() && config.stripeEnabledAdmin;
}

export function resolveCheckoutPaymentMethod(
  requested: unknown,
  settings: Record<string, string>
): "STRIPE" | "BANK_TRANSFER" {
  const config = parseShopPricingConfig(settings);
  const methods = getActivePaymentMethods(config, settings);
  const req = String(requested || "").toUpperCase();

  if (req === "STRIPE" && methods.some((m) => m.id === "STRIPE")) {
    return "STRIPE";
  }
  if (
    (req === "BANK_TRANSFER" || req === "PREPAYMENT") &&
    methods.some((m) => m.id === "BANK_TRANSFER" || m.id === "PREPAYMENT")
  ) {
    return "BANK_TRANSFER";
  }

  if (methods.some((m) => m.id === "STRIPE") && isStripePaymentAvailable(settings)) {
    return "STRIPE";
  }
  return "BANK_TRANSFER";
}

export function getActivePaymentMethods(
  config: ShopPricingConfig = DEFAULT_SHOP_PRICING_CONFIG,
  settings?: Record<string, string>
): PaymentMethodConfig[] {
  const stripeOk = settings ? isStripePaymentAvailable(settings) : hasStripeEnvKey() && config.stripeEnabledAdmin;

  return config.paymentMethods
    .filter((m) => {
      if (!m.enabled) return false;
      if (m.id === "STRIPE") return stripeOk;
      if (m.id === "BANK_TRANSFER") return config.bankTransferEnabled;
      if (m.id === "PREPAYMENT") return config.prepaymentEnabled;
      return false;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function validatePricingSettingsInput(data: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const str = (k: string) => String(data[k] ?? "");

  const percentKeys = [
    "stripeFeePercent",
    "premiumCardFeePercent",
    "internationalCardFeePercent",
  ] as const;
  for (const key of percentKeys) {
    const val = parseFloat(str(key));
    if (str(key) !== "" && (!Number.isFinite(val) || val < 0 || val >= 100)) {
      errors.push(`${PRICING_SETTING_LABELS[key]}: ungültiger Prozentwert (0–99,99).`);
    }
  }

  const fixedKeys = ["stripeFeeFixed", "premiumCardFeeFixed", "internationalCardFeeFixed"] as const;
  for (const key of fixedKeys) {
    const val = parseFloat(str(key));
    if (str(key) !== "" && (!Number.isFinite(val) || val < 0)) {
      errors.push(`${PRICING_SETTING_LABELS[key]}: ungültiger Betrag.`);
    }
  }

  const step = parseInt(str("roundingStep"), 10);
  if (str("roundingStep") !== "" && !VALID_ROUNDING_STEPS.includes(step as RoundingStep)) {
    errors.push("Rundungsschritt muss 1, 5, 10, 25, 50 oder 100 sein.");
  }

  const mode = str("roundingMode");
  if (mode && !["ROUND_UP", "ROUND", "ROUND_DOWN"].includes(mode)) {
    errors.push("Ungültige Rundungsart.");
  }

  const model = str("defaultPricingModel");
  if (model && model !== "STANDARD" && model !== "PREPAYMENT_DISCOUNT") {
    errors.push("Ungültiges Standard-Preismodell.");
  }

  if (data.paymentMethodsJson) {
    try {
      const methods = parsePaymentMethodsJson(String(data.paymentMethodsJson));
      if (methods.some((m) => !m.name.trim())) {
        errors.push("Jede Zahlungsart benötigt einen Namen.");
      }
    } catch {
      errors.push("Zahlungsarten-Konfiguration ist ungültig.");
    }
  }

  return errors;
}

export interface ProductPricingInput {
  pricingModel?: ProductPricingModel | string | null;
  fixedSalePrice?: number | string | null;
  basePrice?: number | string | null;
  price?: number | string | null;
}

export function resolveProductPricing(
  input: ProductPricingInput,
  config: ShopPricingConfig = DEFAULT_SHOP_PRICING_CONFIG
): ResolvedProductPricing {
  const model = normalizePricingModel(input.pricingModel ?? config.defaultPricingModel);

  if (model === "STANDARD") {
    const fixed = parseFloat(String(input.fixedSalePrice ?? input.price ?? "0")) || 0;
    return {
      pricingModel: "STANDARD",
      fixedSalePrice: roundMoney(fixed),
      basePrice: null,
      calculatedStripePrice: null,
      roundedShopPrice: roundMoney(fixed),
      bankTransferDiscount: 0,
      estimatedStripeFee: null,
    };
  }

  const base = parseFloat(String(input.basePrice ?? "0")) || 0;
  const breakdown = calculateShopPriceFromBase(base, config);

  return {
    pricingModel: "PREPAYMENT_DISCOUNT",
    fixedSalePrice: null,
    basePrice: breakdown.basePrice,
    calculatedStripePrice: breakdown.rawStripePrice,
    roundedShopPrice: breakdown.shopPrice,
    bankTransferDiscount: breakdown.prepaymentDiscount,
    estimatedStripeFee: breakdown.estimatedStripeFee,
  };
}

export function getShopDisplayPrice(product: {
  price?: string | number | null;
  roundedShopPrice?: string | number | null;
}): number {
  const raw = product.roundedShopPrice ?? product.price;
  return parseFloat(String(raw || "0")) || 0;
}

export function getUnitPriceForPayment(
  product: {
    pricingModel?: string | null;
    price?: string | number | null;
    basePrice?: string | number | null;
    fixedSalePrice?: string | number | null;
    bankTransferDiscount?: string | number | null;
  },
  paymentMethod: "STRIPE" | "BANK_TRANSFER"
): { shopUnitPrice: number; payableUnitPrice: number; prepaymentDiscount: number } {
  const model = normalizePricingModel(product.pricingModel);
  const shopUnitPrice = getShopDisplayPrice(product);

  if (model === "STANDARD" || paymentMethod === "STRIPE") {
    return { shopUnitPrice, payableUnitPrice: shopUnitPrice, prepaymentDiscount: 0 };
  }

  const discount =
    product.bankTransferDiscount != null && String(product.bankTransferDiscount).trim() !== ""
      ? parseFloat(String(product.bankTransferDiscount))
      : Math.max(0, shopUnitPrice - (parseFloat(String(product.basePrice || "0")) || shopUnitPrice));

  const payableUnitPrice = roundMoney(Math.max(0, shopUnitPrice - discount));
  return { shopUnitPrice, payableUnitPrice, prepaymentDiscount: roundMoney(discount) };
}

export function toProductPriceDbFields(resolved: ResolvedProductPricing): {
  pricingModel: ProductPricingModel;
  price: string;
  fixedSalePrice: string | null;
  basePrice: string | null;
  calculatedStripePrice: string | null;
  roundedShopPrice: string;
  bankTransferDiscount: string;
} {
  return {
    pricingModel: resolved.pricingModel,
    price: resolved.roundedShopPrice.toString(),
    fixedSalePrice: resolved.fixedSalePrice != null ? resolved.fixedSalePrice.toString() : null,
    basePrice: resolved.basePrice != null ? resolved.basePrice.toString() : null,
    calculatedStripePrice:
      resolved.calculatedStripePrice != null ? resolved.calculatedStripePrice.toString() : null,
    roundedShopPrice: resolved.roundedShopPrice.toString(),
    bankTransferDiscount: resolved.bankTransferDiscount.toString(),
  };
}

export function inferLegacyPricingModel(product: {
  pricingModel?: string | null;
  basePrice?: string | number | null;
}): ProductPricingModel {
  if (product.pricingModel) return normalizePricingModel(product.pricingModel);
  if (product.basePrice != null && String(product.basePrice).trim() !== "") {
    return "PREPAYMENT_DISCOUNT";
  }
  return "STANDARD";
}

export function resolveStoredProductPricing(
  product: {
    pricingModel?: string | null;
    price?: string | number | null;
    basePrice?: string | number | null;
    fixedSalePrice?: string | number | null;
    calculatedStripePrice?: string | number | null;
    roundedShopPrice?: string | number | null;
    bankTransferDiscount?: string | number | null;
  },
  config: ShopPricingConfig = DEFAULT_SHOP_PRICING_CONFIG
): ResolvedProductPricing {
  const model = inferLegacyPricingModel(product);

  if (model === "STANDARD") {
    const fixed = parseFloat(String(product.fixedSalePrice ?? product.price ?? "0")) || 0;
    return {
      pricingModel: "STANDARD",
      fixedSalePrice: roundMoney(fixed),
      basePrice: null,
      calculatedStripePrice: null,
      roundedShopPrice: roundMoney(fixed),
      bankTransferDiscount: 0,
      estimatedStripeFee: null,
    };
  }

  return resolveProductPricing(
    { pricingModel: "PREPAYMENT_DISCOUNT", basePrice: product.basePrice ?? undefined },
    config
  );
}

export function formatSettingDisplayValue(key: PricingSettingKey, value: string): string {
  if (key === "roundingMode") {
    return ROUNDING_MODE_LABELS[normalizeRoundingMode(value)] || value;
  }
  if (key === "defaultPricingModel") {
    return PRICING_MODEL_LABELS[normalizePricingModel(value)] || value;
  }
  if (key === "roundingStep") return `${value} €`;
  if (key.endsWith("Percent")) return `${value} %`;
  if (key.endsWith("Enabled") || key === "stripeEnabled") return value === "false" ? "Aus" : "An";
  if (key === "paymentMethodsJson") return "Konfiguration geändert";
  return value;
}

export function pricingSettingsToPayload(config: ShopPricingConfig): Record<string, string> {
  return {
    stripeFeePercent: String(config.stripeFeePercent),
    stripeFeeFixed: String(config.stripeFeeFixed),
    premiumCardFeePercent: String(config.premiumCardFeePercent),
    premiumCardFeeFixed: String(config.premiumCardFeeFixed),
    internationalCardFeePercent: String(config.internationalCardFeePercent),
    internationalCardFeeFixed: String(config.internationalCardFeeFixed),
    stripeCurrency: config.stripeCurrency,
    roundingStep: String(config.roundingStep),
    roundingMode: config.roundingMode,
    defaultPricingModel: config.defaultPricingModel,
    stripeEnabled: config.stripeEnabledAdmin ? "true" : "false",
    bankTransferEnabled: config.bankTransferEnabled ? "true" : "false",
    prepaymentEnabled: config.prepaymentEnabled ? "true" : "false",
    paymentMethodsJson: serializePaymentMethods(config.paymentMethods),
  };
}
