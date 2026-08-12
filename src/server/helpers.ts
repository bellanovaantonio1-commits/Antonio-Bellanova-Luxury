export function generateOrderNumber(): string {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${Date.now().toString().slice(-8)}-${suffix}`;
}

export const DEFAULT_SHOP_SETTINGS: Record<string, unknown> = {
  shopName: "ANTONIO BELLANOVA LUXURY",
  contactEmail: "antonio.bellanova@luxury.com",
  contactPhone: "+49 (0) 221 123 456",
  bankName: "Commerzbank AG",
  bankIban: "DE89 3704 0044 0532 0130 00",
  bankBic: "COBADEFFXXX",
  bankAccountHolder: "Antonio Bellanova Luxury GmbH",
  paymentInstructionsDe: "Bitte überweisen Sie den Betrag unter Angabe Ihrer Bestellnummer als Verwendungszweck.",
  paymentInstructionsEn: "Please transfer the amount using your order number as payment reference.",
};
