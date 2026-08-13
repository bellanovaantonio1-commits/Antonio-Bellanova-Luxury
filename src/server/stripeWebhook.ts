import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { stripeWebhookEvents } from "../db/schema.ts";
import { verifyStripeWebhook } from "./stripe.ts";
import {
  markOrderAsPaid,
  markOrderPaymentFailed,
  markOrderPaymentCancelled,
  markOrderRefunded,
  resolveOrderIdFromStripeObject,
  findOrderByPaymentIntent,
  findOrderByCheckoutSession,
} from "./stripeOrder.ts";

async function isEventProcessed(eventId: string): Promise<boolean> {
  const [row] = await db.select().from(stripeWebhookEvents)
    .where(eq(stripeWebhookEvents.id, eventId))
    .limit(1);
  return !!row;
}

async function markEventProcessed(eventId: string, eventType: string): Promise<void> {
  try {
    await db.insert(stripeWebhookEvents).values({ id: eventId, eventType });
  } catch {
    /* duplicate — already processed */
  }
}

async function handleCheckoutSessionCompleted(session: Record<string, unknown>) {
  const orderId =
    (await resolveOrderIdFromStripeObject(session as { metadata?: Record<string, string>; client_reference_id?: string })) ??
    (session.id ? (await findOrderByCheckoutSession(String(session.id)))?.id : null);

  if (!orderId) return;

  await markOrderAsPaid(orderId, {
    sessionId: session.id ? String(session.id) : null,
    paymentIntentId: session.payment_intent ? String(session.payment_intent) : null,
  });
}

async function handlePaymentIntentSucceeded(paymentIntent: Record<string, unknown>) {
  let orderId = await resolveOrderIdFromStripeObject(
    paymentIntent as { metadata?: Record<string, string> }
  );

  if (!orderId && paymentIntent.id) {
    const order = await findOrderByPaymentIntent(String(paymentIntent.id));
    orderId = order?.id ?? null;
  }

  if (!orderId) return;

  await markOrderAsPaid(orderId, {
    paymentIntentId: paymentIntent.id ? String(paymentIntent.id) : null,
  });
}

async function handlePaymentIntentFailed(paymentIntent: Record<string, unknown>) {
  let orderId = await resolveOrderIdFromStripeObject(
    paymentIntent as { metadata?: Record<string, string> }
  );

  if (!orderId && paymentIntent.id) {
    const order = await findOrderByPaymentIntent(String(paymentIntent.id));
    orderId = order?.id ?? null;
  }

  if (!orderId) return;
  await markOrderPaymentFailed(orderId);
}

async function handleCheckoutSessionExpired(session: Record<string, unknown>) {
  const orderId = await resolveOrderIdFromStripeObject(
    session as { metadata?: Record<string, string>; client_reference_id?: string }
  );
  if (!orderId) return;
  await markOrderPaymentCancelled(orderId);
}

async function handleChargeRefunded(charge: Record<string, unknown>) {
  const paymentIntentId = charge.payment_intent ? String(charge.payment_intent) : null;
  if (!paymentIntentId) return;

  const order = await findOrderByPaymentIntent(paymentIntentId);
  if (!order) return;

  const amount = typeof charge.amount === "number" ? charge.amount : 0;
  const refunded = typeof charge.amount_refunded === "number" ? charge.amount_refunded : 0;
  const partial = refunded > 0 && refunded < amount;

  await markOrderRefunded(order.id, partial);
}

export async function handleStripeWebhook(rawBody: Buffer, signatureHeader: string | undefined) {
  const event = verifyStripeWebhook(rawBody, signatureHeader);

  if (await isEventProcessed(event.id)) {
    return;
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event.data?.object || {});
      break;
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(event.data?.object || {});
      break;
    case "payment_intent.payment_failed":
      await handlePaymentIntentFailed(event.data?.object || {});
      break;
    case "checkout.session.expired":
      await handleCheckoutSessionExpired(event.data?.object || {});
      break;
    case "charge.refunded":
      await handleChargeRefunded(event.data?.object || {});
      break;
    default:
      break;
  }

  await markEventProcessed(event.id, event.type);
}
