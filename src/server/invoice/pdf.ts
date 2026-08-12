import PDFDocument from "pdfkit";
import type { InvoiceRecord } from "./types.ts";

const GOLD = "#c5a059";
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_Y = PAGE_HEIGHT - MARGIN - 20;

function fmtMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

function formatAddress(addr: InvoiceRecord["billingAddress"]): string[] {
  if (!addr) return [];
  const lines: string[] = [];
  const name = addr.name || [addr.firstName, addr.lastName].filter(Boolean).join(" ");
  if (name) lines.push(name);
  if (addr.street || addr.line1) lines.push(addr.street || addr.line1 || "");
  const cityLine = [addr.postalCode || addr.zip, addr.city].filter(Boolean).join(" ");
  if (cityLine) lines.push(cityLine);
  if (addr.line2 && addr.line2 !== cityLine) lines.push(addr.line2);
  if (addr.country) lines.push(addr.country);
  return lines.filter(Boolean);
}

const LABELS = {
  de: {
    invoice: "RECHNUNG",
    creditNote: "STORNORECHNUNG",
    invoiceNo: "Rechnungsnummer",
    creditNoteNo: "Stornorechnungsnummer",
    refInvoice: "Bezug Rechnung",
    invoiceDate: "Rechnungsdatum",
    cancelledBanner: "STORNIERT",
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
    page: "Seite",
    companyVat: "USt-IdNr.",
    companyTax: "Steuernummer",
    customerVat: "USt-IdNr. des Kunden",
  },
  en: {
    invoice: "INVOICE",
    creditNote: "CREDIT NOTE",
    invoiceNo: "Invoice number",
    creditNoteNo: "Credit note number",
    refInvoice: "Reference invoice",
    invoiceDate: "Invoice date",
    cancelledBanner: "CANCELLED",
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
    page: "Page",
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

type PDFDoc = InstanceType<typeof PDFDocument>;

function drawPageFooter(doc: PDFDoc, L: (typeof LABELS)["de"], pageNum: number, totalPages: number, invoiceNumber: string) {
  doc.fontSize(7).fillColor("#999");
  doc.text(
    `${L.footer} · ${invoiceNumber} · ${L.page} ${pageNum}/${totalPages}`,
    MARGIN,
    FOOTER_Y,
    { width: CONTENT_WIDTH, align: "center", lineBreak: false }
  );
}

function ensureSpace(doc: PDFDoc, y: number, needed: number): number {
  if (y + needed > FOOTER_Y - 10) {
    doc.addPage({ size: "A4", margin: MARGIN });
    return MARGIN + 10;
  }
  return y;
}

export function generateInvoicePdf(invoice: InvoiceRecord): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const lang = invoice.language === "en" ? "en" : "de";
    const L = LABELS[lang];
    const locale = lang === "en" ? "en-GB" : "de-DE";
    const isCreditNote = invoice.invoiceType === "CREDIT_NOTE";
    const isCancelled = invoice.invoiceStatus === "CANCELLED";

    const doc = new PDFDocument({
      size: "A4",
      margin: MARGIN,
      bufferPages: true,
      info: {
        Title: `${invoice.invoiceNumber} — ${invoice.seller.legalCompanyName}`,
        Author: invoice.seller.legalCompanyName,
        Subject: isCreditNote ? L.creditNote : L.invoice,
        Creator: invoice.seller.shopBrandName,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const issued = invoice.issuedAt instanceof Date ? invoice.issuedAt : new Date(invoice.issuedAt);

    doc.fontSize(10).fillColor(GOLD).text(invoice.seller.shopBrandName.toUpperCase(), MARGIN, MARGIN, {
      width: CONTENT_WIDTH,
    });
    doc.moveDown(0.3);
    doc.fontSize(22).fillColor("#111").text(isCreditNote ? L.creditNote : L.invoice);
    if (isCancelled && !isCreditNote) {
      doc.fontSize(12).fillColor("#b91c1c").text(L.cancelledBanner);
    }
    doc.moveDown(0.8);

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
    let metaY = 118;
    doc.fontSize(9).fillColor("#666");
    const metaRow = (label: string, value: string) => {
      doc.text(label, metaX, metaY, { width: 105, lineBreak: false });
      doc.fillColor("#111").text(value, metaX + 108, metaY, { width: CONTENT_WIDTH - metaX - 108 });
      doc.fillColor("#666");
      metaY += Math.max(16, doc.heightOfString(value, { width: CONTENT_WIDTH - metaX - 108 }) + 4);
    };
    metaRow(isCreditNote ? L.creditNoteNo : L.invoiceNo, invoice.invoiceNumber);
    metaRow(L.invoiceDate, issued.toLocaleDateString(locale));
    metaRow(L.orderNo, invoice.orderNumber);
    if (isCreditNote && invoice.originalInvoiceNumber) {
      metaRow(L.refInvoice, invoice.originalInvoiceNumber);
    }

    doc.y = Math.max(doc.y, metaY + 8);
    doc.moveDown(0.8);
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

    doc.moveDown(1.2);
    let y = doc.y;
    const col = { sku: MARGIN, name: MARGIN + 58, qty: MARGIN + 268, unit: MARGIN + 318, total: MARGIN + 408 };

    const drawTableHeader = () => {
      doc.fontSize(8).fillColor("#666");
      doc.text(L.sku, col.sku, y, { width: 52 });
      doc.text(L.product, col.name, y, { width: 200 });
      doc.text(L.qty, col.qty, y, { width: 40 });
      doc.text(L.unit, col.unit, y, { width: 82 });
      doc.text(L.total, col.total, y, { width: 90 });
      doc.moveTo(MARGIN, y + 14).lineTo(PAGE_WIDTH - MARGIN, y + 14).strokeColor("#ddd").stroke();
      y += 22;
    };

    drawTableHeader();
    doc.fontSize(9).fillColor("#111");

    for (const item of invoice.lineItems) {
      const nameHeight = doc.heightOfString(item.name, { width: 200 });
      const rowHeight = Math.max(22, nameHeight + 6);
      y = ensureSpace(doc, y, rowHeight + 4);
      if (y === MARGIN + 10) drawTableHeader();

      doc.text(item.sku || "—", col.sku, y, { width: 52 });
      doc.text(item.name, col.name, y, { width: 200 });
      doc.text(String(item.quantity), col.qty, y, { width: 40 });
      doc.text(fmtMoney(item.unitPriceGross, invoice.currency, locale), col.unit, y, { width: 82 });
      doc.text(fmtMoney(item.lineTotalGross, invoice.currency, locale), col.total, y, { width: 90 });
      y += rowHeight;
    }

    y = ensureSpace(doc, y, 120);
    doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).strokeColor("#ddd").stroke();
    y += 14;

    const summaryRow = (label: string, value: string, bold = false) => {
      y = ensureSpace(doc, y, 18);
      doc.fontSize(9).fillColor("#666").text(label, MARGIN + 300, y, { width: 100, align: "right" });
      doc.fillColor("#111");
      if (bold) doc.font("Helvetica-Bold");
      doc.text(value, MARGIN + 408, y, { width: CONTENT_WIDTH - 408, align: "right" });
      if (bold) doc.font("Helvetica");
      y += 16;
    };

    summaryRow(L.subtotalNet, fmtMoney(invoice.subtotalNet, invoice.currency, locale));
    if (invoice.taxAmount > 0) {
      summaryRow(`${L.tax} (${invoice.taxRatePercent}%)`, fmtMoney(invoice.taxAmount, invoice.currency, locale));
    }
    if (invoice.shippingCost > 0) {
      summaryRow(L.shipping, fmtMoney(invoice.shippingCost, invoice.currency, locale));
    }
    if (invoice.discountAmount > 0) {
      summaryRow(L.discount, `- ${fmtMoney(invoice.discountAmount, invoice.currency, locale)}`);
    }
    doc.moveTo(MARGIN + 300, y).lineTo(PAGE_WIDTH - MARGIN, y).strokeColor(GOLD).stroke();
    y += 8;
    summaryRow(L.totalGross, fmtMoney(invoice.totalGross, invoice.currency, locale), true);

    if (invoice.taxNote) {
      y += 6;
      y = ensureSpace(doc, y, 30);
      doc.fontSize(8).fillColor("#666").text(invoice.taxNote, MARGIN, y, { width: CONTENT_WIDTH });
      y += doc.heightOfString(invoice.taxNote, { width: CONTENT_WIDTH }) + 8;
    }

    y = ensureSpace(doc, y, 60);
    doc.fontSize(9).fillColor("#666");
    doc.text(
      `${L.payment}: ${invoice.paymentMethod === "BANK_TRANSFER" ? L.bankTransfer : invoice.paymentMethod}`,
      MARGIN,
      y,
      { width: CONTENT_WIDTH }
    );
    y += 14;
    doc.text(`${L.paymentStatus}: ${paymentStatusLabel(invoice.paymentStatus, L)}`, MARGIN, y);
    y += 20;
    doc.fontSize(8).fillColor("#333");
    doc.text(`${invoice.seller.bankAccountHolder} · ${invoice.seller.bankName}`, MARGIN, y, { width: CONTENT_WIDTH });
    y += 12;
    doc.text(`IBAN: ${invoice.seller.bankIban} · BIC: ${invoice.seller.bankBic}`, MARGIN, y, { width: CONTENT_WIDTH });

    const range = doc.bufferedPageRange();
    const totalPages = range.count;
    for (let i = range.start; i < range.start + totalPages; i++) {
      doc.switchToPage(i);
      drawPageFooter(doc, L, i - range.start + 1, totalPages, invoice.invoiceNumber);
    }

    doc.end();
  });
}
