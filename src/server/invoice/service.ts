import { eq, desc } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { createPgPool } from "../../db/pool.ts";
import { orders, orderItems, products, users, invoices } from "../../db/schema.ts";
import { allocateInvoiceNumber } from "./numbering.ts";
import { buildSellerSnapshot, assertInvoiceSettingsReady } from "./seller.ts";
import { generateInvoicePdf } from "./pdf.ts";
import type { Address, InvoiceLineItem, InvoiceRecord } from "./types.ts";

const pool = createPgPool();

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function computeLineTax(gross: number, taxTreatment: string | null | undefined, taxRatePercent: number) {
  if (taxTreatment === "MARGIN") {
    return { net: gross, tax: 0, rate: 0 };
  }
  const rate = taxRatePercent || 19;
  const net = round2(gross / (1 + rate / 100));
  const tax = round2(gross - net);
  return { net, tax, rate };
}

function rowToInvoiceRecord(row: typeof invoices.$inferSelect): InvoiceRecord {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    orderId: row.orderId,
    orderNumber: row.orderNumber || "",
    userId: row.userId,
    language: row.language === "en" ? "en" : "de",
    customerEmail: row.customerEmail || "",
    customerName: row.customerName || "",
    companyName: row.companyName || undefined,
    customerVatId: row.customerVatId || undefined,
    billingAddress: row.billingAddress as Address | null,
    shippingAddress: row.shippingAddress as Address | null,
    lineItems: row.lineItems as InvoiceLineItem[],
    seller: row.sellerSnapshot as InvoiceRecord["seller"],
    subtotalNet: parseFloat(row.subtotalNet),
    taxAmount: parseFloat(row.taxAmount || "0"),
    shippingCost: parseFloat(row.shippingCost || "0"),
    discountAmount: parseFloat(row.discountAmount || "0"),
    totalGross: parseFloat(row.totalGross),
    taxRatePercent: parseFloat(row.taxRatePercent || "19"),
    taxNote: row.taxNote || undefined,
    currency: row.currency || "EUR",
    paymentMethod: row.paymentMethod || "BANK_TRANSFER",
    paymentStatus: row.paymentStatus || "PENDING",
    issuedAt: row.issuedAt ? new Date(row.issuedAt) : new Date(),
  };
}

export async function getInvoiceByOrderId(orderId: number) {
  const [row] = await db.select().from(invoices).where(eq(invoices.orderId, orderId)).limit(1);
  return row ? rowToInvoiceRecord(row) : null;
}

export async function getInvoiceById(id: number) {
  const [row] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return row ? rowToInvoiceRecord(row) : null;
}

export async function getInvoicePdfBufferByOrderId(orderId: number): Promise<Buffer | null> {
  const invoice = await getInvoiceByOrderId(orderId);
  if (!invoice) return null;
  return generateInvoicePdf(invoice);
}

export async function getInvoicePdfBufferById(id: number): Promise<Buffer | null> {
  const invoice = await getInvoiceById(id);
  if (!invoice) return null;
  return generateInvoicePdf(invoice);
}

export async function createInvoiceForOrder(
  orderId: number,
  settings: Record<string, unknown>
): Promise<InvoiceRecord> {
  const existing = await getInvoiceByOrderId(orderId);
  if (existing) return existing;

  assertInvoiceSettingsReady(settings);

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Bestellung nicht gefunden.");

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  if (!items.length) throw new Error("Bestellung enthält keine Positionen.");

  const [user] = await db.select().from(users).where(eq(users.uid, order.userId)).limit(1);
  const seller = buildSellerSnapshot(settings);

  const lineItems: InvoiceLineItem[] = items.map((item) => {
    const gross = parseFloat(item.unitPriceGross || item.price);
    const qty = item.quantity;
    const lineGross = round2(gross * qty);
    const taxTreatment = item.taxTreatment || undefined;
    const rate = parseFloat(item.taxRatePercent || "19");
    const { net, tax } = computeLineTax(lineGross, taxTreatment, rate);
    return {
      sku: item.productSku || "",
      name: item.productName || "Produkt",
      quantity: qty,
      unitPriceGross: gross,
      unitPriceNet: round2(net / qty),
      lineTotalGross: lineGross,
      lineTotalNet: net,
      taxAmount: tax,
      taxRatePercent: taxTreatment === "MARGIN" ? 0 : rate,
      taxTreatment,
    };
  });

  const hasMargin = lineItems.some((l) => l.taxTreatment === "MARGIN");
  const subtotalNet = round2(lineItems.reduce((s, l) => s + l.lineTotalNet, 0));
  const taxAmount = round2(lineItems.reduce((s, l) => s + l.taxAmount, 0));
  const shippingCost = parseFloat(order.shippingCost || "0");
  const discountAmount = parseFloat(order.discountAmount || "0");
  const totalGross = round2(parseFloat(order.total));

  const lang = order.language === "en" ? "en" : "de";
  const taxNote = hasMargin
    ? lang === "en"
      ? "Margin scheme pursuant to Section 25a UStG (German VAT Act)."
      : "Differenzbesteuerung gemäß § 25a UStG."
    : undefined;

  const invoiceNumber = await allocateInvoiceNumber(pool);

  try {
    const [inserted] = await db.insert(invoices).values({
      invoiceNumber,
      orderId: order.id,
      userId: order.userId,
      language: lang,
      customerEmail: user?.email || "",
      customerName: order.customerName || "",
      companyName: order.companyName || null,
      customerVatId: order.customerVatId || null,
      billingAddress: order.billingAddress || null,
      shippingAddress: order.shippingAddress || null,
      lineItems,
      sellerSnapshot: seller,
      subtotalNet: subtotalNet.toString(),
      taxAmount: taxAmount.toString(),
      shippingCost: shippingCost.toString(),
      discountAmount: discountAmount.toString(),
      totalGross: totalGross.toString(),
      taxRatePercent: hasMargin ? "0" : String(order.taxRatePercent || "19"),
      taxNote: taxNote || null,
      currency: "EUR",
      paymentMethod: order.paymentMethod || "BANK_TRANSFER",
      paymentStatus: order.paymentStatus || "PENDING",
      orderNumber: order.orderNumber || `ORD-${order.id}`,
      eInvoiceFormat: null,
      eInvoiceMetadata: { version: "1.0", readyForZugferd: true },
    }).returning();

    return rowToInvoiceRecord(inserted);
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      const again = await getInvoiceByOrderId(orderId);
      if (again) return again;
    }
    throw err;
  }
}

export async function buildOrderLinesFromRequest(items: { id: string; quantity: number }[]) {
  const lines: {
    productId: number;
    name: string;
    sku: string;
    image: string;
    quantity: number;
    unitPriceGross: number;
    unitPriceNet: number;
    lineTaxAmount: number;
    taxRatePercent: number;
    taxTreatment: string | null;
  }[] = [];

  let subtotalNet = 0;
  let taxAmount = 0;
  let totalGross = 0;
  let hasMargin = false;

  for (const item of items) {
    const productId = parseInt(item.id, 10);
    if (isNaN(productId) || item.quantity < 1) throw new Error("Ungültiger Warenkorb.");

    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product || product.status !== "ACTIVE") {
      throw new Error(`Produkt ${productId} ist nicht verfügbar.`);
    }

    const gross = parseFloat(product.price);
    const taxTreatment = product.taxTreatment || "REGULAR";
    const rate = parseFloat(product.taxRatePercent || "19");
    const lineGross = round2(gross * item.quantity);
    const { net, tax } = computeLineTax(lineGross, taxTreatment, rate);

    if (taxTreatment === "MARGIN") hasMargin = true;

    lines.push({
      productId,
      name: product.titleDe || product.name,
      sku: product.sku || "",
      image: product.mainImage || (Array.isArray(product.images) ? (product.images as string[])[0] : "") || "",
      quantity: item.quantity,
      unitPriceGross: gross,
      unitPriceNet: round2(net / item.quantity),
      lineTaxAmount: tax,
      taxRatePercent: taxTreatment === "MARGIN" ? 0 : rate,
      taxTreatment,
    });

    subtotalNet += net;
    taxAmount += tax;
    totalGross += lineGross;
  }

  return {
    lines,
    subtotalNet: round2(subtotalNet),
    taxAmount: round2(taxAmount),
    totalGross: round2(totalGross),
    taxRatePercent: hasMargin ? 0 : 19,
    hasMargin,
  };
}

export async function listInvoicesForAdmin() {
  const rows = await db
    .select({ invoice: invoices, order: orders, user: users })
    .from(invoices)
    .innerJoin(orders, eq(invoices.orderId, orders.id))
    .leftJoin(users, eq(invoices.userId, users.uid))
    .orderBy(desc(invoices.issuedAt));

  return rows.map(({ invoice, order, user }) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    orderId: order.id,
    orderNumber: invoice.orderNumber || order.orderNumber,
    customerEmail: user?.email || invoice.customerEmail,
    customerName: invoice.customerName,
    totalGross: invoice.totalGross,
    paymentStatus: invoice.paymentStatus,
    issuedAt: invoice.issuedAt,
    orderStatus: order.status,
  }));
}
