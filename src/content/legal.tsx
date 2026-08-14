import LegalDocumentView from "../components/legal/LegalDocumentView.tsx";
import { useLanguage } from "../contexts/LanguageContext.tsx";

export const FAQContent = () => {
  const { language } = useLanguage();
  const items =
    language === "en"
      ? [
          {
            q: "Are all watches and jewelry authentic?",
            a: "Each piece is inspected by our experts. Authenticity certificates can be issued where applicable — they document our dealer verification process, not an independent manufacturer guarantee.",
          },
          {
            q: "How does shipping work?",
            a: "We ship worldwide via insured express carriers. Details and costs are shown in the checkout and on our Shipping page.",
          },
          {
            q: "Which payment methods do you accept?",
            a: "Stripe (card) and bank transfer / prepayment. The payable total depends on the selected payment method and is shown before you place your order.",
          },
          {
            q: "Do I have a right of withdrawal?",
            a: "Consumers generally have a 14-day withdrawal right. See our Cancellation / Withdrawal Policy for details and exceptions.",
          },
        ]
      : [
          {
            q: "Sind alle Uhren und Schmuckstücke authentisch?",
            a: "Jedes Stück wird von unseren Experten geprüft. Echtheitszertifikate können ausgestellt werden — sie dokumentieren unsere Händlerprüfung, keine unabhängige Herstellergarantie.",
          },
          {
            q: "Wie funktioniert der Versand?",
            a: "Wir versenden weltweit versichert. Details und Kosten sehen Sie im Checkout und unter Versand & Lieferung.",
          },
          {
            q: "Welche Zahlungsmethoden akzeptieren Sie?",
            a: "Stripe (Karte) sowie Banküberweisung / Vorkasse. Der zu zahlende Gesamtbetrag hängt von der gewählten Zahlungsart ab und wird vor Bestellabschluss angezeigt.",
          },
          {
            q: "Gibt es ein Widerrufsrecht?",
            a: "Verbrauchern steht grundsätzlich ein 14-tägiges Widerrufsrecht zu. Details und Ausnahmen finden Sie in der Widerrufsbelehrung.",
          },
        ];

  return (
    <div className="space-y-12">
      {items.map((item, i) => (
        <section key={i} className="space-y-3 border-b border-white/10 pb-8">
          <h3 className="text-white text-lg font-serif">{item.q}</h3>
          <p className="text-white/80">{item.a}</p>
        </section>
      ))}
    </div>
  );
};

export const PrivacyContent = () => <LegalDocumentView documentKey="privacy" />;
export const TermsContent = () => <LegalDocumentView documentKey="terms" />;
export const LegalContent = () => <LegalDocumentView documentKey="impressum" />;
export const WithdrawalContent = () => <LegalDocumentView documentKey="withdrawal" />;
export const WithdrawalFormContent = () => <LegalDocumentView documentKey="withdrawal_form" />;
export const PaymentInfoContent = () => <LegalDocumentView documentKey="payment" />;
