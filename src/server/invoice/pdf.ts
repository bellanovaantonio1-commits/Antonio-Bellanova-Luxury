import PDFDocument from "pdfkit";
import type { InvoiceRecord } from "./types.ts";

const GOLD = "#c5a059";

function fmtMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

function formatAddress(addr: InvoiceRecord["billingAddress"]): string[] {
  if (!addr) return [];
  const lines: string[] = [];
  const name = [addr.firstName, addr.lastName].filter(Boolean).join(" ");
  if (name) lines.push(name);
  if (addr.street) lines.push(addr.street);
  const cityLine = [addr.zip, addr.city].filter(Boolean).join(" ");
  if (cityLine) lines.push(cityLine);
  if (addr.country) lines.push(addr.country);
  return lines;
}

const LABELS = {
  de: {
    invoice: "RECHNUNG",
    invoiceNo: "Rechnungsnummer",
    invoiceDate: "Rechnungsdatum",
    orderNo: "Bestellnummer",
    customer: "Rechnungsempfänger",
    delivery: "Lieferadresse",
    sku: "Art.-Nr.",
    product: "Bezeichnung",
    qty: "Menge",
    unit: "Einzelpreis",
    total: "Gesamt",
    subtotalNet: "Netto",
    tax: "Umsatzsteuer",
    shipping: "Versand",
    discount: "Rabatt",
    totalGross: "Gesamtbetrag (brutto)",
    payment: "Zahlungsart",
    paymentStatus: "Zahlungsstatus",
    bankTransfer: "Banküberweisung",
    paid: "Bezahlt",
    pending: "Ausstehend",
    refunded: "Erstattet",
    cancelled: "Storniert",
    footer: "Vielen Dank für Ihren Einkauf.",
    companyVat: "USt-IdNr.",
    companyTax: "Steuernummer",
    customerVat: "USt-IdNr. des Kunden",
  },
  en: {
    invoice: "INVOICE",
    invoiceNo: "Invoice number",
    invoiceDate: "Invoice date",
    orderNo: "Order number",
    customer: "Bill to",
    delivery: "Ship to",
    sku: "SKU",
    product: "Description",
    qty: "Qty",
    unit: "Unit price",
    total: "Total",
    subtotalNet: "Net amount",
    tax: "VAT",
    shipping: "Shipping",
    discount: "Discount",
    totalGross: "Total (gross)",
    payment: "Payment method",
    paymentStatus: "Payment status",
    bankTransfer: "Bank transfer",
    paid: "Paid",
    pending: "Pending",
    refunded: "Refunded",
    cancelled: "Cancelled",
    footer: "Thank you for your purchase.",
    companyVat: "VAT ID",
    companyTax: "Tax number",
    customerVat: "Customer VAT ID",
  },
};

function paymentStatusLabel(status: string, L: (typeof LABELS)["de"]) {
  if (status === "PAID") return L.paid;
  if (status === "REFUNDED") return L.refunded;
  if (status === "CANCELLED") return L.cancelled;
  return L.pending;
}

export function generateInvoicePdf(invoice: InvoiceRecord): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const lang = invoice.language === "en" ? "en" : "de";
    const L = LABELS[lang];
    const locale = lang === "en" ? "en-GB" : "de-DE";
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const issued = invoice.issuedAt instanceof Date ? invoice.issuedAt : new Date(invoice.issuedAt);

    doc.fontSize(10).fillColor(GOLD).text(invoice.seller.shopBrandName.toUpperCase());
    doc.moveDown(0.3);
    doc.fontSize(22).fillColor("#111").text(L.invoice);
    doc.moveDown(1);

    doc.fontSize(9).fillColor("#333");
    doc.text(invoice.seller.legalCompanyName);
    invoice.seller.address.split(/\n|<br\s*\/?>/i).forEach((line) => {
      if (line.trim()) doc.text(line.trim());
    });
    if (invoice.seller.email) doc.text(invoice.seller.email);
    if (invoice.seller.phone) doc.text(invoice.seller.phone);
    if (invoice.seller.vatId) doc.text(`${L.companyVat}: ${invoice.seller.vatId}`);
    if (invoice.seller.taxNumber) doc.text(`${L.companyTax}: ${invoice.seller.taxNumber}`);

    const metaX = 320;
    let metaY = 120;
    doc.fontSize(9).fillColor("#666");
    const metaRow = (label: string, value: string) => {
      doc.text(label, metaX, metaY, { width: 110 });
      doc.fillColor("#111").text(value, metaX + 115, metaY, { width: 120 });
      doc.fillColor("#666");
      metaY += 16;
    };
    metaRow(L.invoiceNo, invoice.invoiceNumber);
    metaRow(L.invoiceDate, issued.toLocaleDateString(locale));
    metaRow(L.orderNo, invoice.orderNumber);

    doc.y = Math.max(doc.y, metaY + 10);
    doc.moveDown(1);
    doc.fontSize(10).fillColor(GOLD).text(L.customer);
    doc.fontSize(9).fillColor("#111");
    if (invoice.companyName) doc.text(invoice.companyName);
    if (invoice.customerName) doc.text(invoice.customerName);
    if (invoice.customerEmail) doc.text(invoice.customerEmail);
    if (invoice.customerVatId) doc.text(`${L.customerVat}: ${invoice.customerVatId}`);
    formatAddress(invoice.billingAddress).forEach((l) => doc.text(l));

    if (invoice.shippingAddress && JSON.stringify(invoice.shippingAddress) !== JSON.stringify(invoice.billingAddress)) {
      doc.moveDown(0.5);
      doc.fillColor(GOLD).text(L.delivery);
      doc.fillColor("#111");
      formatAddress(invoice.shippingAddress).forEach((l) => doc.text(l));
    }

    doc.moveDown(1.5);
    const tableTop = doc.y;
    const col = { sku: 50, name: 110, qty: 320, unit: 370, total: 460 };
    doc.fontSize(8).fillColor("#666");
    doc.text(L.sku, col.sku, tableTop);
    doc.text(L.product, col.name, tableTop);
    doc.text(L.qty, col.qty, tableTop);
    doc.text(L.unit, col.unit, tableTop);
    doc.text(L.total, col.total, tableTop);
    doc.moveTo(50, tableTop + 14).lineTo(545, tableTop + 14).strokeColor("#ddd").stroke();

    let y = tableTop + 22;
    doc.fontSize(9).fillColor("#111");
    for (const item of invoice.lineItems) {
      if (y > 700) { doc.addPage(); y = 50; }
      doc.text(item.sku || "—", col.sku, y, { width: 55 });
      doc.text(item.name, col.name, y, { width: 200 });
      doc.text(String(item.quantity), col.qty, y);
      doc.text(fmtMoney(item.unitPriceGross, invoice.currency, locale), col.unit, y, { width: 80 });
      doc.text(fmtMoney(item.lineTotalGross, invoice.currency, locale), col.total, y, { width: 80 });
      y += 22;
    }

    doc.moveTo(50, y).lineTo(545, y).strokeColor("#ddd").stroke();
    y += 16;

    const summaryRow = (label: string, value: string, bold = false) => {
      doc.fontSize(9).fillColor("#666").text(label, 350, y, { width: 100, align: "right" });
      doc.fillColor("#111");
      if (bold) doc.font("Helvetica-Bold");
      doc.text(value, 460, y, { width: 85, align: "right" });
      if (bold) doc.font("Helvetica");
      y += 16;
    };

    summaryRow(L.subtotalNet, fmtMoney(invoice.subtotalNet, invoice.currency, locale));
    if (invoice.taxAmount > 0) {
      summaryRow(`${L.tax} (${invoice.taxRatePercent}%)`, fmtMoney(invoice.taxAmount, invoice.currency, locale));
    }
    if (invoice.shippingCost > 0) summaryRow(L.shipping, fmtMoney(invoice.shippingCost, invoice.currency, locale));
    if (invoice.discountAmount > 0) summaryRow(L.discount, `- ${fmtMoney(invoice.discountAmount, invoice.currency, locale)}`);
    doc.moveTo(350, y).lineTo(545, y).strokeColor(GOLD).stroke();
    y += 8;
    summaryRow(L.totalGross, fmtMoney(invoice.totalGross, invoice.currency, locale), true);

    if (invoice.taxNote) {
      y += 8;
      doc.fontSize(8).fillColor("#666").text(invoice.taxNote, 50, y, { width: 495 });
    }

    y += 30;
    doc.fontSize(9).fillColor("#666");
    doc.text(`${L.payment}: ${invoice.paymentMethod === "BANK_TRANSFER" ? L.bankTransfer : invoice.paymentMethod}`, 50, y);
    y += 14;
    doc.text(`${L.paymentStatus}: ${paymentStatusLabel(invoice.paymentStatus, L)}`, 50, y);
    y += 24;
    doc.fontSize(8).fillColor("#333");
    doc.text(`${invoice.seller.bankAccountHolder} · ${invoice.seller.bankName}`, 50, y);
    y += 12;
    doc.text(`IBAN: ${invoice.seller.bankIban} · BIC: ${invoice.seller.bankBic}`, 50, y);
    doc.fontSize(8).fillColor("#999").text(L.footer, 50, 750, { align: "center", width: 495 });
    doc.end();
  });
}
