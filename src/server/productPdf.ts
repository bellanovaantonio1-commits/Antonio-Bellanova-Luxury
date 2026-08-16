import PDFDocument from "pdfkit";
import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { brands, categories, products } from "../db/schema.ts";
import { fetchImageBuffer } from "./pdfImages.ts";
import { collectProductImageUrls } from "./certificate/images.ts";
import { COMPANY } from "./certificate/types.ts";

const GOLD = "#c5a059";
const BLACK = "#111111";
const MARGIN = 50;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function drawRow(doc: InstanceType<typeof PDFDocument>, label: string, value: string, y: number): number {
  if (!value?.trim()) return y;
  doc.fontSize(9).fillColor("#666").text(label, MARGIN, y, { width: 140 });
  doc.fontSize(10).fillColor(BLACK).text(value, MARGIN + 145, y, { width: CONTENT_WIDTH - 145 });
  return y + Math.max(doc.heightOfString(value, { width: CONTENT_WIDTH - 145 }), 14) + 6;
}

export async function generateProductDatasheetPdf(slug: string, language: "de" | "en" = "de"): Promise<Buffer> {
  const [row] = await db
    .select({ product: products, brand: brands, category: categories })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.slug, slug))
    .limit(1);

  if (!row?.product) throw new Error("Produkt nicht gefunden.");

  const product = row.product;
  const lang = language === "en" ? "en" : "de";
  const locale = lang === "en" ? "en-GB" : "de-DE";
  const title = lang === "en" && product.titleEn ? product.titleEn : product.titleDe || product.name;
  const description =
    lang === "en" && product.descriptionEn
      ? product.descriptionEn
      : product.descriptionDe || "";
  const condition =
    lang === "en"
      ? product.conditionEn || product.conditionDe || product.condition
      : product.conditionDe || product.conditionEn || product.condition;
  const scope =
    lang === "en" ? product.scopeOfDeliveryEn || product.scopeOfDeliveryDe : product.scopeOfDeliveryDe || product.scopeOfDeliveryEn;

  const imageUrls = collectProductImageUrls(product);
  const heroBuffer = imageUrls[0] ? await fetchImageBuffer(imageUrls[0]) : null;

  const price = parseFloat(String(product.price || "0"));
  const priceLabel =
    price > 0
      ? new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(price)
      : lang === "en"
        ? "Price on request"
        : "Preis auf Anfrage";

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
    doc.font("Helvetica").fontSize(8).fillColor("#888").text(`${COMPANY.street} · ${COMPANY.city}`, {
      width: CONTENT_WIDTH,
      align: "center",
    });

    doc.moveDown(1.2);
    doc.font("Helvetica-Bold").fontSize(20).fillColor(BLACK).text(
      lang === "en" ? "Product datasheet" : "Produktdatenblatt",
      { align: "center" }
    );
    doc.moveDown(0.8);

    let y = doc.y + 8;
    if (heroBuffer) {
      const imgW = 200;
      const imgH = 130;
      doc.image(heroBuffer, MARGIN + (CONTENT_WIDTH - imgW) / 2, y, {
        fit: [imgW, imgH],
        align: "center",
        valign: "center",
      });
      y += imgH + 16;
    }

    doc.font("Helvetica-Bold").fontSize(14).fillColor(BLACK).text(title, MARGIN, y, { width: CONTENT_WIDTH });
    y += doc.heightOfString(title, { width: CONTENT_WIDTH }) + 12;

    const rows: [string, string][] = [
      [lang === "en" ? "Brand" : "Marke", row.brand?.name || "—"],
      [lang === "en" ? "Reference" : "Referenz", product.sku || product.model || "—"],
      [lang === "en" ? "Price" : "Preis", priceLabel],
      [lang === "en" ? "Condition" : "Zustand", condition || "—"],
      [lang === "en" ? "Material" : "Material", product.material || "—"],
      [lang === "en" ? "Movement" : "Werk", product.movement || "—"],
      [lang === "en" ? "Case size" : "Gehäusegröße", product.diameter || "—"],
      [lang === "en" ? "Year" : "Baujahr", product.year || "—"],
      [lang === "en" ? "Category" : "Kategorie", lang === "en" ? row.category?.nameEn || row.category?.nameDe || "—" : row.category?.nameDe || "—"],
      [lang === "en" ? "Scope of delivery" : "Lieferumfang", scope || "—"],
    ];

    for (const [label, value] of rows) {
      y = drawRow(doc, label, value, y);
    }

    if (description?.trim()) {
      y += 10;
      doc.font("Helvetica-Bold").fontSize(11).fillColor(BLACK).text(
        lang === "en" ? "Description" : "Beschreibung",
        MARGIN,
        y
      );
      y += 16;
      doc.font("Helvetica").fontSize(9.5).fillColor("#333").text(description.trim(), MARGIN, y, {
        width: CONTENT_WIDTH,
        align: "left",
      });
    }

    doc.font("Helvetica").fontSize(8).fillColor("#666").text(
      `${COMPANY.owner} · ${new Date().toLocaleDateString(locale)}`,
      MARGIN,
      780,
      { width: CONTENT_WIDTH, align: "center" }
    );

    doc.end();
  });
}
