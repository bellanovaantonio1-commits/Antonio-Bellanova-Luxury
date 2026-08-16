import type { LegalDocumentKey, LegalLanguage } from "./types.ts";
import { LEGAL_DOCUMENT_LABELS } from "./types.ts";

type DefaultDoc = { title: string; contentHtml: string };

const impressumDe: DefaultDoc = {
  title: "Impressum",
  contentHtml: `
<section class="space-y-4"><h3 class="text-white text-lg font-serif">Angaben gemäß § 5 TMG</h3>
<p><strong>{{legalCompanyName}}</strong><br/>{{contactAddress}}</p>
<p><strong>Rechtsform:</strong> {{legalForm}}</p>
<p><strong>Vertretungsberechtigt:</strong> {{authorizedRepresentative}}</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">Kontakt</h3>
<p><strong>E-Mail:</strong> {{contactEmail}}<br/><strong>Telefon:</strong> {{contactPhone}}</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">Umsatzsteuer</h3>
<p><strong>USt-IdNr.:</strong> {{vatId}}<br/><strong>Steuernummer:</strong> {{taxNumber}}</p>
<p class="text-sm opacity-70">Sofern keine USt-IdNr. angegeben ist, kann eine Steuernummer erforderlich sein.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">Handelsregister</h3>
<p><strong>Registergericht:</strong> {{tradeRegisterCourt}}<br/><strong>Registernummer:</strong> {{tradeRegisterNumber}}</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">Wirtschafts-Identifikationsnummer</h3><p>{{economicId}}</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">Aufsichtsbehörde</h3><p>{{supervisoryAuthority}}</p>
<p class="text-sm opacity-70">Nur erforderlich, wenn eine zuständige Aufsichtsbehörde besteht.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">Verantwortlich für den Inhalt (§ 18 Abs. 2 MStV)</h3><p>{{contentResponsible}}</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">EU-Streitbeilegung</h3>
<p class="text-sm">Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" class="text-[#c5a059] underline">https://ec.europa.eu/consumers/odr</a>.</p>
<p class="text-sm">Wir sind nicht verpflichtet und grundsätzlich nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p></section>`,
};

const impressumEn: DefaultDoc = {
  title: "Legal Notice",
  contentHtml: impressumDe.contentHtml
    .replace(/Angaben gemäß § 5 TMG/g, "Information pursuant to § 5 TMG (German Telemedia Act)")
    .replace(/Rechtsform/g, "Legal form")
    .replace(/Vertretungsberechtigt/g, "Authorized representative")
    .replace(/Kontakt/g, "Contact")
    .replace(/Umsatzsteuer/g, "VAT")
    .replace(/Steuernummer/g, "Tax number")
    .replace(/Handelsregister/g, "Commercial register")
    .replace(/Registergericht/g, "Register court")
    .replace(/Registernummer/g, "Register number")
    .replace(/Wirtschafts-Identifikationsnummer/g, "Economic ID")
    .replace(/Aufsichtsbehörde/g, "Supervisory authority")
    .replace(/Verantwortlich für den Inhalt/g, "Responsible for content")
    .replace(/EU-Streitbeilegung/g, "EU dispute resolution"),
};

const privacyDe: DefaultDoc = {
  title: "Datenschutzerklärung",
  contentHtml: `
<section class="space-y-4"><h3 class="text-white text-lg font-serif">1. Verantwortlicher</h3>
<p>{{legalCompanyName}}, {{contactAddress}}<br/>E-Mail: {{contactEmail}} · Telefon: {{contactPhone}}</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">2. Überblick der Verarbeitungen</h3>
<p>Wir verarbeiten personenbezogene Daten nur, soweit dies zur Bereitstellung unseres Online-Shops, zur Vertragsabwicklung, zur Kommunikation oder zur Erfüllung gesetzlicher Pflichten erforderlich ist.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">3. Hosting und Server-Logfiles</h3>
<p>Unser Online-Shop wird auf Servern eines Hosting-Anbieters betrieben (z.&nbsp;B. Render). Dabei werden technisch erforderliche Daten verarbeitet (IP-Adresse, Datum/Uhrzeit, aufgerufene Seite, User-Agent). Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am sicheren Betrieb).</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">4. Datenbank (PostgreSQL)</h3>
<p>Bestell-, Kunden-, Produkt- und Einstellungsdaten werden in einer PostgreSQL-Datenbank gespeichert. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertrag) bzw. lit. c (rechtliche Pflichten).</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">5. Kundenkonto (Firebase Authentication)</h3>
<p>Für Registrierung und Anmeldung nutzen wir Firebase Authentication (Google Ireland Limited / Google LLC). Verarbeitet werden u.&nbsp;a. E-Mail-Adresse, Authentifizierungs-Identifikator und Anmeldezeitpunkt. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Anbieter: Google; ggf. Drittlandübermittlung (USA) auf Basis geeigneter Garantien.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">6. Bestellungen und Zahlung</h3>
<p><strong>Stripe:</strong> Bei Kartenzahlung leiten wir Sie zu Stripe Checkout weiter. Stripe verarbeitet Zahlungsdaten als eigenständiger Verantwortlicher/Zahlungsdienstleister. Übermittelt werden u.&nbsp;a. Bestellbetrag, Währung, E-Mail, Session-/Zahlungsreferenzen. Statusmeldungen erfolgen per Webhook. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.</p>
<p><strong>Banküberweisung / Vorkasse:</strong> Bei Vorkasse speichern wir Bestell- und Kontaktdaten zur Abwicklung; Bankdaten des Kunden werden nicht gespeichert.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">7. E-Mail-Versand (Resend)</h3>
<p>Transaktions-E-Mails (Bestellbestätigung, Rechnung, Anfragen) werden über Resend versendet. Verarbeitet werden E-Mail-Adresse, Name und Bestellinhalt. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">8. Kontaktformular, Anfragen, Termine</h3>
<p>Bei Kontaktaufnahme verarbeiten wir die von Ihnen eingegebenen Daten zur Bearbeitung Ihrer Anfrage. Rechtsgrundlage: Art. 6 Abs. 1 lit. b bzw. lit. f DSGVO.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">9. Newsletter</h3>
<p>Bei Newsletter-Anmeldung speichern wir Ihre E-Mail-Adresse. Eine Double-Opt-in-Bestätigung ist vorgesehen. Rechtsgrundlage nach erfolgter Anmeldung: Art. 6 Abs. 1 lit. a DSGVO. Widerruf jederzeit möglich.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">10. Cookies und lokale Speicherung</h3>
<p><strong>Technisch notwendig:</strong> Session-/Funktionsdaten (z.&nbsp;B. Spracheinstellung, Warenkorb, Anmeldestatus über Firebase, Cookie-Einwilligung in localStorage).</p>
<p><strong>Optionale Einwilligung:</strong> Über unser Cookie-Banner können Sie der Speicherung optionaler Einstellungen zustimmen. Derzeit setzen wir keine eigenständigen Analyse-/Marketing-Cookies ein, sofern nicht gesondert aktiviert.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">11. WhatsApp-Link</h3>
<p>Ein WhatsApp-Button verlinkt auf den externen Dienst Meta/WhatsApp. Erst bei Nutzung des Links gelten die Datenschutzbestimmungen des Anbieters.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">12. Speicherdauer</h3>
<p>Personenbezogene Daten werden gelöscht, sobald der Zweck entfällt und keine gesetzlichen Aufbewahrungspflichten entgegenstehen (z.&nbsp;B. handels- und steuerrechtliche Fristen).</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">13. Ihre Rechte</h3>
<p>Sie haben Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch. Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde. Kontakt: {{contactEmail}}</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">14. Hinweis zur Prüfung</h3>
<p class="text-sm opacity-70">Diese Datenschutzerklärung basiert auf der tatsächlichen technischen Architektur des Shops. Vor Livegang wird empfohlen, sie anwaltlich zu prüfen.</p></section>`,
};

const privacyEn: DefaultDoc = {
  title: "Privacy Policy",
  contentHtml: privacyDe.contentHtml.replace(/Datenschutzerklärung/g, "Privacy Policy"),
};

const termsDe: DefaultDoc = {
  title: "Allgemeine Geschäftsbedingungen",
  contentHtml: `
<section class="space-y-4"><h3 class="text-white text-lg font-serif">§ 1 Geltungsbereich</h3>
<p>Diese AGB gelten für Verträge zwischen {{legalCompanyName}} (nachfolgend „wir“) und Kunden über den Online-Shop {{shopBrandName}} über den Erwerb von Uhren und Schmuck. Abweichende Bedingungen des Kunden gelten nur bei ausdrücklicher schriftlicher Zustimmung.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">§ 2 Vertragspartner</h3>
<p>Vertragspartner ist {{legalCompanyName}}, {{contactAddress}}. Kontakt: {{contactEmail}}, {{contactPhone}}.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">§ 3 Vertragsschluss</h3>
<p>Produktdarstellungen sind unverbindliche Angebote. Mit Absenden der Bestellung geben Sie ein verbindliches Angebot ab. Der Vertrag kommt mit unserer Auftragsbestätigung per E-Mail zustande. Bei Stripe-Zahlung mit anschließender erfolgreicher Zahlungsbestätigung kommt der Vertrag mit Zahlungseingang zustande.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">§ 4 Produktdarstellung und Produktinformationen</h3>
<p>Angaben zu Marke, Modell, Referenz, Zustand, Lieferumfang und Bildern basieren auf sorgfältiger Prüfung. Gebrauchte Luxusuhren und Schmuck weisen altersbedingte Gebrauchsspuren auf; der konkrete Zustand ergibt sich aus der Produktbeschreibung.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">§ 5 Preise und Preisberechnung</h3>
<p>Alle Preise sind Endpreise in Euro inkl. gesetzlicher Mehrwertsteuer, sofern nicht anders ausgewiesen. {{marginTaxNoteDe}}</p>
<p>Je nach gewählter Zahlungsart kann der zu zahlende Gesamtpreis abweichen (z.&nbsp;B. Vorkasse-Rabatt bei Banküberweisung). Der im Checkout ausgewiesene Gesamtbetrag ist maßgeblich.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">§ 6 Zahlungsarten</h3>
<p><strong>Stripe:</strong> Sichere Online-Zahlung per Karte über Stripe Checkout.</p>
<p><strong>Banküberweisung / Vorkasse:</strong> Zahlung per Überweisung nach Bestellung; Versand nach vollständigem Zahlungseingang, sofern nicht anders vereinbart.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">§ 7 Lieferung und Versand</h3>
<p>Lieferung erfolgt versichert an die angegebene Adresse oder nach Abholvereinbarung. Versandkosten und Lieferzeiten ergeben sich aus den Versandinformationen im Shop.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">§ 8 Eigentumsvorbehalt</h3>
<p>Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">§ 9 Zustand gebrauchter Waren</h3>
<p>Bei gebrauchten Uhren und Schmuck ist der vereinbarte Zustand maßgeblich. Dies entbindet nicht von gesetzlichen Mängelrechten bei Sachmängeln.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">§ 10 Gewährleistung / Mängelrechte</h3>
<p>Es gelten die gesetzlichen Gewährleistungsrechte. Freiwillige Garantien oder Herstellergarantien gelten nur, wenn ausdrücklich im Produkt oder Vertrag genannt.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">§ 11 Haftung</h3>
<p>Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper oder Gesundheit. Im Übrigen haften wir bei leichter Fahrlässigkeit nur bei Verletzung wesentlicher Vertragspflichten, begrenzt auf den vorhersehbaren Schaden.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">§ 12 Widerrufsrecht</h3>
<p>Verbrauchern steht ein gesetzliches Widerrufsrecht zu. Einzelheiten ergeben sich aus unserer Widerrufsbelehrung.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">§ 13 Echtheitszertifikate</h3>
<p>Sofern ausgestellt, dokumentiert ein Echtheitszertifikat die im Rahmen unseres Verkaufsprozesses durchgeführten Prüfungen und die im System hinterlegten Produktdaten. Es stellt keine unabhängige Herstellergarantie und keine pauschale „100&nbsp;%-Garantie“ dar, sofern nicht ausdrücklich anders vereinbart.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">§ 14 Datenschutz</h3>
<p>Informationen zur Datenverarbeitung finden Sie in unserer Datenschutzerklärung.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">§ 15 Schlussbestimmungen</h3>
<p>Es gilt deutsches Recht unter Beachtung zwingender Verbraucherschutzvorschriften. Gerichtsstand für Kaufleute ist Köln. Auktionsbedingungen werden bei Einführung einer Auktionsfunktion gesondert veröffentlicht.</p>
<p class="text-sm opacity-70">Diese AGB ersetzen keine individuelle anwaltliche Prüfung.</p></section>`,
};

const termsEn: DefaultDoc = {
  title: "Terms & Conditions",
  contentHtml: termsDe.contentHtml
    .replace(/Allgemeine Geschäftsbedingungen/g, "Terms & Conditions")
    .replace(/{{marginTaxNoteDe}}/g, "{{marginTaxNoteEn}}"),
};

const withdrawalDe: DefaultDoc = {
  title: "Widerrufsbelehrung",
  contentHtml: `
<section class="space-y-4"><h3 class="text-white text-lg font-serif">Widerrufsrecht</h3>
<p>Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.</p>
<p>Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter, der nicht Beförderer ist, die Waren in Besitz genommen haben.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">Ausübung des Widerrufs</h3>
<p>Um Ihr Widerrufsrecht auszuüben, müssen Sie uns</p>
<p>{{legalCompanyName}}<br/>{{contactAddress}}<br/>E-Mail: {{contactEmail}}</p>
<p>mittels einer eindeutigen Erklärung (z.&nbsp;B. per E-Mail oder Post) über Ihren Entschluss informieren. Sie können dafür das Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">Folgen des Widerrufs</h3>
<p>Im Falle eines wirksamen Widerrufs sind die beiderseits empfangenen Leistungen zurückzugewähren. Sie tragen die unmittelbaren Kosten der Rücksendung, sofern nicht anders vereinbart.</p>
<p>Wir erstatten alle Zahlungen einschließlich Standard-Lieferkosten unverzüglich und spätestens binnen vierzehn Tagen ab Eingang Ihrer Widerrufserklärung. Für die Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">Wertminderung</h3>
<p>Sie müssen für einen Wertverlust der Waren nur aufkommen, wenn dieser auf einen zur Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise nicht notwendigen Umgang zurückzuführen ist.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">Ausschluss bzw. vorzeitiges Erlöschen</h3>
<p>Das Widerrufsrecht kann u.&nbsp;a. nicht bestehen bei Waren, die nach Kundenspezifikation angefertigt wurden, bei versiegelten Waren aus Gründen des Gesundheitsschutzes oder der Hygiene nach Entsiegelung, oder bei bestimmten Sonderfällen nach § 312g BGB. Prüfen Sie im Einzelfall, ob ein Ausschluss greift.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">Muster-Widerrufsformular</h3>
<p>Ein Musterformular finden Sie unter <a href="/withdrawal-form" class="text-[#c5a059] underline">/withdrawal-form</a>.</p></section>`,
};

const withdrawalEn: DefaultDoc = {
  title: "Cancellation / Withdrawal Policy",
  contentHtml: withdrawalDe.contentHtml.replace(/Widerrufsbelehrung/g, "Withdrawal Policy"),
};

const withdrawalFormDe: DefaultDoc = {
  title: "Muster-Widerrufsformular",
  contentHtml: `
<section class="space-y-6">
<p class="text-sm opacity-70">Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses Formular aus und senden Sie es zurück.</p>
<p><a href="/api/legal/withdrawal-form/pdf?lang=de" class="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-[#c5a059] border border-[#c5a059]/30 px-4 py-2 hover:bg-[#c5a059]/10 transition-colors" download>Widerrufsformular als PDF</a></p>
<div class="bg-white/5 p-6 rounded-xl border border-white/10 space-y-6 text-sm leading-relaxed">
<div>
<p class="text-white/50 mb-2">An</p>
<p>{{legalCompanyName}}<br/>{{contactAddress}}<br/>E-Mail: {{contactEmail}}</p>
</div>
<div class="space-y-2">
<p>Hiermit widerrufe(n) ich/wir den von mir/uns abgeschlossenen Vertrag über den Kauf der folgenden Waren / die Erbringung der folgenden Dienstleistung:</p>
<p class="mt-3 min-h-[1.75rem] border-b border-white/25"></p>
</div>
<div class="space-y-2">
<p>Bestellt am / erhalten am</p>
<p class="mt-3 min-h-[1.75rem] border-b border-white/25"></p>
</div>
<div class="space-y-2">
<p>Name des/der Verbraucher(s)</p>
<p class="mt-3 min-h-[1.75rem] border-b border-white/25"></p>
</div>
<div class="space-y-2">
<p>Anschrift des/der Verbraucher(s)</p>
<p class="mt-3 min-h-[1.75rem] border-b border-white/25"></p>
<p class="mt-6 min-h-[1.75rem] border-b border-white/25"></p>
</div>
<div class="space-y-2">
<p>Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)</p>
<p class="mt-3 min-h-[1.75rem] border-b border-white/25"></p>
</div>
<div class="space-y-2">
<p>Datum</p>
<p class="mt-3 min-h-[1.75rem] border-b border-white/25"></p>
</div>
</div>
</section>`,
};

const withdrawalFormEn: DefaultDoc = {
  title: "Withdrawal Form",
  contentHtml: `
<section class="space-y-6">
<p class="text-sm opacity-70">If you wish to withdraw from the contract, please complete this form and send it back.</p>
<p><a href="/api/legal/withdrawal-form/pdf?lang=en" class="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-[#c5a059] border border-[#c5a059]/30 px-4 py-2 hover:bg-[#c5a059]/10 transition-colors" download>Download withdrawal form (PDF)</a></p>
<div class="bg-white/5 p-6 rounded-xl border border-white/10 space-y-6 text-sm leading-relaxed">
<div>
<p class="text-white/50 mb-2">To</p>
<p>{{legalCompanyName}}<br/>{{contactAddress}}<br/>E-Mail: {{contactEmail}}</p>
</div>
<div class="space-y-2">
<p>I/We hereby give notice that I/We withdraw from my/our contract of sale of the following goods / for the provision of the following service:</p>
<p class="mt-3 min-h-[1.75rem] border-b border-white/25"></p>
</div>
<div class="space-y-2">
<p>Ordered on / received on</p>
<p class="mt-3 min-h-[1.75rem] border-b border-white/25"></p>
</div>
<div class="space-y-2">
<p>Name of consumer(s)</p>
<p class="mt-3 min-h-[1.75rem] border-b border-white/25"></p>
</div>
<div class="space-y-2">
<p>Address of consumer(s)</p>
<p class="mt-3 min-h-[1.75rem] border-b border-white/25"></p>
<p class="mt-6 min-h-[1.75rem] border-b border-white/25"></p>
</div>
<div class="space-y-2">
<p>Signature of consumer(s) (only if this form is submitted on paper)</p>
<p class="mt-3 min-h-[1.75rem] border-b border-white/25"></p>
</div>
<div class="space-y-2">
<p>Date</p>
<p class="mt-3 min-h-[1.75rem] border-b border-white/25"></p>
</div>
</div>
</section>`,
};

const shippingDe: DefaultDoc = {
  title: "Versand & Lieferung",
  contentHtml: `
<section class="space-y-4"><h3 class="text-white text-lg font-serif">Versand</h3>
<p>Wir versenden hochwertige Uhren und Schmuck versichert. Standard- und Expressversand sind im Checkout wählbar. Abholung im Atelier ist nach Terminvereinbarung möglich: {{pickupNoteDe}}</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">Versandkosten (Richtwerte)</h3>
<ul class="list-disc pl-6 space-y-2"><li>Deutschland: ab {{shippingCostDe}} € (kostenlos ab {{shippingFreeFrom}} € Bestellwert)</li>
<li>EU: ab {{shippingCostEu}} €</li><li>International: ab {{shippingCostWorld}} €</li></ul>
<p class="text-sm opacity-70">Der im Checkout berechnete Betrag ist maßgeblich.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">Lieferzeit</h3>
<p>Bei Banküberweisung/Vorkasse erfolgt der Versand nach Zahlungseingang. Bei Stripe nach erfolgreicher Zahlungsbestätigung. Lieferzeiten hängen von Zielort und Verfügbarkeit ab.</p></section>`,
};

const shippingEn: DefaultDoc = {
  title: "Shipping & Delivery",
  contentHtml: shippingDe.contentHtml
    .replace(/{{pickupNoteDe}}/g, "{{pickupNoteEn}}")
    .replace(/Versand & Lieferung/g, "Shipping & Delivery"),
};

const paymentDe: DefaultDoc = {
  title: "Zahlungsarten",
  contentHtml: `
<section class="space-y-4"><h3 class="text-white text-lg font-serif">Stripe (Online-Zahlung)</h3>
<p>Sichere Zahlung per Kredit-/Debitkarte über Stripe Checkout. Der im Checkout ausgewiesene Stripe-Gesamtpreis ist zu zahlen.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">Banküberweisung / Vorkasse</h3>
<p>Sie überweisen den im Checkout ausgewiesenen Gesamtbetrag auf unser Konto. {{paymentInstructions}}</p>
<p><strong>Empfänger:</strong> {{bankAccountHolder}}<br/><strong>IBAN:</strong> {{bankIban}}<br/><strong>BIC:</strong> {{bankBic}}<br/><strong>Bank:</strong> {{bankName}}</p>
<p>Bei dieser Zahlungsart kann ein Vorkasse-Rabatt gegenüber dem Stripe-Preis gewährt werden, sofern im Checkout ausgewiesen.</p></section>
<section class="space-y-4"><h3 class="text-white text-lg font-serif">Preistransparenz</h3>
<p>Alle Preise inkl. MwSt. Der zu zahlende Gesamtbetrag inkl. Versand und ggf. Rabatt wird vor Abschluss der Bestellung im Checkout angezeigt.</p></section>`,
};

const paymentEn: DefaultDoc = {
  title: "Payment Methods",
  contentHtml: paymentDe.contentHtml.replace(/Zahlungsarten/g, "Payment Methods"),
};

const MAP: Record<LegalDocumentKey, Record<LegalLanguage, DefaultDoc>> = {
  impressum: { de: impressumDe, en: impressumEn },
  privacy: { de: privacyDe, en: privacyEn },
  terms: { de: termsDe, en: termsEn },
  withdrawal: { de: withdrawalDe, en: withdrawalEn },
  withdrawal_form: { de: withdrawalFormDe, en: withdrawalFormEn },
  shipping: { de: shippingDe, en: shippingEn },
  payment: { de: paymentDe, en: paymentEn },
};

export function getDefaultLegalDocument(key: LegalDocumentKey, lang: LegalLanguage): DefaultDoc {
  const doc = MAP[key][lang];
  return {
    title: doc.title || LEGAL_DOCUMENT_LABELS[key][lang],
    contentHtml: doc.contentHtml.trim(),
  };
}

export function getAllDefaultDocuments(): { key: LegalDocumentKey; lang: LegalLanguage; doc: DefaultDoc }[] {
  const result: { key: LegalDocumentKey; lang: LegalLanguage; doc: DefaultDoc }[] = [];
  for (const key of Object.keys(MAP) as LegalDocumentKey[]) {
    for (const lang of ["de", "en"] as LegalLanguage[]) {
      result.push({ key, lang, doc: getDefaultLegalDocument(key, lang) });
    }
  }
  return result;
}
