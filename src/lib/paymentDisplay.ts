export type PaymentDisplayId =
  | "stripe"
  | "apple_pay"
  | "google_pay"
  | "visa"
  | "mastercard"
  | "amex"
  | "paypal"
  | "klarna"
  | "bank_transfer";

export interface PaymentDisplayMethod {
  id: PaymentDisplayId;
  labelDe: string;
  labelEn: string;
}
