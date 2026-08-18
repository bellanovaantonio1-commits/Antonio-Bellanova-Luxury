import React from 'react';
import { motion } from 'motion/react';

const About: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-neutral-900 mb-8">Unsere Geschichte</h1>
          <div className="space-y-6 text-neutral-600 leading-relaxed">
            <p>
              Die Geschichte von Eiscafé Capri begann vor über zwei Jahrzehnten in den malerischen Gassen von Capri. Mit nichts als einer Leidenschaft für authentische Aromen und den geheimen Rezepten meiner Großmutter wagten wir den Schritt in die Selbstständigkeit.
            </p>
            <p>
              Heute führen wir diese Tradition in der zweiten Generation fort. Unser Ziel ist es, Ihnen nicht nur Eis zu verkaufen, sondern ein kleines Stück italienische Lebensfreude zu schenken.
            </p>
            <p className="font-serif italic text-lg text-emerald-600">
              "Eis ist nicht gleich Eis. Es ist eine Kunstform, die Herz und Seele braucht."
            </p>
            <p>
              Besuchen Sie uns und schmecken Sie den Unterschied, den Leidenschaft und Zeit machen. Wir freuen uns darauf, Sie in unserer Familie willkommen zu heißen.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          <img
            src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070&auto=format&fit=crop"
            alt="Making Ice Cream"
            className="rounded-3xl shadow-2xl z-10 relative"
          />
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-rose-600 rounded-full -z-10 animate-pulse" />
          <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-emerald-600 rounded-2xl -z-10 rotate-12" />
        </motion.div>
      </div>

    </div>
  );
};

export default About;
