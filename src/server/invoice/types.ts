export type Address = {
  firstName?: string;
  lastName?: string;
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
};

export type InvoiceLineItem = {
  sku: string;
  name: string;
  quantity: number;
  unitPriceGross: number;
  unitPriceNet: number;
  lineTotalGross: number;
  lineTotalNet: number;
  taxAmount: number;
  taxRatePercent: number;
  taxTreatment?: string;
};

export type SellerSnapshot = {
  legalCompanyName: string;
  shopBrandName: string;
  address: string;
  email: string;
  phone: string;
  vatId: string;
  taxNumber: string;
  bankName: string;
  bankIban: string;
  bankBic: string;
  bankAccountHolder: string;
};

export type InvoiceRecord = {
  id: number;
  invoiceNumber: string;
  orderId: number;
  orderNumber: string;
  userId: string;
  language: "de" | "en";
  customerEmail: string;
  customerName: string;
  companyName?: string;
  customerVatId?: string;
  billingAddress?: Address | null;
  shippingAddress?: Address | null;
  lineItems: InvoiceLineItem[];
  seller: SellerSnapshot;
  subtotalNet: number;
  taxAmount: number;
  shippingCost: number;
  discountAmount: number;
  totalGross: number;
  taxRatePercent: number;
  taxNote?: string;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  issuedAt: Date;
};

export const REQUIRED_INVOICE_SETTING_KEYS = [
  "legalCompanyName",
  "contactAddress",
  "contactEmail",
  "bankName",
  "bankIban",
  "bankBic",
  "bankAccountHolder",
] as const;

export const RECOMMENDED_INVOICE_SETTING_KEYS = ["vatId", "taxNumber"] as const;
