import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { orders, orderItems, products, users } from "../db/schema.ts";
import { createInvoiceForOrder, getInvoicePdfBufferByOrderId } from "./invoice/service.ts";
import { sendInvoiceIssuedEmail, sendOrderEmails, type AddressBlock } from "./email.ts";
import { getSettingsMap } from "./settings.ts";

export async function restoreOrderStock(orderId: number): Promise<void> {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const item of items) {
    if (!item.productId) continue;
    const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (product) {
      await db.update(products)
        .set({ stock: (product.stock ?? 0) + item.quantity, updatedAt: new Date() })
        .where(eq(products.id, item.productId));
    }
  }
}

async function getOrderEmailItems(orderId: number) {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return items.map((i) => ({
    name: i.productName || "Produkt",
    quantity: i.quantity,
    price: parseFloat(i.price),
  }));
}

/** Idempotent: returns true if order was newly marked paid. */
export async function markOrderAsPaid(
  orderId: number,
  refs: { sessionId?: string | null; paymentIntentId?: string | null }
): Promise<boolean> {
  const [existing] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!existing) return false;
  if (existing.paymentStatus === "PAID") return false;

  const [updated] = await db.update(orders)
    .set({
      paymentStatus: "PAID",
      status: existing.status === "PENDING" ? "PROCESSING" : existing.status,
      paidAt: new Date(),
      ...(refs.sessionId ? { stripeCheckoutSessionId: refs.sessionId } : {}),
      ...(refs.paymentIntentId ? { stripePaymentIntentId: refs.paymentIntentId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId))
    .returning();

  const settings = await getSettingsMap();
  const [user] = await db.select().from(users).where(eq(users.uid, updated.userId)).limit(1);
  const emailItems = await getOrderEmailItems(orderId);

  if (user?.email) {
    sendOrderEmails({
      customerEmail: user.email,
      orderNumber: updated.orderNumber || `ORD-${orderId}`,
      total: updated.total,
      items: emailItems,
      settings,
      language: updated.language === "en" ? "en" : "de",
      paymentMethod: "STRIPE",
      shippingCost: updated.shippingCost || "0",
      prepaymentDiscount: updated.discountAmount || "0",
      billingAddress: updated.billingAddress as AddressBlock | null,
      shippingAddress: updated.shippingAddress as AddressBlock | null,
    }).catch((e) => console.error("Stripe order email failed", e));
  }

  try {
    const invoice = await createInvoiceForOrder(orderId, settings);
    const pdfBuffer = (await getInvoicePdfBufferByOrderId(orderId)) || undefined;
    if (user?.email) {
      sendInvoiceIssuedEmail({
        customerEmail: user.email,
        orderNumber: updated.orderNumber || `ORD-${orderId}`,
        invoiceNumber: invoice.invoiceNumber,
        total: updated.total,
        settings,
        language: updated.language === "en" ? "en" : "de",
        pdfBuffer,
      }).catch((e) => console.error("Stripe invoice email failed", e));
    }
  } catch (invErr) {
    console.error("Stripe auto invoice failed:", invErr);
  }

  return true;
}

export async function markOrderPaymentFailed(orderId: number): Promise<void> {
  const [existing] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!existing || existing.paymentStatus === "PAID") return;

  await db.update(orders)
    .set({ paymentStatus: "FAILED", updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  await restoreOrderStock(orderId);
}

export async function markOrderPaymentCancelled(orderId: number): Promise<void> {
  const [existing] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!existing || existing.paymentStatus === "PAID") return;

  await db.update(orders)
    .set({
      paymentStatus: "CANCELLED",
      status: existing.status === "PENDING" ? "CANCELLED" : existing.status,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  await restoreOrderStock(orderId);
}

export async function markOrderRefunded(
  orderId: number,
  partial: boolean
): Promise<void> {
  const [existing] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!existing) return;

  await db.update(orders)
    .set({
      paymentStatus: partial ? "PARTIALLY_REFUNDED" : "REFUNDED",
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));
}

export async function resolveOrderIdFromStripeObject(obj: {
  metadata?: Record<string, string | number | undefined>;
  client_reference_id?: string | null;
}): Promise<number | null> {
  const fromMeta = parseInt(String(obj.metadata?.orderId || ""), 10);
  if (Number.isFinite(fromMeta)) return fromMeta;
  const fromRef = parseInt(String(obj.client_reference_id || ""), 10);
  if (Number.isFinite(fromRef)) return fromRef;
  return null;
}

export async function findOrderByPaymentIntent(paymentIntentId: string) {
  const [order] = await db.select().from(orders)
    .where(eq(orders.stripePaymentIntentId, paymentIntentId))
    .limit(1);
  return order ?? null;
}

export async function findOrderByCheckoutSession(sessionId: string) {
  const [order] = await db.select().from(orders)
    .where(eq(orders.stripeCheckoutSessionId, sessionId))
    .limit(1);
  return order ?? null;
}
