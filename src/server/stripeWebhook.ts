import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { orders, users } from "../db/schema.ts";
import { verifyStripeWebhook } from "./stripe.ts";
import { createInvoiceForOrder, getInvoicePdfBufferByOrderId } from "./invoice/service.ts";
import { sendInvoiceIssuedEmail, sendOrderEmails } from "./email.ts";
import { getSettingsMap } from "./settings.ts";

export async function handleStripeWebhook(rawBody: Buffer, signatureHeader: string | undefined) {
  const event = verifyStripeWebhook(rawBody, signatureHeader);
  if (event.type !== "checkout.session.completed") return;

  const session = event.data?.object;
  const orderId = parseInt(String(session?.metadata?.orderId || ""), 10);
  if (!Number.isFinite(orderId)) return;

  const [existing] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!existing) return;
  if (existing.paymentStatus === "PAID") return;

  const [updated] = await db.update(orders)
    .set({
      paymentStatus: "PAID",
      status: existing.status === "PENDING" ? "PROCESSING" : existing.status,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId))
    .returning();

  const settings = await getSettingsMap();
  const [user] = await db.select().from(users).where(eq(users.uid, updated.userId)).limit(1);

  if (user?.email) {
    sendOrderEmails({
      customerEmail: user.email,
      orderNumber: updated.orderNumber || `ORD-${orderId}`,
      total: updated.total,
      items: [],
      settings,
      language: updated.language === "en" ? "en" : "de",
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
}
