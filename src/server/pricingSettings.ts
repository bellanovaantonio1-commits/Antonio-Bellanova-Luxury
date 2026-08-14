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
  type PricingSettingKey,
  validatePricingSettingsInput,
} from "../lib/shopPricing.ts";
import { ensureDefaultSettings, getSettingsMap } from "./settings.ts";

export async function getPricingPaymentsPayload() {
  await ensureDefaultSettings();
  const settings = await getSettingsMap();
  const strSettings = Object.fromEntries(
    Object.entries(settings).map(([k, v]) => [k, String(v ?? "")])
  );
  const config = parseShopPricingConfig(strSettings);

  return {
    settings: {
      stripeFeePercent: strSettings.stripeFeePercent,
      stripeFeeFixed: strSettings.stripeFeeFixed,
      premiumCardFeePercent: strSettings.premiumCardFeePercent,
      premiumCardFeeFixed: strSettings.premiumCardFeeFixed,
      internationalCardFeePercent: strSettings.internationalCardFeePercent,
      internationalCardFeeFixed: strSettings.internationalCardFeeFixed,
      stripeCurrency: strSettings.stripeCurrency,
      roundingStep: strSettings.roundingStep,
      roundingMode: strSettings.roundingMode,
      defaultPricingModel: strSettings.defaultPricingModel,
      stripeEnabled: strSettings.stripeEnabled,
      bankTransferEnabled: strSettings.bankTransferEnabled,
      prepaymentEnabled: strSettings.prepaymentEnabled,
      paymentMethodsJson: strSettings.paymentMethodsJson,
    },
    config,
    stripeFeeTiers: getStripeFeeTiers(config),
    stripeEnvConfigured: hasStripeEnvKey(),
    stripeAvailable: isStripePaymentAvailable(strSettings),
    paymentMethods: getActivePaymentMethods(config, strSettings),
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
      String(v ?? DEFAULT_SHOP_SETTINGS[k as keyof typeof DEFAULT_SHOP_SETTINGS] ?? ""),
    ])
  );

  const updates: Record<string, string> = {};
  for (const key of PRICING_SETTING_KEYS) {
    if (data[key] !== undefined) {
      updates[key] = String(data[key]);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    const existing = await db.select().from(shopSettings).where(eq(shopSettings.key, key)).limit(1);
    if (existing.length > 0) {
      await db.update(shopSettings).set({ value, updatedAt: new Date() }).where(eq(shopSettings.key, key));
    } else {
      await db.insert(shopSettings).values({ key, value });
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
    Object.entries(settings).map(([k, v]) => [k, String(v ?? "")])
  );
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
