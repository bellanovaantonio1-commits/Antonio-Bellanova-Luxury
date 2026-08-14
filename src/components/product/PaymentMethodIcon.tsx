import type { PaymentDisplayId } from "../../lib/paymentDisplay.ts";

interface PaymentMethodIconProps {
  id: PaymentDisplayId;
  className?: string;
}

const PAYMENT_ASSETS: Record<PaymentDisplayId, string> = {
  stripe: "/payments/stripe.svg",
  apple_pay: "/payments/apple-pay.svg",
  google_pay: "/payments/google-pay.svg",
  visa: "/payments/visa.svg",
  mastercard: "/payments/mastercard.svg",
  amex: "/payments/amex.svg",
  paypal: "/payments/paypal.svg",
  bank_transfer: "/payments/bank-transfer.svg",
};

export default function PaymentMethodIcon({ id, className = "h-7 w-[4.5rem]" }: PaymentMethodIconProps) {
  const src = PAYMENT_ASSETS[id];
  if (!src) return null;

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      draggable={false}
      className={`${className} block object-contain opacity-95 group-hover:opacity-100 transition-opacity duration-300`}
    />
  );
}
