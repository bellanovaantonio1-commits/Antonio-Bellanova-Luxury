import React from "react";
import { motion } from "motion/react";
import LegalDocumentView from "../components/legal/LegalDocumentView.tsx";

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

export const ShippingContent = () => <LegalDocumentView documentKey="shipping" />;

export const ReturnsContent = () => <LegalDocumentView documentKey="withdrawal" />;
