import { buildCheckoutPaymentPayload } from "./pricingSettings.ts";
import { getSettingsMap } from "./settings.ts";
import { getStripeCheckoutCapabilities } from "./stripe.ts";
import type { PaymentDisplayId, PaymentDisplayMethod } from "../lib/paymentDisplay.ts";

const LABELS: Record<PaymentDisplayId, { labelDe: string; labelEn: string }> = {
  stripe: { labelDe: "Stripe", labelEn: "Stripe" },
  apple_pay: { labelDe: "Apple Pay", labelEn: "Apple Pay" },
  google_pay: { labelDe: "Google Pay", labelEn: "Google Pay" },
  visa: { labelDe: "Visa", labelEn: "Visa" },
  mastercard: { labelDe: "Mastercard", labelEn: "Mastercard" },
  amex: { labelDe: "American Express", labelEn: "American Express" },
  paypal: { labelDe: "PayPal", labelEn: "PayPal" },
  bank_transfer: { labelDe: "Banküberweisung", labelEn: "Bank transfer" },
};

function toMethod(id: PaymentDisplayId): PaymentDisplayMethod {
  return { id, ...LABELS[id] };
}

export async function getProductPagePaymentMethods(): Promise<PaymentDisplayMethod[]> {
  const settings = await getSettingsMap();
  const checkout = buildCheckoutPaymentPayload(settings);
  const methods: PaymentDisplayMethod[] = [];

  if (checkout.stripeEnabled) {
    const caps = await getStripeCheckoutCapabilities();
    methods.push(toMethod("stripe"));

    if (caps.card) {
      methods.push(toMethod("visa"), toMethod("mastercard"), toMethod("amex"));
    }
    if (caps.applePay) methods.push(toMethod("apple_pay"));
    if (caps.googlePay) methods.push(toMethod("google_pay"));
    if (caps.paypal) methods.push(toMethod("paypal"));
  }

  if (checkout.bankTransferEnabled) {
    methods.push(toMethod("bank_transfer"));
  }

  return methods;
}
