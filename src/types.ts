export type UserRole = "CUSTOMER" | "SUPPORT" | "SALES" | "WAREHOUSE" | "ACCOUNTING" | "MANAGER" | "ADMIN" | "SUPER_ADMIN";

export interface Brand {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string;
  descriptionDe?: string;
  descriptionEn?: string;
}

export interface Category {
  id: number;
  nameDe: string;
  nameEn: string;
  slug: string;
}

export interface Product {
  id: string | number;
  name: string;
  slug: string;
  sku: string;
  brandId?: number;
  categoryId?: number;
  brand?: Brand;
  category?: Category;
  type: string;
  condition: string;
  year?: string;
  descriptionDe?: string;
  descriptionEn?: string;
  shortDescriptionDe?: string;
  shortDescriptionEn?: string;
  titleDe?: string;
  titleEn?: string;
  conditionDe?: string;
  conditionEn?: string;
  specificationsDe?: string;
  specificationsEn?: string;
  scopeOfDeliveryDe?: string;
  scopeOfDeliveryEn?: string;
  // Calculation & Pricing
  purchasePriceOriginal?: number;
  purchaseCurrency?: string;
  exchangeRate?: number;
  purchasePriceEur?: number;
  shippingCost?: number;
  insuranceCost?: number;
  originCountry?: string;
  dispatchCountry?: string;
  destinationCountry?: string;
  productCategory?: string;
  hsCode?: string;
  customsRatePercent?: number;
  customsAmountEur?: number;
  customsBrokerFee?: number;
  customsClearanceFee?: number;
  otherImportCosts?: number;
  landedCost?: number;
  importVatEur?: number;
  isInputTaxDeductible?: boolean;
  taxTreatment?: string; // "REGULAR", "MARGIN", "CHECK"
  targetMarginPercent?: number;
  netSalePrice?: number;
  grossSalePrice?: number;
  profitEur?: number;
  effectiveMarginPercent?: number;
  
  // Legacy fields (kept for compatibility)
  price: string;
  basePrice?: string | number | null;
  pricingModel?: string | null;
  fixedSalePrice?: string | number | null;
  calculatedStripePrice?: string | number | null;
  roundedShopPrice?: string | number | null;
  bankTransferDiscount?: string | number | null;
  currency: string;
  status: string;
  pricing?: {
    shopPrice: number;
    bankTransferPrice: number;
    prepaymentDiscount: number;
    showBankTransferPrice: boolean;
    currency: string;
  };
  published?: boolean;
  publishedAt?: string | Date;
  stock?: number;
  featuredInHero?: boolean;
  featuredInSport?: boolean;
  featuredInVintage?: boolean;
  featuredInUnder5000?: boolean;
  images: string[];
  mainImage?: string;
  
  // Specs
  material?: string;
  diameter?: string;
  movement?: string;
  box?: string;
  papers?: string;
  specifications?: any;

  // Source
  sourceUrl?: string;
  sourceProvider?: string;
  sourceData?: any;
  overallRank?: string;

  // UI Helper fields
  brandName?: string;
  categoryName?: string;

  // SEO
  seoTitleDe?: string;
  seoDescriptionDe?: string;
  seoTitleEn?: string;
  seoDescriptionEn?: string;
}

export interface WatchDetails {
  reference?: string;
  year?: string;
  caseMaterial?: string;
  diameter?: string;
  movement?: string;
  dial?: string;
  box?: boolean;
  papers?: boolean;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export type OrderStatus = "PENDING" | "PROCESSING" | "SHIPPED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";

export interface Order {
  id: number;
  userId: string;
  orderNumber?: string;
  items?: OrderItem[];
  total: string;
  totalAmount?: number;
  status: OrderStatus;
  trackingNumber?: string;
  carrier?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
}
