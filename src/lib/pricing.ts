export type TaxTreatment = "REGULAR" | "MARGIN" | "CHECK";

export interface PricingInput {
  // 1. Purchase
  purchasePriceOriginal: number;
  purchaseCurrency: string;
  exchangeRate: number;
  purchasePriceEur: number; // Manually editable

  // 2. Import & Customs
  shippingCost: number;
  insuranceCost: number;
  
  originCountry: string;
  dispatchCountry: string;
  destinationCountry: string; // Default "DE"
  
  type: string; // e.g. "WATCH", "JEWELRY"
  material?: string;
  movement?: string;
  hsCode?: string;
  customsRatePercent: number | null; // null if needs checking
  manualCustomsAmountEur?: number | null; // Override for total customs
  
  // 3. Other Costs
  customsBrokerFee: number;
  customsClearanceFee: number;
  otherImportCosts: number;

  // 4. Tax Treatment
  taxTreatment: TaxTreatment;
  isInputTaxDeductible: boolean;
  taxRatePercent: number; // e.g. 19

  // 5. Margin Calculation
  calculationMode: "MARGIN" | "SALE_PRICE";
  targetMarginPercent: number;
  manualGrossSalePrice: number;
}

export interface PricingResult {
  // Step 1
  purchasePriceEur: number;
  
  // Step 2
  provisionalCustomsValue: number;
  customsAmountEur: number;
  customsRateInfo: {
    rate: number | null;
    hsCode: string;
    isEstimated: boolean;
    needsCheck: boolean;
  };

  // Step 3
  landedCost: number;
  
  // Step 4
  importVatEur: number;
  importVatImpactOnLandedCost: number;

  // Step 5
  netSalePrice: number;
  grossSalePrice: number;
  taxAmountEur: number;
  profitEur: number;
  effectiveMarginPercent: number;
}

/**
 * Basic HS Code and Rate Determination (Simple version, non-fictional)
 */
export function determineCustomsRate(category: string, material?: string, movement?: string): { hsCode: string, rate: number | null, needsCheck: boolean } {
  const cat = category?.toUpperCase();
  const mat = material?.toUpperCase() || "";
  const mov = movement?.toUpperCase() || "";

  if (cat === "WATCH") {
    // 9101: Watches with case of precious metal
    if (mat.includes("GOLD") || mat.includes("PLATINUM") || mat.includes("PRECIOUS") || mat.includes("SILVER")) {
      return { hsCode: "9101", rate: 0.8, needsCheck: false }; // Often capped or specific unit rates apply (e.g. 0.80 EUR per piece with min/max)
    }
    // 9102: Other watches (steel, etc.)
    return { hsCode: "9102", rate: 4.5, needsCheck: false }; // Typical EU rate for non-precious metal watches is 4.5% (max 0.80 EUR per item)
  }

  if (cat === "JEWELRY") {
    if (mat.includes("GOLD")) return { hsCode: "71131900", rate: 2.5, needsCheck: false };
    if (mat.includes("SILVER")) return { hsCode: "71131100", rate: 2.5, needsCheck: false };
    return { hsCode: "7113", rate: 2.5, needsCheck: true };
  }

  return { hsCode: "UNKNOWN", rate: null, needsCheck: true };
}

export function calculatePricing(input: PricingInput): PricingResult {
  // 1. Purchase EUR
  const purchasePriceEur = input.purchasePriceEur;

  // 2. Import & Customs
  const shipping = Number(input.shippingCost) || 0;
  const insurance = Number(input.insuranceCost) || 0;
  const provisionalCustomsValue = purchasePriceEur + shipping + insurance;

  // Determine Customs Rate (EU Import Logic)
  const isEuOrigin = ["DE", "AT", "BE", "BG", "CY", "CZ", "DK", "EE", "FI", "FR", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"].includes(input.originCountry?.toUpperCase());
  
  let customsRate = 0;
  let hsCode = input.hsCode || "";
  let needsCheck = false;

  if (isEuOrigin) {
    customsRate = 0; // Intra-EU trade
    hsCode = "INTRA-EU";
  } else if (input.customsRatePercent !== null) {
    customsRate = input.customsRatePercent;
  } else {
    const determined = determineCustomsRate(input.type, input.material, input.movement);
    customsRate = determined.rate || 0;
    hsCode = hsCode || determined.hsCode;
    needsCheck = determined.needsCheck || determined.rate === null;
  }

  let customsAmountEur = provisionalCustomsValue * (customsRate / 100);

  // Manual Override for Customs Amount
  if (input.manualCustomsAmountEur !== undefined && input.manualCustomsAmountEur !== null) {
    customsAmountEur = Number(input.manualCustomsAmountEur);
  }

  // 3. Landed Cost
  const broker = Number(input.customsBrokerFee) || 0;
  const clearance = Number(input.customsClearanceFee) || 0;
  const other = Number(input.otherImportCosts) || 0;

  // 4. Tax (Import VAT)
  const importVatRate = input.taxRatePercent / 100;
  const importVatEur = (provisionalCustomsValue + customsAmountEur) * importVatRate;
  
  // If not deductible, it's a cost
  const importVatImpact = input.isInputTaxDeductible ? 0 : importVatEur;

  const landedCost = purchasePriceEur + shipping + insurance + customsAmountEur + broker + clearance + other + importVatImpact;

  // 5. Margin Calculation
  let netSalePrice = 0;
  let grossSalePrice = 0;
  let taxAmountEur = 0;

  const taxRate = input.taxRatePercent / 100;

  if (input.calculationMode === "MARGIN") {
    const targetMargin = input.targetMarginPercent / 100;
    
    if (input.taxTreatment === "MARGIN") {
      // §25a logic: Net Sale = LandedCost + NetMargin
      // Gross = LandedCost + NetMargin * (1 + Tax)
      // Margin % = (NetMargin / NetSale)
      // NetMargin = targetMargin * NetSale
      // NetSale = LandedCost + targetMargin * NetSale
      // NetSale * (1 - targetMargin) = LandedCost
      netSalePrice = landedCost / (1 - targetMargin);
      const netMargin = netSalePrice - landedCost;
      const grossMargin = netMargin * (1 + taxRate);
      grossSalePrice = landedCost + grossMargin;
      taxAmountEur = grossMargin - netMargin;
    } else {
      // Regular taxation: Net Sale = LandedCost / (1 - targetMargin)
      netSalePrice = landedCost / (1 - targetMargin);
      grossSalePrice = netSalePrice * (1 + taxRate);
      taxAmountEur = grossSalePrice - netSalePrice;
    }
  } else {
    // Manual Sale Price mode
    grossSalePrice = input.manualGrossSalePrice;
    
    if (input.taxTreatment === "MARGIN") {
      const grossMargin = Math.max(0, grossSalePrice - landedCost);
      const netMargin = grossMargin / (1 + taxRate);
      netSalePrice = landedCost + netMargin;
      taxAmountEur = grossMargin - netMargin;
    } else {
      netSalePrice = grossSalePrice / (1 + taxRate);
      taxAmountEur = grossSalePrice - netSalePrice;
    }
  }

  const profitEur = netSalePrice - landedCost;
  const effectiveMarginPercent = netSalePrice !== 0 ? (profitEur / netSalePrice) * 100 : 0;

  return {
    purchasePriceEur,
    provisionalCustomsValue,
    customsAmountEur,
    customsRateInfo: {
      rate: isEuOrigin ? 0 : customsRate,
      hsCode,
      isEstimated: !input.hsCode,
      needsCheck
    },
    landedCost,
    importVatEur,
    importVatImpactOnLandedCost: importVatImpact,
    netSalePrice,
    grossSalePrice,
    taxAmountEur,
    profitEur,
    effectiveMarginPercent
  };
}
