import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { CertificateRecord } from "./types.ts";
import { AUTHENTICITY_STATEMENT, COMPANY } from "./types.ts";
import { getCertificatePublicUrl } from "./numbering.ts";
import { fetchImageBuffers } from "../pdfImages.ts";
import { getAllCertificateImageUrls } from "./images.ts";

const GOLD = "#c5a059";
const BLACK = "#111111";
const MARGIN = 50;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const LABELS = {
  de: {
    title: "Echtheitszertifikat",
    subtitle: "Certificate of Authenticity",
    certNo: "Zertifikatsnummer",
    verifyId: "Verifikations-ID",
    product: "Produkt",
    brand: "Marke",
    model: "Modell",
    reference: "Referenznummer",
    serial: "Seriennummer",
    technical: "Technische Daten",
    movement: "Werk",
    case: "Gehäuse",
    caseSize: "Gehäusegröße",
    material: "Material",
    dial: "Zifferblatt",
    bracelet: "Armband",
    clasp: "Schließe",
    water: "Wasserdichtigkeit",
    year: "Baujahr",
    condition: "Zustand",
    delivery: "Lieferumfang",
    box: "Box",
    papers: "Papiere",
    issued: "Ausstellungsdatum",
    orderNo: "Bestellnummer",
    purchaseDate: "Kaufdatum",
    location: "Standort / Atelier",
    scan: "Online prüfen",
    owner: "Inhaber",
    statement: AUTHENTICITY_STATEMENT.de,
  },
  en: {
    title: "Certificate of Authenticity",
    subtitle: "Echtheitszertifikat",
    certNo: "Certificate number",
    verifyId: "Verification ID",
    product: "Product",
    brand: "Brand",
    model: "Model",
    reference: "Reference number",
    serial: "Serial number",
    technical: "Technical details",
    movement: "Movement",
    case: "Case",
    caseSize: "Case size",
    material: "Material",
    dial: "Dial",
    bracelet: "Bracelet",
    clasp: "Clasp",
    water: "Water resistance",
    year: "Year",
    condition: "Condition",
    delivery: "Scope of delivery",
    box: "Box",
    papers: "Papers",
    issued: "Issue date",
    orderNo: "Order number",
    purchaseDate: "Purchase date",
    location: "Location / Atelier",
    scan: "Verify online",
    owner: "Proprietor",
    statement: AUTHENTICITY_STATEMENT.en,
  },
};

function fmtDate(iso: string | null, locale: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(iso));
}

const PAGE_HEIGHT = 841.89;
const PAGE_BOTTOM = PAGE_HEIGHT - MARGIN - 40;

function ensureSpace(doc: InstanceType<typeof PDFDocument>, y: number, needed: number): number {
  if (y + needed > PAGE_BOTTOM) {
    doc.addPage();
    return MARGIN + 20;
  }
  return y;
}

function drawImageGrid(
  doc: InstanceType<typeof PDFDocument>,
  buffers: Buffer[],
  y: number,
  title: string
): number {
  if (buffers.length === 0) return y;

  y = ensureSpace(doc, y, 90);
  doc.font("Helvetica-Bold").fontSize(10).fillColor(BLACK).text(title, MARGIN, y);
  y += 16;

  const thumb = 72;
  const gap = 10;
  let x = MARGIN;

  for (const buffer of buffers) {
    if (x + thumb > PAGE_WIDTH - MARGIN) {
      x = MARGIN;
      y = ensureSpace(doc, y + thumb + gap, thumb + 24);
    }
    doc.image(buffer, x, y, { fit: [thumb, thumb], align: "center", valign: "center" });
    x += thumb + gap;
  }

  return y + thumb + 14;
}

function drawRow(doc: InstanceType<typeof PDFDocument>, label: string, value: string, y: number): number {
  doc.fontSize(9).fillColor("#666").text(label, MARGIN, y, { width: 140 });
  doc.fontSize(10).fillColor(BLACK).text(value, MARGIN + 145, y, { width: CONTENT_WIDTH - 145 });
  return y + Math.max(doc.heightOfString(value, { width: CONTENT_WIDTH - 145 }), 14) + 6;
}

export async function generateCertificatePdf(cert: CertificateRecord): Promise<Buffer> {
  const lang = cert.language === "en" ? "en" : "de";
  const L = LABELS[lang];
  const snap = cert.snapshotData;
  const locale = lang === "en" ? "en-GB" : "de-DE";
  const verifyUrl = getCertificatePublicUrl(cert.certificateNumber);
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 120, color: { dark: "#111111", light: "#FFFFFF" } });
  const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");
  const imageUrls = getAllCertificateImageUrls(snap);
  const imageBuffers = await fetchImageBuffers(imageUrls);
  const [heroImage, ...galleryImages] = imageBuffers;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: MARGIN });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, 3).fill(GOLD);

    doc.font("Helvetica-Bold").fontSize(11).fillColor(GOLD).text(COMPANY.name, MARGIN, MARGIN + 16, {
      width: CONTENT_WIDTH,
      align: "center",
    });
    doc.font("Helvetica").fontSize(8).fillColor("#888").text(`${COMPANY.street} · ${COMPANY.city} · ${COMPANY.country}`, {
      width: CONTENT_WIDTH,
      align: "center",
    });

    doc.moveDown(1.2);
    doc.font("Helvetica-Bold").fontSize(22).fillColor(BLACK).text(L.title, { align: "center" });
    doc.font("Helvetica").fontSize(9).fillColor("#999").text(L.subtitle, { align: "center" });

    doc.moveDown(1);
    let y = doc.y + 10;

    if (heroImage) {
      const imgW = 220;
      const imgH = 140;
      const imgX = MARGIN + (CONTENT_WIDTH - imgW) / 2;
      doc.image(heroImage, imgX, y, { fit: [imgW, imgH], align: "center", valign: "center" });
      y += imgH + 18;
    }

    doc.font("Helvetica-Bold").fontSize(10).fillColor(GOLD).text(`${L.certNo}: ${cert.certificateNumber}`, MARGIN, y);
    y += 18;
    doc.font("Helvetica").fontSize(9).fillColor("#555").text(`${L.verifyId}: ${cert.verificationCode}`, MARGIN, y);
    y += 22;

    doc.font("Helvetica-Bold").fontSize(11).fillColor(BLACK).text(L.product, MARGIN, y);
    y += 16;

    const condition = lang === "en" ? snap.conditionPublicEn : snap.conditionPublicDe;
    const rows: [string, string][] = [
      [L.brand, snap.brand],
      [L.model, snap.model],
      [L.reference, snap.referenceNumber],
      [L.serial, snap.serialNumber],
    ];

    for (const [label, value] of rows) {
      y = drawRow(doc, label, value, y);
    }

    y += 8;
    doc.font("Helvetica-Bold").fontSize(11).fillColor(BLACK).text(L.technical, MARGIN, y);
    y += 16;

    const techRows: [string, string][] = [
      [L.movement, snap.movement],
      [L.case, snap.caseMaterial],
      [L.caseSize, snap.caseSize],
      [L.material, snap.caseMaterial],
      [L.dial, snap.dial],
      [L.bracelet, snap.bracelet],
      [L.clasp, snap.clasp],
      [L.water, snap.waterResistance],
      [L.year, snap.year],
    ];

    for (const [label, value] of techRows) {
      if (value && value !== "Nicht angegeben" && value !== "Not specified") {
        y = drawRow(doc, label, value, y);
      }
    }

    y += 8;
    y = drawRow(doc, L.condition, condition, y);

    const scope = lang === "en" ? snap.scopeOfDeliveryEn : snap.scopeOfDeliveryDe;
    if (scope && scope !== "Nicht angegeben" && scope !== "Not specified") {
      y = drawRow(doc, L.delivery, scope, y);
    }
    if (snap.box && snap.box !== "Nicht angegeben" && snap.box !== "Not specified") {
      y = drawRow(doc, L.box, snap.box, y);
    }
    if (snap.papers && snap.papers !== "Nicht angegeben" && snap.papers !== "Not specified") {
      y = drawRow(doc, L.papers, snap.papers, y);
    }

    if (snap.orderNumber && snap.orderNumber !== "Nicht angegeben" && snap.orderNumber !== "Not specified") {
      y = drawRow(doc, L.orderNo, snap.orderNumber, y);
    }
    if (snap.purchaseDate) {
      y = drawRow(doc, L.purchaseDate, fmtDate(snap.purchaseDate, locale), y);
    }
    if (snap.location && snap.location !== "Nicht angegeben" && snap.location !== "Not specified") {
      y = drawRow(doc, L.location, snap.location, y);
    }

    y = drawRow(doc, L.issued, fmtDate(cert.issuedAt, locale), y);

    if (galleryImages.length > 0) {
      y = drawImageGrid(
        doc,
        galleryImages,
        y + 10,
        lang === "en" ? "Additional product images" : "Weitere Produktbilder"
      );
    }

    y = ensureSpace(doc, y + 12, 130);
    doc.font("Helvetica").fontSize(8.5).fillColor("#444").text(L.statement, MARGIN, y, {
      width: CONTENT_WIDTH - 130,
      align: "left",
    });

    doc.image(qrBuffer, PAGE_WIDTH - MARGIN - 110, y - 4, { width: 100 });
    doc.fontSize(7).fillColor("#888").text(L.scan, PAGE_WIDTH - MARGIN - 110, y + 102, { width: 100, align: "center" });

    doc.font("Helvetica").fontSize(8).fillColor("#666").text(
      `${COMPANY.owner} · ${verifyUrl}`,
      MARGIN,
      780,
      { width: CONTENT_WIDTH, align: "center" }
    );

    doc.end();
  });
}
