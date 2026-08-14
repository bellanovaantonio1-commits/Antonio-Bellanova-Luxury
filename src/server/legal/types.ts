export type LegalDocumentKey =
  | "impressum"
  | "privacy"
  | "terms"
  | "withdrawal"
  | "withdrawal_form"
  | "shipping"
  | "payment";

export type LegalLanguage = "de" | "en";

export interface LegalDocumentRecord {
  id: number;
  documentKey: LegalDocumentKey;
  language: LegalLanguage;
  version: number;
  title: string;
  contentHtml: string;
  renderedHtml?: string;
  changeNote: string | null;
  adminUid: string | null;
  adminName: string | null;
  adminEmail: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface LegalAcceptanceSnapshot {
  acceptedAt: string;
  termsVersion: number;
  termsLanguage: LegalLanguage;
  privacyVersion: number;
  privacyLanguage: LegalLanguage;
  withdrawalAcknowledged: boolean;
}

export const LEGAL_DOCUMENT_KEYS: LegalDocumentKey[] = [
  "impressum",
  "privacy",
  "terms",
  "withdrawal",
  "withdrawal_form",
  "shipping",
  "payment",
];

export const LEGAL_DOCUMENT_LABELS: Record<LegalDocumentKey, { de: string; en: string }> = {
  impressum: { de: "Impressum", en: "Legal Notice" },
  privacy: { de: "Datenschutzerklärung", en: "Privacy Policy" },
  terms: { de: "Allgemeine Geschäftsbedingungen", en: "Terms & Conditions" },
  withdrawal: { de: "Widerrufsbelehrung", en: "Cancellation / Withdrawal Policy" },
  withdrawal_form: { de: "Muster-Widerrufsformular", en: "Withdrawal Form" },
  shipping: { de: "Versand & Lieferung", en: "Shipping & Delivery" },
  payment: { de: "Zahlungsarten", en: "Payment Methods" },
};

export const COMPANY_FIELD_KEYS = [
  "legalCompanyName",
  "shopName",
  "shopBrandName",
  "legalForm",
  "authorizedRepresentative",
  "contactAddress",
  "contactEmail",
  "contactPhone",
  "vatId",
  "taxNumber",
  "tradeRegisterCourt",
  "tradeRegisterNumber",
  "economicId",
  "supervisoryAuthority",
  "contentResponsible",
  "bankName",
  "bankIban",
  "bankBic",
  "bankAccountHolder",
  "paymentInstructionsDe",
  "paymentInstructionsEn",
] as const;

export type CompanyFieldKey = (typeof COMPANY_FIELD_KEYS)[number];

export const RECOMMENDED_COMPANY_FIELDS: CompanyFieldKey[] = [
  "legalCompanyName",
  "contactAddress",
  "contactEmail",
  "contactPhone",
  "authorizedRepresentative",
];

export const OPTIONAL_COMPANY_FIELDS: CompanyFieldKey[] = [
  "vatId",
  "taxNumber",
  "tradeRegisterCourt",
  "tradeRegisterNumber",
  "economicId",
  "supervisoryAuthority",
  "legalForm",
];
