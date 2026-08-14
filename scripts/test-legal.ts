import { renderLegalTemplate, getMissingCompanyFields } from "../src/server/legal/placeholders.ts";
import { getDefaultLegalDocument } from "../src/server/legal/defaults.ts";
import { LEGAL_DOCUMENT_KEYS } from "../src/server/legal/types.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// 1. Placeholder rendering — empty VAT shows marker
{
  const html = renderLegalTemplate("USt: {{vatId}}", { vatId: "" }, "de");
  assert(html.includes("Angabe erforderlich"), "missing vat marker DE");
}

// 2. All default documents exist DE + EN
{
  for (const key of LEGAL_DOCUMENT_KEYS) {
    const de = getDefaultLegalDocument(key, "de");
    const en = getDefaultLegalDocument(key, "en");
    assert(de.contentHtml.length > 100, `${key} DE content`);
    assert(en.contentHtml.length > 100, `${key} EN content`);
  }
}

// 3. Privacy mentions only integrated services
{
  const privacy = getDefaultLegalDocument("privacy", "de").contentHtml;
  assert(privacy.includes("Stripe"), "privacy stripe");
  assert(privacy.includes("Firebase"), "privacy firebase");
  assert(privacy.includes("Resend"), "privacy resend");
  assert(!privacy.includes("Google Analytics"), "no fake analytics");
}

// 4. Terms mention certificates cautiously
{
  const terms = getDefaultLegalDocument("terms", "de").contentHtml;
  assert(terms.includes("Echtheitszertifikat"), "terms certificate section");
  assert(terms.includes("keine pauschale"), "terms avoids blanket guarantee");
}

// 5. Withdrawal form uses placeholders
{
  const form = getDefaultLegalDocument("withdrawal_form", "de").contentHtml;
  assert(form.includes("{{legalCompanyName}}"), "form company placeholder");
}

// 6. Missing company fields detection
{
  const missing = getMissingCompanyFields({ legalCompanyName: "", contactEmail: "a@b.de", contactAddress: "x", contactPhone: "1" });
  assert(missing.includes("legalCompanyName"), "detect missing name");
  assert(missing.includes("vatId_or_taxNumber"), "detect missing tax id");
}

// 7. Payment doc mentions bank + stripe
{
  const pay = getDefaultLegalDocument("payment", "de").contentHtml;
  assert(pay.includes("Stripe"), "payment stripe");
  assert(pay.includes("Banküberweisung"), "payment bank");
}

console.log("All legal tests passed.");
