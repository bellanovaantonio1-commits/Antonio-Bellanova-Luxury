import {
  applyRounding,
  calculateShopPriceFromBase,
  DEFAULT_SHOP_PRICING_CONFIG,
  getUnitPriceForPayment,
  isStripePaymentAvailable,
  resolveCheckoutPaymentMethod,
  resolveProductPricing,
  roundUpToStep,
} from "../src/lib/shopPricing.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const config = DEFAULT_SHOP_PRICING_CONFIG;

// 1. Standardpreis 1000 → gleich für alle Zahlungsarten
{
  const r = resolveProductPricing({ pricingModel: "STANDARD", fixedSalePrice: 1000 }, config);
  assert(r.roundedShopPrice === 1000, "standard shop 1000");
  const stripe = getUnitPriceForPayment({ pricingModel: "STANDARD", price: "1000" }, "STRIPE");
  const bank = getUnitPriceForPayment({ pricingModel: "STANDARD", price: "1000" }, "BANK_TRANSFER");
  assert(stripe.payableUnitPrice === 1000 && bank.payableUnitPrice === 1000, "standard equal pay");
  assert(stripe.prepaymentDiscount === 0, "standard no discount");
}

// 2. Vorkasse 1000 → 1015.48 raw → 1020 shop → 1000 bank
{
  const r = resolveProductPricing({ pricingModel: "PREPAYMENT_DISCOUNT", basePrice: 1000 }, config);
  assert(r.calculatedStripePrice! > 1015 && r.calculatedStripePrice! < 1016, "raw ~1015.48");
  assert(r.roundedShopPrice === 1020, "shop 1020");
  assert(r.bankTransferDiscount === 20, "discount 20");
  const bank = getUnitPriceForPayment(
    {
      pricingModel: "PREPAYMENT_DISCOUNT",
      price: "1020",
      basePrice: "1000",
      bankTransferDiscount: "20",
    },
    "BANK_TRANSFER"
  );
  assert(bank.payableUnitPrice === 1000, "bank pays 1000");
}

// 3. Anderer Basispreis
{
  const r = resolveProductPricing({ pricingModel: "PREPAYMENT_DISCOUNT", basePrice: 5000 }, config);
  assert(r.basePrice === 5000, "base 5000");
  assert(r.roundedShopPrice >= 5000, "shop >= base");
}

// 4. Geänderte Stripe-Gebühr
{
  const lowFee = resolveProductPricing(
    { pricingModel: "PREPAYMENT_DISCOUNT", basePrice: 1000 },
    config
  );
  const highFee = resolveProductPricing(
    { pricingModel: "PREPAYMENT_DISCOUNT", basePrice: 1000 },
    { ...config, stripeFeePercent: 2.5 }
  );
  assert(highFee.calculatedStripePrice! > lowFee.calculatedStripePrice!, "higher fee → higher raw price");
  assert(highFee.roundedShopPrice > lowFee.roundedShopPrice, "higher fee → higher shop price");
}

// 5. Rundung 1 €, 10 €, 50 €
{
  assert(applyRounding(1015.48, 1, "ROUND_UP") === 1016, "round up 1");
  assert(roundUpToStep(1015.48, 10) === 1020, "round 10");
  const r50 = resolveProductPricing(
    { pricingModel: "PREPAYMENT_DISCOUNT", basePrice: 1000 },
    { ...config, roundingStep: 50 }
  );
  assert(r50.roundedShopPrice === 1050, "shop rounded to 50");
}

// 6. Mathematisch runden & abrunden
{
  assert(applyRounding(1015.48, 10, "ROUND") === 1020, "round math 10");
  assert(applyRounding(1015.48, 10, "ROUND_DOWN") === 1010, "round down 10");
}

// 7. Standard unverändert bei Neuberechnung
{
  const before = resolveProductPricing({ pricingModel: "STANDARD", fixedSalePrice: 10000 }, config);
  const after = resolveProductPricing({ pricingModel: "STANDARD", fixedSalePrice: 10000 }, {
    ...config,
    stripeFeePercent: 2.5,
  });
  assert(before.roundedShopPrice === after.roundedShopPrice, "standard ignores fee change");
}

// 8. Vorkasse neu berechnet mit neuer Gebühr
{
  const oldP = resolveProductPricing({ pricingModel: "PREPAYMENT_DISCOUNT", basePrice: 1000 }, config);
  const newP = resolveProductPricing(
    { pricingModel: "PREPAYMENT_DISCOUNT", basePrice: 1000 },
    { ...config, stripeFeePercent: 2.5 }
  );
  assert(newP.roundedShopPrice !== oldP.roundedShopPrice, "prepayment recalculates");
  assert(newP.bankTransferDiscount !== oldP.bankTransferDiscount, "discount recalculates");
}

// 9. Order snapshot amounts
{
  const line = getUnitPriceForPayment(
    {
      pricingModel: "PREPAYMENT_DISCOUNT",
      price: "1020",
      basePrice: "1000",
      bankTransferDiscount: "20",
    },
    "BANK_TRANSFER"
  );
  assert(line.shopUnitPrice === 1020 && line.payableUnitPrice === 1000, "snapshot amounts");
}

// 10. Checkout payment resolution
{
  const prevKey = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_checkout";
  const settings = {
    stripeEnabled: "true",
    bankTransferEnabled: "true",
    prepaymentEnabled: "true",
    paymentMethodsJson: JSON.stringify([
      { id: "STRIPE", enabled: true, name: "Stripe", description: "", sortOrder: 1 },
      { id: "PREPAYMENT", enabled: true, name: "Vorkasse", description: "", sortOrder: 2 },
    ]),
  };
  assert(resolveCheckoutPaymentMethod("PREPAYMENT", settings) === "BANK_TRANSFER", "prepayment → bank");
  assert(resolveCheckoutPaymentMethod("STRIPE", settings) === "STRIPE", "stripe stays");
  if (prevKey) process.env.STRIPE_SECRET_KEY = prevKey;
  else delete process.env.STRIPE_SECRET_KEY;
}

// 11. Stripe admin toggle without env key
{
  const prev = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  assert(!isStripePaymentAvailable({ stripeEnabled: "true" }), "no env → stripe off");
  process.env.STRIPE_SECRET_KEY = prev;
}

console.log("All pricing model tests passed.");
