import crypto from "crypto";

const STRIPE_API = "https://api.stripe.com/v1";

function getStripeKey(): string | null {
  return process.env.STRIPE_SECRET_KEY?.trim() || null;
}

function encodeForm(data: Record<string, string | number | undefined>): string {
  return Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
}

async function stripeRequest(path: string, body: Record<string, string | number | undefined>) {
  const key = getStripeKey();
  if (!key) throw new Error("Stripe ist nicht konfiguriert.");

  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encodeForm(body),
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

export async function createStripeCheckoutSession(opts: {
  orderId: number;
  orderNumber: string;
  totalEur: number;
  customerEmail: string;
  language: "de" | "en";
  lineItems: { name: string; quantity: number; unitAmountEur: number }[];
  shippingEur: number;
}): Promise<string> {
  const baseUrl = process.env.APP_URL || "http://localhost:3000";
  const form: Record<string, string | number | undefined> = {
    mode: "payment",
    success_url: `${baseUrl}/cart?stripe=success&order=${encodeURIComponent(opts.orderNumber)}`,
    cancel_url: `${baseUrl}/cart?stripe=cancelled`,
    customer_email: opts.customerEmail,
    "metadata[orderId]": opts.orderId,
    "metadata[orderNumber]": opts.orderNumber,
    "payment_intent_data[metadata][orderId]": opts.orderId,
    "payment_intent_data[metadata][orderNumber]": opts.orderNumber,
    locale: opts.language === "en" ? "en" : "de",
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
  return session.url as string;
}

export function verifyStripeWebhook(rawBody: Buffer, signatureHeader: string | undefined): any {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET fehlt.");
  if (!signatureHeader) throw new Error("Stripe-Signatur fehlt.");

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    })
  );

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) throw new Error("Ungültige Stripe-Signatur.");

  const payload = `${timestamp}.${rawBody.toString("utf8")}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (expected !== signature) throw new Error("Stripe-Signatur ungültig.");

  return JSON.parse(rawBody.toString("utf8"));
}
