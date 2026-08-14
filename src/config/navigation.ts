export interface NavItem {
  label: string;
  path: string;
  labelEn?: string;
  children?: NavItem[];
}

export const MAIN_NAV: NavItem[] = [
  { label: "Uhren", path: "/shop?cat=watches" },
  { label: "Schmuck", path: "/shop?cat=jewelry" },
];

export const FOOTER_NAV = {
  discover: [
    { label: "Alle Uhren", path: "/shop?cat=watches", labelEn: "All Watches" },
    { label: "Exklusiver Schmuck", path: "/shop?cat=jewelry", labelEn: "Exclusive Jewelry" },
    { label: "Neuheiten", path: "/shop?cat=new", labelEn: "New Arrivals" },
    { label: "Ankauf & Inzahlungnahme", path: "/sell", labelEn: "Sell & Trade-In" },
  ],
  service: [
    { label: "Kontakt", path: "/contact", labelEn: "Contact" },
    { label: "Versand & Lieferung", path: "/shipping", labelEn: "Shipping & Delivery" },
    { label: "Zahlungsarten", path: "/payment-info", labelEn: "Payment Methods" },
    { label: "Widerrufsbelehrung", path: "/withdrawal", labelEn: "Withdrawal Policy" },
    { label: "Widerrufsformular", path: "/withdrawal-form", labelEn: "Withdrawal Form" },
    { label: "Häufige Fragen", path: "/faq", labelEn: "FAQ" },
  ],
  legal: [
    { label: "Impressum", path: "/legal", labelEn: "Legal Notice" },
    { label: "Datenschutz", path: "/privacy", labelEn: "Privacy Policy" },
    { label: "AGB", path: "/terms", labelEn: "Terms & Conditions" },
    { label: "Widerrufsbelehrung", path: "/withdrawal", labelEn: "Withdrawal Policy" },
    { label: "Widerrufsformular", path: "/withdrawal-form", labelEn: "Withdrawal Form" },
    { label: "Versand & Lieferung", path: "/shipping", labelEn: "Shipping & Delivery" },
    { label: "Zahlungsarten", path: "/payment-info", labelEn: "Payment Methods" },
  ],
};
