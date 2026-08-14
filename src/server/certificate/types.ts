export type CertificateStatus = "DRAFT" | "ACTIVE" | "CANCELLED" | "REPLACED";

export interface CertificateSnapshot {
  brand: string;
  model: string;
  referenceNumber: string;
  serialNumber: string;
  category: string;
  movement: string;
  caseMaterial: string;
  caseSize: string;
  dial: string;
  bracelet: string;
  clasp: string;
  waterResistance: string;
  year: string;
  conditionPublicDe: string;
  conditionPublicEn: string;
  scopeOfDeliveryDe: string;
  scopeOfDeliveryEn: string;
  box: string;
  papers: string;
  mainImage: string;
  productName: string;
  productSku: string;
}

export interface CertificateRecord {
  id: number;
  certificateNumber: string;
  verificationCode: string;
  productId: number;
  orderId: number | null;
  orderItemId: number | null;
  customerId: string | null;
  status: CertificateStatus;
  language: "de" | "en";
  issuedAt: string | null;
  replacedById: number | null;
  snapshotData: CertificateSnapshot;
  createdAt: string;
  updatedAt: string;
  productSlug?: string | null;
  productName?: string | null;
  orderNumber?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
}

export interface PublicCertificateVerification {
  valid: boolean;
  certificateNumber: string;
  status: CertificateStatus;
  statusLabelDe: string;
  statusLabelEn: string;
  brand: string;
  model: string;
  referenceNumber: string;
  issuedAt: string | null;
  messageDe: string;
  messageEn: string;
}

export const CERTIFICATE_STATUS_LABELS: Record<
  CertificateStatus,
  { de: string; en: string }
> = {
  DRAFT: { de: "Entwurf", en: "Draft" },
  ACTIVE: { de: "Gültig", en: "Valid" },
  CANCELLED: { de: "Storniert", en: "Cancelled" },
  REPLACED: { de: "Ersetzt", en: "Replaced" },
};

export const COMPANY = {
  name: "Juwelen & Schmuckatelier Antonio Bellanova",
  owner: "Antonio Bellanova",
  street: "Ahornstraße 8",
  city: "50765 Köln",
  country: "Deutschland",
  countryEn: "Germany",
};

export const AUTHENTICITY_STATEMENT = {
  de: "Dieses Zertifikat bestätigt, dass das oben bezeichnete Produkt nach den im Rahmen unseres Verkaufsprozesses durchgeführten Prüfungen und anhand der vorliegenden Produktdaten als authentisches Produkt geführt wird.",
  en: "This certificate confirms that the product described above is recorded as an authentic product based on the inspections carried out within our sales process and the product data on file.",
};
