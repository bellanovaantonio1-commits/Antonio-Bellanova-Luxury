export interface NavItem {
  label: string;
  path: string;
  children?: NavItem[];
}

export const MAIN_NAV: NavItem[] = [
  { label: "Uhren", path: "/shop?cat=watches" },
  { label: "Schmuck", path: "/shop?cat=jewelry" },
];

export const FOOTER_NAV = {
  discover: [
    { label: "Alle Uhren", path: "/shop?cat=watches" },
    { label: "Exklusiver Schmuck", path: "/shop?cat=jewelry" },
    { label: "Neuheiten", path: "/shop?cat=new" },
    { label: "Ankauf & Inzahlungnahme", path: "/sell" },
  ],
  service: [
    { label: "Kontakt", path: "/contact" },
    { label: "Versand & Lieferung", path: "/shipping" },
    { label: "Widerruf & Retouren", path: "/returns" },
    { label: "Häufige Fragen", path: "/faq" },
  ],
  legal: [
    { label: "Impressum", path: "/legal" },
    { label: "Datenschutz", path: "/privacy" },
    { label: "AGB", path: "/terms" },
  ]
};
