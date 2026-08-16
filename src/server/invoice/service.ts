import { eq, desc, and } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { createPgPool } from "../../db/pool.ts";
import { orders, orderItems, products, users, invoices } from "../../db/schema.ts";
import { allocateInvoiceNumber, allocateCreditNoteNumber } from "./numbering.ts";
import { buildSellerSnapshot, assertInvoiceSettingsReady } from "./seller.ts";
import { generateInvoicePdf } from "./pdf.ts";
import type { Address, InvoiceLineItem, InvoiceRecord } from "./types.ts";
import { getSettingsMap } from "../settings.ts";
import { isPriceOnRequest, parsePriceOnRequestThreshold } from "../../lib/priceOnRequest.ts";
import { getUnitPriceForPayment, getShopDisplayPrice } from "../../lib/shopPricing.ts";

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

async function getOriginalInvoiceNumber(originalInvoiceId: number | null | undefined): Promise<string | null> {
  if (!originalInvoiceId) return null;
  const [row] = await db.select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices).where(eq(invoices.id, originalInvoiceId)).limit(1);
  return row?.invoiceNumber || null;
}

function rowToInvoiceRecord(row: typeof invoices.$inferSelect, originalInvoiceNumber?: string | null): InvoiceRecord {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    invoiceType: (row.invoiceType === "CREDIT_NOTE" ? "CREDIT_NOTE" : "INVOICE") as InvoiceRecord["invoiceType"],
    invoiceStatus: (row.invoiceStatus === "CANCELLED" ? "CANCELLED" : "ISSUED") as InvoiceRecord["invoiceStatus"],
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
    cancelledAt: row.cancelledAt ? new Date(row.cancelledAt) : null,
    cancellationReason: row.cancellationReason || null,
    originalInvoiceId: row.originalInvoiceId || null,
    originalInvoiceNumber: originalInvoiceNumber ?? undefined,
  };
}

export async function getInvoiceByOrderId(orderId: number): Promise<InvoiceRecord | null> {
  const [row] = await db.select().from(invoices)
    .where(and(eq(invoices.orderId, orderId), eq(invoices.invoiceType, "INVOICE")))
    .limit(1);
  if (!row) return null;
  return rowToInvoiceRecord(row);
}

export async function getCreditNoteByInvoiceId(invoiceId: number): Promise<InvoiceRecord | null> {
  const [row] = await db.select().from(invoices)
    .where(and(eq(invoices.originalInvoiceId, invoiceId), eq(invoices.invoiceType, "CREDIT_NOTE")))
    .limit(1);
  if (!row) return null;
  const originalInvoiceNumber = await getOriginalInvoiceNumber(row.originalInvoiceId);
  return rowToInvoiceRecord(row, originalInvoiceNumber);
}

export async function getInvoiceById(id: number): Promise<InvoiceRecord | null> {
  const [row] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  if (!row) return null;
  const originalInvoiceNumber = row.originalInvoiceId
    ? await getOriginalInvoiceNumber(row.originalInvoiceId)
    : null;
  return rowToInvoiceRecord(row, originalInvoiceNumber);
}

export async function getInvoicePdfBufferByOrderId(orderId: number): Promise<Buffer | null> {
  const invoice = await getInvoiceByOrderId(orderId);
  if (!invoice) return null;
  const enriched = await enrichInvoiceLineItemImages(invoice);
  return generateInvoicePdf(enriched);
}

export async function getInvoicePdfBufferById(id: number): Promise<Buffer | null> {
  const invoice = await getInvoiceById(id);
  if (!invoice) return null;
  const enriched = await enrichInvoiceLineItemImages(invoice);
  return generateInvoicePdf(enriched);
}

function buildLineItemsFromOrderItems(items: typeof orderItems.$inferSelect[]) {
  return items.map((item) => {
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
      image: String(item.productImage || "").trim() || undefined,
    } satisfies InvoiceLineItem;
  });
}

async function enrichInvoiceLineItemImages(invoice: InvoiceRecord): Promise<InvoiceRecord> {
  if (invoice.lineItems.every((line) => line.image)) return invoice;

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, invoice.orderId));
  if (!items.length) return invoice;

  return {
    ...invoice,
    lineItems: invoice.lineItems.map((line) => {
      if (line.image) return line;
      const match =
        items.find((item) => item.productSku && item.productSku === line.sku) ||
        items.find((item) => item.productName === line.name);
      const image = String(match?.productImage || "").trim();
      return image ? { ...line, image } : line;
    }),
  };
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
  if (order.status === "CANCELLED") {
    throw new Error("Für stornierte Bestellungen kann keine Rechnung ausgestellt werden.");
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  if (!items.length) throw new Error("Bestellung enthält keine Positionen.");

  const [user] = await db.select().from(users).where(eq(users.uid, order.userId)).limit(1);
  const seller = buildSellerSnapshot(settings);
  const lineItems = buildLineItemsFromOrderItems(items);

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

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const dupCheck = await client.query<{ id: number }>(
      `SELECT id FROM invoices WHERE order_id = $1 AND invoice_type = 'INVOICE' FOR UPDATE`,
      [orderId]
    );
    if (dupCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      const again = await getInvoiceByOrderId(orderId);
      if (again) return again;
      throw new Error("Rechnung existiert bereits.");
    }

    const invoiceNumber = await allocateInvoiceNumber(client);

    const insertResult = await client.query(
      `INSERT INTO invoices (
        invoice_number, invoice_type, invoice_status, order_id, user_id, language,
        customer_email, customer_name, company_name, customer_vat_id,
        billing_address, shipping_address, line_items, seller_snapshot,
        subtotal_net, tax_amount, shipping_cost, discount_amount, total_gross,
        tax_rate_percent, tax_note, currency, payment_method, payment_status,
        order_number, e_invoice_metadata
      ) VALUES (
        $1, 'INVOICE', 'ISSUED', $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15, $16, $17,
        $18, $19, 'EUR', $20, $21,
        $22, $23
      ) RETURNING id`,
      [
        invoiceNumber,
        order.id,
        order.userId,
        lang,
        user?.email || "",
        order.customerName || "",
        order.companyName || null,
        order.customerVatId || null,
        JSON.stringify(order.billingAddress || null),
        JSON.stringify(order.shippingAddress || null),
        JSON.stringify(lineItems),
        JSON.stringify(seller),
        subtotalNet.toString(),
        taxAmount.toString(),
        shippingCost.toString(),
        discountAmount.toString(),
        totalGross.toString(),
        hasMargin ? "0" : String(order.taxRatePercent || "19"),
        taxNote || null,
        order.paymentMethod || "BANK_TRANSFER",
        order.paymentStatus || "PENDING",
        order.orderNumber || `ORD-${order.id}`,
        JSON.stringify({ version: "1.0", readyForZugferd: true }),
      ]
    );

    await client.query("COMMIT");

    const insertedId = insertResult.rows[0]?.id as number;
    const created = await getInvoiceById(insertedId);
    if (!created) throw new Error("Rechnung konnte nicht geladen werden.");
    return created;
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      const again = await getInvoiceByOrderId(orderId);
      if (again) return again;
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function cancelInvoiceForOrder(
  orderId: number,
  reason?: string
): Promise<{ invoice: InvoiceRecord | null; creditNote: InvoiceRecord | null }> {
  const invoice = await getInvoiceByOrderId(orderId);
  if (!invoice) {
    return { invoice: null, creditNote: null };
  }

  if (invoice.invoiceStatus === "CANCELLED") {
    const existingCredit = await getCreditNoteByInvoiceId(invoice.id);
    return { invoice, creditNote: existingCredit };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const lock = await client.query<{ id: number; invoice_status: string }>(
      `SELECT id, invoice_status FROM invoices WHERE id = $1 AND invoice_type = 'INVOICE' FOR UPDATE`,
      [invoice.id]
    );
    if (!lock.rows.length) {
      await client.query("ROLLBACK");
      return { invoice: null, creditNote: null };
    }

    if (lock.rows[0].invoice_status === "CANCELLED") {
      await client.query("ROLLBACK");
      const existingCredit = await getCreditNoteByInvoiceId(invoice.id);
      const current = await getInvoiceByOrderId(orderId);
      return { invoice: current, creditNote: existingCredit };
    }

    const now = new Date();
    await client.query(
      `UPDATE invoices SET invoice_status = 'CANCELLED', cancelled_at = $1, cancellation_reason = $2
       WHERE id = $3`,
      [now, reason || "Bestellung storniert", invoice.id]
    );

    const creditCheck = await client.query<{ id: number }>(
      `SELECT id FROM invoices WHERE original_invoice_id = $1 AND invoice_type = 'CREDIT_NOTE'`,
      [invoice.id]
    );

    let creditNoteId: number | null = null;
    if (!creditCheck.rows.length) {
      const creditNoteNumber = await allocateCreditNoteNumber(client);
      const creditInsert = await client.query(
        `INSERT INTO invoices (
          invoice_number, invoice_type, invoice_status, order_id, user_id, language,
          customer_email, customer_name, company_name, customer_vat_id,
          billing_address, shipping_address, line_items, seller_snapshot,
          subtotal_net, tax_amount, shipping_cost, discount_amount, total_gross,
          tax_rate_percent, tax_note, currency, payment_method, payment_status,
          order_number, original_invoice_id, issued_at
        )
        SELECT
          $1, 'CREDIT_NOTE', 'ISSUED', order_id, user_id, language,
          customer_email, customer_name, company_name, customer_vat_id,
          billing_address, shipping_address, line_items, seller_snapshot,
          subtotal_net, tax_amount, shipping_cost, discount_amount, total_gross,
          tax_rate_percent, tax_note, currency, payment_method, 'REFUNDED',
          order_number, id, $2
        FROM invoices WHERE id = $3
        RETURNING id`,
        [creditNoteNumber, now, invoice.id]
      );
      creditNoteId = creditInsert.rows[0]?.id ?? null;
    }

    await client.query("COMMIT");

    const updatedInvoice = await getInvoiceByOrderId(orderId);
    const creditNote = creditNoteId
      ? await getInvoiceById(creditNoteId)
      : await getCreditNoteByInvoiceId(invoice.id);
    return { invoice: updatedInvoice, creditNote };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function buildOrderLinesFromRequest(
  items: { id: string; quantity: number }[],
  opts?: { paymentMethod?: "STRIPE" | "BANK_TRANSFER" }
) {
  const paymentMethod = opts?.paymentMethod ?? "STRIPE";
  const isBankTransfer = paymentMethod === "BANK_TRANSFER";
  const settings = await getSettingsMap();
  const priceOnRequestThreshold = parsePriceOnRequestThreshold(settings as Record<string, string>);

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
    shopUnitPriceGross: number;
    pricingModel: string;
    basePriceSnapshot: number | null;
    prepaymentDiscountSnapshot: number;
  }[] = [];

  let subtotalNet = 0;
  let taxAmount = 0;
  let totalGross = 0;
  let shopSubtotalGross = 0;
  let prepaymentDiscount = 0;
  let hasMargin = false;

  for (const item of items) {
    const productId = parseInt(item.id, 10);
    if (isNaN(productId) || item.quantity < 1) throw new Error("Ungültiger Warenkorb.");

    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product || product.status !== "ACTIVE") {
      throw new Error(`Produkt ${productId} ist nicht verfügbar.`);
    }

    const shopPrice = getShopDisplayPrice(product);
    const payMethod = isBankTransfer ? "BANK_TRANSFER" : "STRIPE";
    const { shopUnitPrice, payableUnitPrice, prepaymentDiscount: unitDiscount } = getUnitPriceForPayment(
      product,
      payMethod
    );

    if (isPriceOnRequest(shopPrice, priceOnRequestThreshold)) {
      throw new Error(`Produkt „${product.titleDe || product.name}“ ist nur auf Anfrage erhältlich.`);
    }

    if (isBankTransfer && unitDiscount > 0) {
      prepaymentDiscount += unitDiscount * item.quantity;
    }

    const taxTreatment = product.taxTreatment || "REGULAR";
    const rate = parseFloat(product.taxRatePercent || "19");
    const lineGross = round2(payableUnitPrice * item.quantity);
    const { net, tax } = computeLineTax(lineGross, taxTreatment, rate);

    if (taxTreatment === "MARGIN") hasMargin = true;

    const baseSnapshot =
      product.basePrice != null && String(product.basePrice).trim() !== ""
        ? parseFloat(String(product.basePrice))
        : null;

    lines.push({
      productId,
      name: product.titleDe || product.name,
      sku: product.sku || "",
      image: product.mainImage || (Array.isArray(product.images) ? (product.images as string[])[0] : "") || "",
      quantity: item.quantity,
      unitPriceGross: payableUnitPrice,
      unitPriceNet: round2(net / item.quantity),
      lineTaxAmount: tax,
      taxRatePercent: taxTreatment === "MARGIN" ? 0 : rate,
      taxTreatment,
      shopUnitPriceGross: shopUnitPrice,
      pricingModel: product.pricingModel || "STANDARD",
      basePriceSnapshot: baseSnapshot,
      prepaymentDiscountSnapshot: unitDiscount,
    });

    subtotalNet += net;
    taxAmount += tax;
    totalGross += lineGross;
    shopSubtotalGross += round2(shopUnitPrice * item.quantity);
  }

  return {
    lines,
    subtotalNet: round2(subtotalNet),
    taxAmount: round2(taxAmount),
    totalGross: round2(totalGross),
    shopSubtotalGross: round2(shopSubtotalGross),
    prepaymentDiscount: round2(prepaymentDiscount),
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

  const creditNotesByOriginal = new Map<number, typeof invoices.$inferSelect>();
  for (const { invoice } of rows) {
    if (invoice.invoiceType === "CREDIT_NOTE" && invoice.originalInvoiceId) {
      creditNotesByOriginal.set(invoice.originalInvoiceId, invoice);
    }
  }

  const invoiceById = new Map(rows.map((r) => [r.invoice.id, r.invoice]));

  return rows.map(({ invoice, order, user }) => {
    const creditNote = invoice.invoiceType === "INVOICE"
      ? creditNotesByOriginal.get(invoice.id)
      : null;
    const originalInvoice = invoice.originalInvoiceId
      ? invoiceById.get(invoice.originalInvoiceId)
      : null;

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceType: invoice.invoiceType,
      invoiceStatus: invoice.invoiceStatus,
      orderId: order.id,
      orderNumber: invoice.orderNumber || order.orderNumber,
      customerEmail: user?.email || invoice.customerEmail,
      customerName: invoice.customerName,
      totalGross: invoice.totalGross,
      paymentStatus: invoice.paymentStatus,
      issuedAt: invoice.issuedAt,
      cancelledAt: invoice.cancelledAt,
      cancellationReason: invoice.cancellationReason,
      orderStatus: order.status,
      originalInvoiceId: invoice.originalInvoiceId,
      originalInvoiceNumber: originalInvoice?.invoiceNumber || null,
      creditNoteNumber: creditNote?.invoiceNumber || null,
      creditNoteId: creditNote?.id || null,
    };
  });
}
