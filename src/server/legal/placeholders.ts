import type { LegalLanguage } from "./types.ts";

const MISSING_DE = '<span class="legal-missing">Angabe erforderlich</span>';
const MISSING_EN = '<span class="legal-missing">Information required</span>';

export function formatAddressHtml(address: string): string {
  return String(address || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join("<br/>");
}

export function displaySetting(value: unknown, lang: LegalLanguage): string {
  const v = String(value ?? "").trim();
  if (v) return escapeHtml(v);
  return lang === "de" ? MISSING_DE : MISSING_EN;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPlaceholderMap(
  settings: Record<string, unknown>,
  lang: LegalLanguage
): Record<string, string> {
  const rep =
    String(settings.authorizedRepresentative || settings.bankAccountHolder || "").trim() ||
    (lang === "de" ? "Angabe erforderlich" : "Information required");
  const contentResp =
    String(settings.contentResponsible || settings.authorizedRepresentative || settings.bankAccountHolder || "").trim() ||
    (lang === "de" ? "Angabe erforderlich" : "Information required");

  return {
    legalCompanyName: displaySetting(settings.legalCompanyName || settings.shopName, lang),
    shopName: displaySetting(settings.shopName, lang),
    shopBrandName: displaySetting(settings.shopBrandName, lang),
    legalForm: displaySetting(settings.legalForm, lang),
    authorizedRepresentative: rep.includes("erforderlich") || rep.includes("required") ? (lang === "de" ? MISSING_DE : MISSING_EN) : escapeHtml(rep),
    contactAddress: formatAddressHtml(String(settings.contactAddress || "")) || (lang === "de" ? MISSING_DE : MISSING_EN),
    contactEmail: displaySetting(settings.contactEmail, lang),
    contactPhone: displaySetting(settings.contactPhone, lang),
    vatId: displaySetting(settings.vatId, lang),
    taxNumber: displaySetting(settings.taxNumber, lang),
    tradeRegisterCourt: displaySetting(settings.tradeRegisterCourt, lang),
    tradeRegisterNumber: displaySetting(settings.tradeRegisterNumber, lang),
    economicId: displaySetting(settings.economicId, lang),
    supervisoryAuthority: displaySetting(settings.supervisoryAuthority, lang),
    contentResponsible: contentResp.includes("erforderlich") || contentResp.includes("required") ? (lang === "de" ? MISSING_DE : MISSING_EN) : escapeHtml(contentResp),
    bankName: displaySetting(settings.bankName, lang),
    bankIban: displaySetting(settings.bankIban, lang),
    bankBic: displaySetting(settings.bankBic, lang),
    bankAccountHolder: displaySetting(settings.bankAccountHolder, lang),
    paymentInstructions:
      lang === "en"
        ? escapeHtml(String(settings.paymentInstructionsEn || settings.paymentInstructionsDe || ""))
        : escapeHtml(String(settings.paymentInstructionsDe || "")),
    shippingCostDe: escapeHtml(String(settings.shippingCostDe ?? "0")),
    shippingCostEu: escapeHtml(String(settings.shippingCostEu ?? "29")),
    shippingCostWorld: escapeHtml(String(settings.shippingCostWorld ?? "79")),
    shippingFreeFrom: escapeHtml(String(settings.shippingFreeFrom ?? "500")),
    pickupNoteDe: escapeHtml(String(settings.pickupNoteDe || "")),
    pickupNoteEn: escapeHtml(String(settings.pickupNoteEn || "")),
    marginTaxNoteDe: escapeHtml(String(settings.marginTaxNoteDe || "")),
    marginTaxNoteEn: escapeHtml(String(settings.marginTaxNoteEn || "")),
    appUrl: escapeHtml(String(process.env.APP_URL || "").replace(/\/$/, "")),
  };
}

export function renderLegalTemplate(
  template: string,
  settings: Record<string, unknown>,
  lang: LegalLanguage
): string {
  const map = buildPlaceholderMap(settings, lang);
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => map[key] ?? "");
}

export function getMissingCompanyFields(settings: Record<string, unknown>): string[] {
  const missing: string[] = [];
  for (const key of ["legalCompanyName", "contactAddress", "contactEmail", "contactPhone"] as const) {
    if (!String(settings[key] ?? "").trim()) missing.push(key);
  }
  if (!String(settings.vatId ?? "").trim() && !String(settings.taxNumber ?? "").trim()) {
    missing.push("vatId_or_taxNumber");
  }
  if (!String(settings.authorizedRepresentative ?? settings.bankAccountHolder ?? "").trim()) {
    missing.push("authorizedRepresentative");
  }
  return missing;
}
