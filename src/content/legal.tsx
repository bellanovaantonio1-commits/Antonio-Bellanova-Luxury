import { useShopSettings, formatAddressLines } from "../contexts/ShopSettingsContext.tsx";

export const FAQContent = () => (
  <div className="space-y-12">
    {[
      {
        q: "Sind alle Uhren und Schmuckstücke authentisch?",
        a: "Ja. Jedes Stück wird von unseren Experten geprüft und zertifiziert. Auf Wunsch stellen wir ein Echtheitszertifikat aus.",
      },
      {
        q: "Wie funktioniert der Versand?",
        a: "Wir versenden weltweit per DHL Express, UPS oder FedEx. Jede Sendung ist voll versichert. Innerhalb Deutschlands ist der Versand ab 500 € kostenlos.",
      },
      {
        q: "Kann ich eine Uhr reservieren?",
        a: "Ja, kontaktieren Sie uns per Telefon oder E-Mail. Reservierungen sind 48 Stunden gültig.",
      },
      {
        q: "Bieten Sie Ankauf und Inzahlungnahme an?",
        a: "Ja. Nutzen Sie unser Ankaufsformular oder vereinbaren Sie einen Termin in unserem Atelier in Köln.",
      },
      {
        q: "Welche Zahlungsmethoden akzeptieren Sie?",
        a: "Banküberweisung (SEPA), Vorkasse und auf Anfrage auch Ratenzahlung für ausgewählte Stücke. Kreditkartenzahlung folgt in Kürze.",
      },
      {
        q: "Gibt es ein Widerrufsrecht?",
        a: "Ja, gemäß unseren AGB haben Sie 14 Tage Widerrufsrecht. Details finden Sie unter Widerruf & Retouren.",
      },
    ].map((item, i) => (
      <section key={i} className="space-y-3 border-b border-white/10 pb-8">
        <h3 className="text-white text-lg font-serif">{item.q}</h3>
        <p className="text-white/80">{item.a}</p>
      </section>
    ))}
  </div>
);

export const PrivacyContent = () => {
  const s = useShopSettings();
  const address = formatAddressLines(s.contactAddress).join(", ");
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h3 className="text-white text-lg font-serif">1. Verantwortlicher</h3>
        <p className="text-white/80">
          {s.shopName}, {address}. E-Mail: {s.contactEmail}
        </p>
      </section>
      <section className="space-y-4">
        <h3 className="text-white text-lg font-serif">2. Erhebung und Speicherung personenbezogener Daten</h3>
        <p className="text-white/80">Wir erheben personenbezogene Daten, wenn Sie unsere Website besuchen, ein Konto erstellen, bestellen oder uns kontaktieren. Dazu gehören Name, E-Mail-Adresse, Lieferadresse und Zahlungsinformationen.</p>
      </section>
      <section className="space-y-4">
        <h3 className="text-white text-lg font-serif">3. Zweck der Datenverarbeitung</h3>
        <p className="text-white/80">Die Verarbeitung erfolgt zur Abwicklung von Bestellungen, zur Bearbeitung von Anfragen, zur Verbesserung unseres Angebots und zur Erfüllung gesetzlicher Pflichten.</p>
      </section>
      <section className="space-y-4">
        <h3 className="text-white text-lg font-serif">4. Ihre Rechte</h3>
        <p className="text-white/80">Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Kontaktieren Sie uns unter {s.contactEmail}.</p>
      </section>
      <section className="space-y-4">
        <h3 className="text-white text-lg font-serif">5. Cookies</h3>
        <p className="text-white/80">Wir verwenden technisch notwendige Cookies für den Betrieb der Website sowie optionale Cookies für Analysezwecke. Sie können Cookies in Ihren Browsereinstellungen deaktivieren.</p>
      </section>
    </div>
  );
};

export const TermsContent = () => (
  <div className="space-y-10">
    <section className="space-y-4">
      <h3 className="text-white text-lg font-serif">§ 1 Geltungsbereich</h3>
      <p className="text-white/80">Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen Antonio Bellanova Luxury und dem Kunden über den Erwerb von Uhren und Schmuck über unseren Online-Shop.</p>
    </section>
    <section className="space-y-4">
      <h3 className="text-white text-lg font-serif">§ 2 Vertragsschluss</h3>
      <p className="text-white/80">Die Darstellung der Produkte stellt kein rechtlich bindendes Angebot dar. Durch Absenden einer Bestellung geben Sie ein verbindliches Angebot ab. Der Vertrag kommt mit unserer Auftragsbestätigung per E-Mail zustande.</p>
    </section>
    <section className="space-y-4">
      <h3 className="text-white text-lg font-serif">§ 3 Preise und Zahlung</h3>
      <p className="text-white/80">Alle Preise verstehen sich in Euro inklusive der gesetzlichen Mehrwertsteuer. Die Zahlung erfolgt per Banküberweisung nach Erhalt der Auftragsbestätigung, sofern nicht anders vereinbart.</p>
    </section>
    <section className="space-y-4">
      <h3 className="text-white text-lg font-serif">§ 4 Lieferung</h3>
      <p className="text-white/80">Die Lieferung erfolgt nach Zahlungseingang per versichertem Expressversand. Lieferzeiten betragen in der Regel 2–5 Werktage innerhalb Deutschlands.</p>
    </section>
    <section className="space-y-4">
      <h3 className="text-white text-lg font-serif">§ 5 Gewährleistung</h3>
      <p className="text-white/80">Es gelten die gesetzlichen Gewährleistungsrechte. Bei gebrauchten Luxusuhren und Schmuck gelten die im Produkt angegebenen Zustandsbeschreibungen.</p>
    </section>
    <section className="space-y-4">
      <h3 className="text-white text-lg font-serif">§ 6 Widerrufsrecht</h3>
      <p className="text-white/80">Verbraucher haben ein 14-tägiges Widerrufsrecht ab Erhalt der Ware. Details entnehmen Sie unserer Widerrufsbelehrung.</p>
    </section>
  </div>
);

export const LegalContent = () => {
  const s = useShopSettings();
  const addressLines = formatAddressLines(s.contactAddress);
  return (
    <div className="space-y-8 text-white/80">
      <p>
        <strong className="text-white">{s.shopName}</strong>
        <br />
        {addressLines.map((line, i) => (
          <span key={i}>{line}{i < addressLines.length - 1 && <br />}</span>
        ))}
      </p>
      <p><strong className="text-white">Inhaber:</strong> {s.bankAccountHolder}</p>
      <p>
        <strong className="text-white">E-Mail:</strong> {s.contactEmail}
        <br />
        <strong className="text-white">Telefon:</strong> {s.contactPhone}
      </p>
      <p><strong className="text-white">USt-IdNr.:</strong> DE123456789 (Platzhalter)</p>
      <p><strong className="text-white">Verantwortlich für den Inhalt:</strong> {s.bankAccountHolder}</p>
      <p className="text-sm opacity-60">Online-Streitbeilegung: Die EU-Kommission stellt eine Plattform zur Online-Streitbeilegung bereit: https://ec.europa.eu/consumers/odr</p>
    </div>
  );
};
