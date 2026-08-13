const EU_COUNTRY_HINTS = [
  "österreich", "austria", "at",
  "frankreich", "france", "fr",
  "niederlande", "netherlands", "nl",
  "belgien", "belgium", "be",
  "italien", "italy", "it",
  "spanien", "spain", "es",
  "portugal", "pt",
  "luxemburg", "luxembourg", "lu",
  "irland", "ireland", "ie",
  "dänemark", "denmark", "dk",
  "schweden", "sweden", "se",
  "finnland", "finland", "fi",
  "polen", "poland", "pl",
  "tschechien", "czech", "cz",
  "ungarn", "hungary", "hu",
  "griechenland", "greece", "gr",
  "kroatien", "croatia", "hr",
  "slowenien", "slovenia", "si",
  "slowakei", "slovakia", "sk",
  "bulgarien", "bulgaria", "bg",
  "rumänien", "romania", "ro",
  "estland", "estonia", "ee",
  "lettland", "latvia", "lv",
  "litauen", "lithuania", "lt",
  "malta", "mt",
  "zypern", "cyprus", "cy",
];

export type ShippingMethod = "standard" | "express" | "pickup";

function isGermany(country: string): boolean {
  const c = country.trim().toLowerCase();
  return c === "de" || c === "deutschland" || c === "germany" || c.includes("deutsch");
}

function isEu(country: string): boolean {
  if (isGermany(country)) return true;
  const c = country.trim().toLowerCase();
  return EU_COUNTRY_HINTS.some((hint) => c === hint || c.includes(hint));
}

export function calculateShippingCost(
  country: string | undefined,
  settings: Record<string, string>,
  subtotalGross: number,
  method: ShippingMethod = "standard"
): number {
  if (method === "pickup") return 0;

  const freeFrom = parseFloat(settings.shippingFreeFrom || "500") || 500;
  if (method === "standard" && subtotalGross >= freeFrom) return 0;

  const deCost = method === "express"
    ? parseFloat(settings.shippingExpressCostDe || "49") || 49
    : parseFloat(settings.shippingCostDe || "0") || 0;
  const euCost = method === "express"
    ? parseFloat(settings.shippingExpressCostEu || "79") || 79
    : parseFloat(settings.shippingCostEu || "29") || 29;
  const worldCost = method === "express"
    ? parseFloat(settings.shippingExpressCostWorld || "129") || 129
    : parseFloat(settings.shippingCostWorld || "79") || 79;

  const target = (country || "Deutschland").trim();
  if (isGermany(target)) return deCost;
  if (isEu(target)) return euCost;
  return worldCost;
}

export function shippingZoneLabel(country: string | undefined, language: "de" | "en"): string {
  const target = (country || "Deutschland").trim();
  if (isGermany(target)) return language === "en" ? "Germany" : "Deutschland";
  if (isEu(target)) return language === "en" ? "EU" : "EU";
  return language === "en" ? "International" : "International";
}
