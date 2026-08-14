import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { pricingSettingsAudit, shopSettings } from "../db/schema.ts";
import { DEFAULT_SHOP_SETTINGS } from "../config/shopDefaults.ts";
import {
  formatSettingDisplayValue,
  getActivePaymentMethods,
  getStripeFeeTiers,
  hasStripeEnvKey,
  isStripePaymentAvailable,
  parseShopPricingConfig,
  PRICING_SETTING_KEYS,
  PRICING_SETTING_LABELS,
  serializePaymentMethods,
  parsePaymentMethodsJson,
  type PricingSettingKey,
  validatePricingSettingsInput,
} from "../lib/shopPricing.ts";
import { ensureDefaultSettings, getSettingsMap, coerceShopSettingString, coerceShopSettingForDb } from "./settings.ts";

export async function getPricingPaymentsPayload() {
  await ensureDefaultSettings();
  const settings = await getSettingsMap();
  const str = (key: keyof typeof DEFAULT_SHOP_SETTINGS | string) =>
    coerceShopSettingString(
      settings[key],
      String(DEFAULT_SHOP_SETTINGS[key as keyof typeof DEFAULT_SHOP_SETTINGS] ?? "")
    );
  const config = parseShopPricingConfig(
    Object.fromEntries(Object.keys(settings).map((k) => [k, str(k)])) as Record<string, string>
  );
  const paymentMethodsNormalized = serializePaymentMethods(
    parsePaymentMethodsJson(settings.paymentMethodsJson)
  );

  return {
    settings: {
      stripeFeePercent: str("stripeFeePercent"),
      stripeFeeFixed: str("stripeFeeFixed"),
      premiumCardFeePercent: str("premiumCardFeePercent"),
      premiumCardFeeFixed: str("premiumCardFeeFixed"),
      internationalCardFeePercent: str("internationalCardFeePercent"),
      internationalCardFeeFixed: str("internationalCardFeeFixed"),
      stripeCurrency: str("stripeCurrency"),
      roundingStep: str("roundingStep"),
      roundingMode: str("roundingMode"),
      defaultPricingModel: str("defaultPricingModel"),
      stripeEnabled: str("stripeEnabled"),
      bankTransferEnabled: str("bankTransferEnabled"),
      prepaymentEnabled: str("prepaymentEnabled"),
      paymentMethodsJson: paymentMethodsNormalized,
    },
    config,
    stripeFeeTiers: getStripeFeeTiers(config),
    stripeEnvConfigured: hasStripeEnvKey(),
    stripeAvailable: isStripePaymentAvailable(
      Object.fromEntries(Object.keys(settings).map((k) => [k, str(k)])) as Record<string, string>
    ),
    paymentMethods: getActivePaymentMethods(
      config,
      Object.fromEntries(Object.keys(settings).map((k) => [k, str(k)])) as Record<string, string>
    ),
  };
}

export async function savePricingPaymentsSettings(
  data: Record<string, unknown>,
  admin: { uid: string; name?: string | null; email?: string | null }
) {
  const errors = validatePricingSettingsInput(data);
  if (errors.length) {
    throw new Error(errors.join(" "));
  }

  const oldSettings = await getSettingsMap();
  const oldStr = Object.fromEntries(
    Object.entries(oldSettings).map(([k, v]) => [
      k,
      coerceShopSettingString(v, String(DEFAULT_SHOP_SETTINGS[k as keyof typeof DEFAULT_SHOP_SETTINGS] ?? "")),
    ])
  );

  const updates: Record<string, string> = {};
  for (const key of PRICING_SETTING_KEYS) {
    if (data[key] !== undefined) {
      updates[key] =
        key === "paymentMethodsJson"
          ? serializePaymentMethods(parsePaymentMethodsJson(data[key]))
          : String(data[key]);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    const dbValue = coerceShopSettingForDb(key, value);
    const existing = await db.select().from(shopSettings).where(eq(shopSettings.key, key)).limit(1);
    if (existing.length > 0) {
      await db.update(shopSettings).set({ value: dbValue, updatedAt: new Date() }).where(eq(shopSettings.key, key));
    } else {
      await db.insert(shopSettings).values({ key, value: dbValue });
    }
  }

  await logPricingSettingChanges(oldStr, { ...oldStr, ...updates }, admin);

  return getPricingPaymentsPayload();
}

async function logPricingSettingChanges(
  oldSettings: Record<string, string>,
  newSettings: Record<string, string>,
  admin: { uid: string; name?: string | null; email?: string | null }
) {
  for (const key of PRICING_SETTING_KEYS) {
    const oldVal = oldSettings[key] ?? String(DEFAULT_SHOP_SETTINGS[key as keyof typeof DEFAULT_SHOP_SETTINGS] ?? "");
    const newVal = newSettings[key] ?? oldVal;
    if (oldVal === newVal) continue;

    await db.insert(pricingSettingsAudit).values({
      adminUid: admin.uid,
      adminName: admin.name || null,
      adminEmail: admin.email || null,
      settingKey: key,
      settingLabel: PRICING_SETTING_LABELS[key as PricingSettingKey],
      oldValue: formatSettingDisplayValue(key as PricingSettingKey, oldVal),
      newValue: formatSettingDisplayValue(key as PricingSettingKey, newVal),
    });
  }
}

export async function getPricingAuditLog(limit = 100) {
  const rows = await db
    .select()
    .from(pricingSettingsAudit)
    .orderBy(desc(pricingSettingsAudit.changedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    changedAt: r.changedAt,
    adminUid: r.adminUid,
    adminName: r.adminName,
    adminEmail: r.adminEmail,
    settingKey: r.settingKey,
    settingLabel: r.settingLabel,
    oldValue: r.oldValue,
    newValue: r.newValue,
  }));
}

export function buildCheckoutPaymentPayload(settings: Record<string, unknown>) {
  const strSettings = Object.fromEntries(
    Object.entries(settings).map(([k, v]) => [k, coerceShopSettingString(v, "")])
  ) as Record<string, string>;
  const config = parseShopPricingConfig(strSettings);
  const paymentMethods = getActivePaymentMethods(config, strSettings);

  return {
    stripeEnabled: isStripePaymentAvailable(strSettings),
    stripeEnvConfigured: hasStripeEnvKey(),
    bankTransferEnabled: config.bankTransferEnabled && paymentMethods.some((m) => m.id === "BANK_TRANSFER"),
    prepaymentEnabled: config.prepaymentEnabled && paymentMethods.some((m) => m.id === "PREPAYMENT"),
    paymentMethods: paymentMethods.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      sortOrder: m.sortOrder,
    })),
  };
}
