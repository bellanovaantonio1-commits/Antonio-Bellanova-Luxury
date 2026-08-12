import React from "react";
import { motion } from "motion/react";

interface InfoPageProps {
  title: string;
  subtitle?: string;
  content: React.ReactNode;
}

export default function InfoPage({ title, subtitle, content }: InfoPageProps) {
  return (
    <div className="min-h-screen pt-40 pb-20 px-10">
      <div className="max-w-4xl mx-auto space-y-16">
        <header className="space-y-6 text-center">
          {subtitle && (
            <h4 className="text-[10px] tracking-[0.4em] uppercase font-bold text-[#c5a059]">
              {subtitle}
            </h4>
          )}
          <h1 className="text-4xl md:text-5xl font-serif italic tracking-wider">
            {title}
          </h1>
          <div className="w-20 h-px bg-[#c5a059]/30 mx-auto" />
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-invert max-w-none font-light text-[#F4F4F4]/70 leading-relaxed space-y-8"
        >
          {content}
        </motion.div>
      </div>
    </div>
  );
}

// Sub-components for specific pages
export const ShippingContent = () => (
  <div className="space-y-12">
    <section className="space-y-4">
      <h3 className="text-white text-lg font-serif">Weltweiter Expressversand</h3>
      <p>Wir versenden unsere exklusiven Zeitmesser weltweit mit unseren zuverlässigen Partnern DHL Express, UPS und FedEx. Jede Sendung ist bis zum vollen Warenwert versichert.</p>
    </section>
    <section className="space-y-4">
      <h3 className="text-white text-lg font-serif">Versandkosten</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white/5 p-6 rounded-lg border border-white/10">
          <h4 className="text-[#c5a059] text-xs uppercase tracking-widest font-bold mb-2">Deutschland</h4>
          <p className="text-sm">Kostenloser Expressversand für alle Bestellungen über 500 €.</p>
        </div>
        <div className="bg-white/5 p-6 rounded-lg border border-white/10">
          <h4 className="text-[#c5a059] text-xs uppercase tracking-widest font-bold mb-2">International</h4>
          <p className="text-sm">Berechnet nach Zielort und Versicherungswert (ab 49 €).</p>
        </div>
      </div>
    </section>
  </div>
);

export const ReturnsContent = () => (
  <div className="space-y-12">
    <section className="space-y-4">
      <h3 className="text-white text-lg font-serif">Widerrufsrecht</h3>
      <p>Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter die Waren in Besitz genommen haben.</p>
    </section>
    <section className="space-y-4">
      <h3 className="text-white text-lg font-serif">Ausschluss des Widerrufsrechts</h3>
      <p>Das Widerrufsrecht besteht nicht bei Verträgen zur Lieferung von Waren, die nicht vorgefertigt sind und für deren Herstellung eine individuelle Auswahl oder Bestimmung durch den Verbraucher maßgeblich ist oder die eindeutig auf die persönlichen Bedürfnisse des Verbrauchers zugeschnitten sind.</p>
    </section>
  </div>
);
