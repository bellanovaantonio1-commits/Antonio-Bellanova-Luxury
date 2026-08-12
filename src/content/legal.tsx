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
        <p>{item.a}</p>
      </section>
    ))}
  </div>
);

export const PrivacyContent = () => (
  <div className="space-y-10">
    <section className="space-y-4">
      <h3 className="text-white text-lg font-serif">1. Verantwortlicher</h3>
      <p>Antonio Bellanova Luxury, Ahornstraße 8, 50765 Köln, Deutschland. E-Mail: antonio.bellanova@luxury.com</p>
    </section>
    <section className="space-y-4">
      <h3 className="text-white text-lg font-serif">2. Erhebung und Speicherung personenbezogener Daten</h3>
      <p>Wir erheben personenbezogene Daten, wenn Sie unsere Website besuchen, ein Konto erstellen, bestellen oder uns kontaktieren. Dazu gehören Name, E-Mail-Adresse, Lieferadresse und Zahlungsinformationen.</p>
    </section>
    <section className="space-y-4">
      <h3 className="text-white text-lg font-serif">3. Zweck der Datenverarbeitung</h3>
      <p>Die Verarbeitung erfolgt zur Abwicklung von Bestellungen, zur Bearbeitung von Anfragen, zur Verbesserung unseres Angebots und zur Erfüllung gesetzlicher Pflichten.</p>
    </section>
    <section className="space-y-4">
      <h3 className="text-white text-lg font-serif">4. Ihre Rechte</h3>
      <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Kontaktieren Sie uns unter antonio.bellanova@luxury.com.</p>
    </section>
    <section className="space-y-4">
      <h3 className="text-white text-lg font-serif">5. Cookies</h3>
      <p>Wir verwenden technisch notwendige Cookies für den Betrieb der Website sowie optionale Cookies für Analysezwecke. Sie können Cookies in Ihren Browsereinstellungen deaktivieren.</p>
    </section>
  </div>
);

export const TermsContent = () => (
  <div className="space-y-10">
    <section className="space-y-4">
      <h3 className="text-white text-lg font-serif">§ 1 Geltungsbereich</h3>
      <p>Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen Antonio Bellanova Luxury und dem Kunden über den Erwerb von Uhren und Schmuck über unseren Online-Shop.</p>
    </section>
    <section className="space-y-4">
      <h3 className="text-white text-lg font-serif">§ 2 Vertragsschluss</h3>
      <p>Die Darstellung der Produkte stellt kein rechtlich bindendes Angebot dar. Durch Absenden einer Bestellung geben Sie ein verbindliches Angebot ab. Der Vertrag kommt mit unserer Auftragsbestätigung per E-Mail zustande.</p>
    </section>
    <section className="space-y-4">
      <h3 className="text-white text-lg font-serif">§ 3 Preise und Zahlung</h3>
      <p>Alle Preise verstehen sich in Euro inklusive der gesetzlichen Mehrwertsteuer. Die Zahlung erfolgt per Banküberweisung nach Erhalt der Auftragsbestätigung, sofern nicht anders vereinbart.</p>
    </section>
    <section className="space-y-4">
      <h3 className="text-white text-lg font-serif">§ 4 Lieferung</h3>
      <p>Die Lieferung erfolgt nach Zahlungseingang per versichertem Expressversand. Lieferzeiten betragen in der Regel 2–5 Werktage innerhalb Deutschlands.</p>
    </section>
    <section className="space-y-4">
      <h3 className="text-white text-lg font-serif">§ 5 Gewährleistung</h3>
      <p>Es gelten die gesetzlichen Gewährleistungsrechte. Bei gebrauchten Luxusuhren und Schmuck gelten die im Produkt angegebenen Zustandsbeschreibungen.</p>
    </section>
    <section className="space-y-4">
      <h3 className="text-white text-lg font-serif">§ 6 Widerrufsrecht</h3>
      <p>Verbraucher haben ein 14-tägiges Widerrufsrecht ab Erhalt der Ware. Details entnehmen Sie unserer Widerrufsbelehrung.</p>
    </section>
  </div>
);

export const LegalContent = () => (
  <div className="space-y-8">
    <p><strong>Antonio Bellanova Luxury</strong><br />Ahornstraße 8<br />50765 Köln, Deutschland</p>
    <p><strong>Inhaber:</strong> Antonio Bellanova</p>
    <p><strong>E-Mail:</strong> antonio.bellanova@luxury.com<br /><strong>Telefon:</strong> +49 (0) 221 123 456</p>
    <p><strong>USt-IdNr.:</strong> DE123456789 (Platzhalter)</p>
    <p><strong>Verantwortlich für den Inhalt:</strong> Antonio Bellanova</p>
    <p className="text-sm opacity-60">Online-Streitbeilegung: Die EU-Kommission stellt eine Plattform zur Online-Streitbeilegung bereit: https://ec.europa.eu/consumers/odr</p>
  </div>
);
