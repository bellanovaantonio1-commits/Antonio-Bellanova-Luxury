import crypto from "crypto";

const STRIPE_API = "https://api.stripe.com/v1";
const WEBHOOK_TOLERANCE_SEC = 300;

function getStripeKey(): string | null {
  return process.env.STRIPE_SECRET_KEY?.trim() || null;
}

function encodeForm(data: Record<string, string | number | undefined>): string {
  return Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
}

async function stripeRequest(
  path: string,
  body: Record<string, string | number | undefined>,
  method: "POST" | "GET" = "POST"
) {
  const key = getStripeKey();
  if (!key) throw new Error("Stripe ist nicht konfiguriert.");

  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    ...(method === "POST" ? { body: encodeForm(body) } : {}),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Stripe-Anfrage fehlgeschlagen.");
  }
  return data;
}

export function isStripeEnabled(): boolean {
  return !!getStripeKey();
}

export function isStripeTestMode(): boolean {
  const key = getStripeKey();
  return !!key?.startsWith("sk_test_");
}

export async function createStripeCheckoutSession(opts: {
  orderId: number;
  orderNumber: string;
  totalEur: number;
  customerEmail: string;
  language: "de" | "en";
  lineItems: { name: string; quantity: number; unitAmountEur: number }[];
  shippingEur: number;
}): Promise<{ url: string; sessionId: string }> {
  const baseUrl = process.env.APP_URL || "http://localhost:3000";
  const form: Record<string, string | number | undefined> = {
    mode: "payment",
    success_url: `${baseUrl}/cart?stripe=success&order=${encodeURIComponent(opts.orderNumber)}`,
    cancel_url: `${baseUrl}/cart?stripe=cancelled&order=${encodeURIComponent(opts.orderNumber)}`,
    customer_email: opts.customerEmail,
    client_reference_id: String(opts.orderId),
    "metadata[orderId]": opts.orderId,
    "metadata[orderNumber]": opts.orderNumber,
    "payment_intent_data[metadata][orderId]": opts.orderId,
    "payment_intent_data[metadata][orderNumber]": opts.orderNumber,
    locale: opts.language === "en" ? "en" : "de",
    "payment_method_types[0]": "card",
  };

  opts.lineItems.forEach((item, index) => {
    form[`line_items[${index}][quantity]`] = item.quantity;
    form[`line_items[${index}][price_data][currency]`] = "eur";
    form[`line_items[${index}][price_data][unit_amount]`] = Math.round(item.unitAmountEur * 100);
    form[`line_items[${index}][price_data][product_data][name]`] = item.name;
  });

  if (opts.shippingEur > 0) {
    const index = opts.lineItems.length;
    form[`line_items[${index}][quantity]`] = 1;
    form[`line_items[${index}][price_data][currency]`] = "eur";
    form[`line_items[${index}][price_data][unit_amount]`] = Math.round(opts.shippingEur * 100);
    form[`line_items[${index}][price_data][product_data][name]`] =
      opts.language === "en" ? "Insured shipping" : "Versicherter Versand";
  }

  const session = await stripeRequest("/checkout/sessions", form);
  return {
    url: session.url as string,
    sessionId: session.id as string,
  };
}

export async function createStripeRefund(
  paymentIntentId: string,
  amountEur?: number
): Promise<void> {
  const body: Record<string, string | number | undefined> = {
    payment_intent: paymentIntentId,
  };
  if (amountEur != null && amountEur > 0) {
    body.amount = Math.round(amountEur * 100);
  }
  await stripeRequest("/refunds", body);
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function verifyStripeWebhook(rawBody: Buffer, signatureHeader: string | undefined): any {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET fehlt.");
  if (!signatureHeader) throw new Error("Stripe-Signatur fehlt.");

  const parts = signatureHeader.split(",").reduce<Record<string, string[]>>((acc, part) => {
    const [key, value] = part.split("=");
    if (key && value) {
      acc[key] = acc[key] || [];
      acc[key].push(value);
    }
    return acc;
  }, {});

  const timestamp = parts.t?.[0];
  const signatures = parts.v1 || [];
  if (!timestamp || signatures.length === 0) throw new Error("Ungültige Stripe-Signatur.");

  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > WEBHOOK_TOLERANCE_SEC) {
    throw new Error("Stripe-Signatur abgelaufen.");
  }

  const payload = `${timestamp}.${rawBody.toString("utf8")}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const valid = signatures.some((sig) => timingSafeEqual(expected, sig));
  if (!valid) throw new Error("Stripe-Signatur ungültig.");

  return JSON.parse(rawBody.toString("utf8"));
}
