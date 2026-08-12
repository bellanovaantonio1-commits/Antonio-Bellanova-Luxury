/**
 * Tests invoice numbering & cancellation logic (TEST 1–5).
 * Run: npx tsx scripts/test-invoice-logic.ts
 */
import "../src/load-env.ts";
import { createPgPool } from "../src/db/pool.ts";
import { db } from "../src/db/index.ts";
import { orders, orderItems, products, invoices } from "../src/db/schema.ts";
import { eq, and, sql } from "drizzle-orm";
import {
  createInvoiceForOrder,
  cancelInvoiceForOrder,
  getInvoiceByOrderId,
} from "../src/server/invoice/service.ts";
import { DEFAULT_SHOP_SETTINGS } from "../src/config/shopDefaults.ts";

const pool = createPgPool();

async function getSeq(year: number) {
  const r = await pool.query(`SELECT last_number FROM invoice_sequences WHERE year = $1`, [year]);
  return r.rows[0]?.last_number ?? 0;
}

async function cleanupOrder(orderId: number) {
  await pool.query(`DELETE FROM invoices WHERE order_id = $1`, [orderId]);
  await pool.query(`DELETE FROM order_items WHERE order_id = $1`, [orderId]);
  await pool.query(`DELETE FROM orders WHERE id = $1`, [orderId]);
}

async function createTestOrder() {
  const [product] = await db.select().from(products).where(eq(products.status, "ACTIVE")).limit(1);
  if (!product) throw new Error("Kein aktives Produkt für Test vorhanden.");

  const [order] = await db.insert(orders).values({
    userId: "test-invoice-user",
    orderNumber: `TEST-${Date.now()}`,
    status: "PENDING",
    paymentStatus: "PENDING",
    paymentMethod: "BANK_TRANSFER",
    total: product.price,
    subtotalNet: product.price,
    taxAmount: "0",
    taxRatePercent: "19",
    language: "de",
    customerName: "Test Kunde",
  }).returning();

  await db.insert(orderItems).values({
    orderId: order.id,
    productId: product.id,
    productName: product.name,
    productSku: product.sku || "TEST-SKU",
    quantity: 1,
    price: product.price,
    unitPriceGross: product.price,
    unitPriceNet: product.price,
    lineTaxAmount: "0",
    taxRatePercent: "19",
  });

  return order.id;
}

async function main() {
  const year = new Date().getFullYear();
  const settings = { ...DEFAULT_SHOP_SETTINGS };
  let passed = 0;

  console.log("=== Invoice Logic Tests ===\n");
  const seqBefore = await getSeq(year);

  // TEST 1: Order → no invoice → cancel
  const order1 = await createTestOrder();
  await db.update(orders).set({ status: "CANCELLED" }).where(eq(orders.id, order1));
  const { invoice: inv1 } = await cancelInvoiceForOrder(order1);
  const seqAfterTest1 = await getSeq(year);
  if (!inv1 && seqAfterTest1 === seqBefore) {
    console.log("✓ TEST 1: Stornierung ohne Rechnung — keine Nummer verbraucht");
    passed++;
  } else {
    console.log("✗ TEST 1 FAILED", { inv1, seqBefore, seqAfterTest1 });
  }
  await cleanupOrder(order1);

  // TEST 2: Order → invoice → cancel (invoice preserved, marked cancelled)
  const order2 = await createTestOrder();
  const invoice2 = await createInvoiceForOrder(order2, settings);
  const num2 = invoice2.invoiceNumber;
  await db.update(orders).set({ status: "CANCELLED" }).where(eq(orders.id, order2));
  const { invoice: cancelledInv, creditNote } = await cancelInvoiceForOrder(order2);
  if (
    cancelledInv?.invoiceNumber === num2 &&
    cancelledInv.invoiceStatus === "CANCELLED" &&
    creditNote?.invoiceNumber.startsWith("ST-")
  ) {
    console.log(`✓ TEST 2: ${num2} bleibt erhalten, Storno ${creditNote.invoiceNumber}`);
    passed++;
  } else {
    console.log("✗ TEST 2 FAILED", cancelledInv, creditNote);
  }

  // TEST 3: Next order gets next number (not reusing num2)
  const order3 = await createTestOrder();
  const invoice3 = await createInvoiceForOrder(order3, settings);
  if (invoice3.invoiceNumber !== num2) {
    console.log(`✓ TEST 3: Nächste Nummer ${invoice3.invoiceNumber} (nicht ${num2})`);
    passed++;
  } else {
    console.log("✗ TEST 3 FAILED: Nummer wiederverwendet");
  }

  // TEST 4: Double create — same invoice
  const first = await createInvoiceForOrder(order3, settings);
  const second = await createInvoiceForOrder(order3, settings);
  const count = await db.select({ c: sql<number>`count(*)` }).from(invoices)
    .where(and(eq(invoices.orderId, order3), eq(invoices.invoiceType, "INVOICE")));
  if (first.id === second.id && Number(count[0]?.c) === 1) {
    console.log("✓ TEST 4: Doppelter Aufruf — nur eine Rechnung");
    passed++;
  } else {
    console.log("✗ TEST 4 FAILED");
  }

  // TEST 5: Reload simulation — getInvoiceByOrderId, no new create
  const existing = await getInvoiceByOrderId(order3);
  const seqBefore5 = await getSeq(year);
  await getInvoiceByOrderId(order3);
  const seqAfter5 = await getSeq(year);
  if (existing?.invoiceNumber === invoice3.invoiceNumber && seqBefore5 === seqAfter5) {
    console.log("✓ TEST 5: Erneutes Laden — keine neue Nummer");
    passed++;
  } else {
    console.log("✗ TEST 5 FAILED");
  }

  await cleanupOrder(order2);
  await cleanupOrder(order3);

  console.log(`\n${passed}/5 Tests bestanden`);
  await pool.end();
  process.exit(passed === 5 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
