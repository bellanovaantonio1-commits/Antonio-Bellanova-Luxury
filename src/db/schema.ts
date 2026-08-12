import { pgTable, serial, text, timestamp, numeric, integer, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  role: text('role').notNull().default('USER'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  nameDe: text('name_de').notNull(),
  nameEn: text('name_en'),
  slug: text('slug').notNull().unique(),
  parentId: integer('parent_id'),
  descriptionDe: text('description_de'),
  descriptionEn: text('description_en'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const brands = pgTable('brands', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  descriptionDe: text('description_de'),
  descriptionEn: text('description_en'),
  logoUrl: text('logo_url'),
  status: text('status'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  sku: text('sku'),
  brandId: integer('brand_id'),
  model: text('model'),
  categoryId: integer('category_id'),
  type: text('type'), // WATCH, JEWELRY
  condition: text('condition'), // NEW, PRE_OWNED
  year: text('year'),
  descriptionDe: text('description_de'),
  descriptionEn: text('description_en'),
  shortDescriptionDe: text('short_description_de'),
  shortDescriptionEn: text('short_description_en'),
  titleDe: text('title_de'),
  titleEn: text('title_en'),
  conditionDe: text('condition_de'),
  conditionEn: text('condition_en'),
  specificationsDe: text('specifications_de'),
  specificationsEn: text('specifications_en'),
  scopeOfDeliveryDe: text('scope_of_delivery_de'),
  scopeOfDeliveryEn: text('scope_of_delivery_en'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('EUR'),
  status: text('status').default('DRAFT'), // Default to DRAFT as requested
  images: jsonb('images'),
  mainImage: text('main_image'),
  
  // Specifications
  material: text('material'),
  diameter: text('diameter'),
  movement: text('movement'),
  box: text('box'),
  papers: text('papers'),
  specifications: jsonb('specifications'), // Catch-all for extra details

  // Condition Details
  conditionGroup: text('condition_group'), // NEW, UNUSED, PRE_OWNED, VINTAGE
  sourceCondition: text('source_condition'),
  sourceRank: text('source_rank'),
  caseRank: text('case_rank'),
  bandRank: text('band_rank'),
  overallRank: text('overall_rank'),
  conditionRemarks: text('condition_remarks'),
  maintenancePerformed: text('maintenance_performed'),
  maintenanceDescription: text('maintenance_description'),
  dailyRateSeconds: numeric('daily_rate_seconds', { precision: 10, scale: 2 }),
  dailyRateDisplay: text('daily_rate_display'),

  // Source Data
  sourceUrl: text('source_url'),
  sourceProvider: text('source_provider'),
  sourceProductId: text('source_product_id'),
  sourceVariantId: text('source_variant_id'),
  sourceData: jsonb('source_data'),
  purchasePrice: numeric('purchase_price', { precision: 10, scale: 2 }),
  purchasePriceOriginal: numeric('purchase_price_original', { precision: 10, scale: 2 }),
  purchasePriceEur: numeric('purchase_price_eur', { precision: 10, scale: 2 }),
  purchaseCurrency: text('purchase_currency'),
  
  // Calculation
  exchangeRate: numeric('exchange_rate', { precision: 10, scale: 4 }),
  exchangeRateSource: text('exchange_rate_source'),
  exchangeRateFetchedAt: timestamp('exchange_rate_fetched_at'),
  landedCost: numeric('landed_cost', { precision: 10, scale: 2 }),
  pricingMode: text('pricing_mode').default('MARGIN'), // MARGIN, MANUAL
  targetMargin: numeric('target_margin', { precision: 5, scale: 2 }),
  targetMarginPercent: numeric('target_margin_percent', { precision: 5, scale: 2 }),
  calculatedNetSellingPrice: numeric('calculated_net_selling_price', { precision: 10, scale: 2 }),
  netSalePrice: numeric('net_sale_price', { precision: 10, scale: 2 }),
  taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }),
  calculatedGrossSellingPrice: numeric('calculated_gross_selling_price', { precision: 10, scale: 2 }),
  grossSalePrice: numeric('gross_sale_price', { precision: 10, scale: 2 }),
  manualGrossSellingPrice: numeric('manual_gross_selling_price', { precision: 10, scale: 2 }),
  manualGrossSalePrice: numeric('manual_gross_sale_price', { precision: 10, scale: 2 }),
  actualProfit: numeric('actual_profit', { precision: 10, scale: 2 }),
  profitEur: numeric('profit_eur', { precision: 10, scale: 2 }),
  actualMargin: numeric('actual_margin', { precision: 5, scale: 2 }),
  effectiveMarginPercent: numeric('effective_margin_percent', { precision: 5, scale: 2 }),
  markup: numeric('markup', { precision: 5, scale: 2 }),
  importVat: numeric('import_vat', { precision: 10, scale: 2 }),
  importVatEur: numeric('import_vat_eur', { precision: 10, scale: 2 }),
  importVatType: text('import_vat_type'),
  isInputTaxDeductible: text('is_input_tax_deductible').default('true'), // Saved as string "true"/"false" for simplicity in some setups, but boolean is better if supported
  internationalShipping: numeric('international_shipping', { precision: 10, scale: 2 }),
  customsBroker: numeric('customs_broker', { precision: 10, scale: 2 }),
  customsBrokerFee: numeric('customs_broker_fee', { precision: 10, scale: 2 }),
  customsClearance: numeric('customs_clearance', { precision: 10, scale: 2 }),
  customsClearanceFee: numeric('customs_clearance_fee', { precision: 10, scale: 2 }),
  handlingCost: numeric('handling_cost', { precision: 10, scale: 2 }),
  otherCapitalizableCosts: numeric('other_capitalizable_costs', { precision: 10, scale: 2 }),
  otherImportCosts: numeric('other_import_costs', { precision: 10, scale: 2 }),
  customsRate: numeric('customs_rate', { precision: 5, scale: 2 }),
  customsRatePercent: numeric('customs_rate_percent', { precision: 5, scale: 2 }),
  customsAmount: numeric('customs_amount', { precision: 10, scale: 2 }),
  customsAmountEur: numeric('customs_amount_eur', { precision: 10, scale: 2 }),
  manualCustomsAmountEur: numeric('manual_customs_amount_eur', { precision: 10, scale: 2 }),
  margin: numeric('margin', { precision: 5, scale: 2 }),
  taxType: text('tax_type'),
  taxTreatment: text('tax_treatment'),
  taxRatePercent: numeric('tax_rate_percent', { precision: 5, scale: 2 }),
  shippingCost: numeric('shipping_cost', { precision: 10, scale: 2 }),
  insuranceCost: numeric('insurance_cost', { precision: 10, scale: 2 }),
  authenticationCost: numeric('authentication_cost', { precision: 10, scale: 2 }),
  refurbishmentCost: numeric('refurbishment_cost', { precision: 10, scale: 2 }),
  hsCode: text('hs_code'),
  originCountry: text('origin_country'),
  dispatchCountry: text('dispatch_country'),
  destinationCountry: text('destination_country'),

  // SEO
  seoTitleDe: text('seo_title_de'),
  seoDescriptionDe: text('seo_description_de'),
  seoTitleEn: text('seo_title_en'),
  seoDescriptionEn: text('seo_description_en'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  publishedAt: timestamp('published_at'),
  published: text('published').default('false'), // Using text 'true'/'false' to match other boolean-like fields in this project
  stock: integer('stock').default(1),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').unique(),
  userId: text('user_id').notNull(),
  status: text('status').notNull().default('PENDING'),
  paymentStatus: text('payment_status').default('PENDING'),
  paymentMethod: text('payment_method').default('BANK_TRANSFER'),
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
  shippingAddress: jsonb('shipping_address'),
  billingAddress: jsonb('billing_address'),
  language: text('language').default('de'),
  customerName: text('customer_name'),
  companyName: text('company_name'),
  customerVatId: text('customer_vat_id'),
  shippingCost: numeric('shipping_cost', { precision: 10, scale: 2 }).default('0'),
  discountAmount: numeric('discount_amount', { precision: 10, scale: 2 }).default('0'),
  subtotalNet: numeric('subtotal_net', { precision: 10, scale: 2 }),
  taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }),
  taxRatePercent: numeric('tax_rate_percent', { precision: 5, scale: 2 }).default('19'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id),
  productId: integer('product_id').references(() => products.id),
  productName: text('product_name'),
  productImage: text('product_image'),
  quantity: integer('quantity').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  productSku: text('product_sku'),
  unitPriceGross: numeric('unit_price_gross', { precision: 10, scale: 2 }),
  unitPriceNet: numeric('unit_price_net', { precision: 10, scale: 2 }),
  lineTaxAmount: numeric('line_tax_amount', { precision: 10, scale: 2 }),
  taxRatePercent: numeric('tax_rate_percent', { precision: 5, scale: 2 }),
  taxTreatment: text('tax_treatment'),
});

export const shopSettings = pgTable('shop_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const inquiries = pgTable('inquiries', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(),
  status: text('status').default('NEW'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email').notNull(),
  phone: text('phone'),
  subject: text('subject'),
  message: text('message'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const wishlistItems = pgTable('wishlist_items', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  productId: integer('product_id').references(() => products.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  status: text('status').default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const invoiceSequences = pgTable('invoice_sequences', {
  year: integer('year').primaryKey(),
  lastNumber: integer('last_number').notNull().default(0),
});

export const creditNoteSequences = pgTable('credit_note_sequences', {
  year: integer('year').primaryKey(),
  lastNumber: integer('last_number').notNull().default(0),
});

export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  invoiceType: text('invoice_type').notNull().default('INVOICE'),
  invoiceStatus: text('invoice_status').notNull().default('ISSUED'),
  orderId: integer('order_id').notNull().references(() => orders.id),
  userId: text('user_id').notNull(),
  language: text('language').notNull().default('de'),
  customerEmail: text('customer_email'),
  customerName: text('customer_name'),
  companyName: text('company_name'),
  customerVatId: text('customer_vat_id'),
  billingAddress: jsonb('billing_address'),
  shippingAddress: jsonb('shipping_address'),
  lineItems: jsonb('line_items').notNull(),
  sellerSnapshot: jsonb('seller_snapshot').notNull(),
  subtotalNet: numeric('subtotal_net', { precision: 10, scale: 2 }).notNull(),
  taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  shippingCost: numeric('shipping_cost', { precision: 10, scale: 2 }).notNull().default('0'),
  discountAmount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  totalGross: numeric('total_gross', { precision: 10, scale: 2 }).notNull(),
  taxRatePercent: numeric('tax_rate_percent', { precision: 5, scale: 2 }).default('19'),
  taxNote: text('tax_note'),
  currency: text('currency').notNull().default('EUR'),
  paymentMethod: text('payment_method'),
  paymentStatus: text('payment_status'),
  orderNumber: text('order_number'),
  eInvoiceFormat: text('e_invoice_format'),
  eInvoiceMetadata: jsonb('e_invoice_metadata'),
  cancelledAt: timestamp('cancelled_at'),
  cancellationReason: text('cancellation_reason'),
  originalInvoiceId: integer('original_invoice_id'),
  issuedAt: timestamp('issued_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});
