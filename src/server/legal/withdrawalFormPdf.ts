import PDFDocument from "pdfkit";
import { getSettingsMap } from "../settings.ts";
import type { LegalLanguage } from "./types.ts";

const MARGIN = 56;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const GOLD = "#9a7b2e";

function companyLines(settings: Record<string, unknown>): string[] {
  const name = String(settings.legalCompanyName || settings.shopName || "Antonio Bellanova").trim();
  const address = String(settings.contactAddress || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const email = String(settings.contactEmail || "").trim();
  return [name, ...address, email ? `E-Mail: ${email}` : ""].filter(Boolean);
}

function drawFieldLine(doc: InstanceType<typeof PDFDocument>, y: number, width = CONTENT_WIDTH): number {
  doc
    .moveTo(MARGIN, y)
    .lineTo(MARGIN + width, y)
    .strokeColor("#444444")
    .lineWidth(0.6)
    .stroke();
  return y + 22;
}

function writeLabel(doc: InstanceType<typeof PDFDocument>, text: string, y: number): number {
  doc.font("Helvetica").fontSize(10).fillColor("#222222").text(text, MARGIN, y, {
    width: CONTENT_WIDTH,
    lineGap: 2,
  });
  return doc.y + 8;
}

export async function generateWithdrawalFormPdf(language: LegalLanguage = "de"): Promise<Buffer> {
  const settings = await getSettingsMap();
  const recipient = companyLines(settings);
  const isEn = language === "en";

  const copy = isEn
    ? {
        title: "Model Withdrawal Form",
        intro:
          "If you wish to withdraw from the contract, please complete this form and send it back.",
        to: "To",
        bodyIntro: "I/We hereby give notice that I/We withdraw from my/our contract of sale of the following goods / for the provision of the following service:",
        ordered: "Ordered on / received on",
        name: "Name of consumer(s)",
        address: "Address of consumer(s)",
        signature: "Signature of consumer(s) (only if this form is submitted on paper)",
        date: "Date",
        filename: "Withdrawal-Form.pdf",
      }
    : {
        title: "Muster-Widerrufsformular",
        intro:
          "Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses Formular aus und senden Sie es zurück.",
        to: "An",
        bodyIntro:
          "Hiermit widerrufe(n) ich/wir den von mir/uns abgeschlossenen Vertrag über den Kauf der folgenden Waren / die Erbringung der folgenden Dienstleistung:",
        ordered: "Bestellt am / erhalten am",
        name: "Name des/der Verbraucher(s)",
        address: "Anschrift des/der Verbraucher(s)",
        signature: "Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)",
        date: "Datum",
        filename: "Widerrufsformular.pdf",
      };

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: MARGIN });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, 2).fill(GOLD);

    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor("#111111")
      .text(copy.title, MARGIN, MARGIN + 16, { width: CONTENT_WIDTH });

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#555555")
      .text(copy.intro, MARGIN, doc.y + 14, { width: CONTENT_WIDTH, lineGap: 3 });

    let y = doc.y + 24;

    doc
      .roundedRect(MARGIN, y, CONTENT_WIDTH, 520, 8)
      .lineWidth(0.8)
      .strokeColor("#dddddd")
      .stroke();

    y += 22;
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#222222").text(copy.to, MARGIN + 16, y);
    y = doc.y + 4;
    doc.font("Helvetica").fontSize(10).fillColor("#222222");
    for (const line of recipient) {
      doc.text(line, MARGIN + 16, y, { width: CONTENT_WIDTH - 32 });
      y = doc.y + 2;
    }

    y += 16;
    y = writeLabel(doc, copy.bodyIntro, y);
    y = drawFieldLine(doc, y, CONTENT_WIDTH - 32);
    y += 8;

    y = writeLabel(doc, copy.ordered, y);
    y = drawFieldLine(doc, y, CONTENT_WIDTH - 32);
    y += 12;

    y = writeLabel(doc, copy.name, y);
    y = drawFieldLine(doc, y, CONTENT_WIDTH - 32);
    y += 8;

    y = writeLabel(doc, copy.address, y);
    y = drawFieldLine(doc, y, CONTENT_WIDTH - 32);
    y = drawFieldLine(doc, y, CONTENT_WIDTH - 32);
    y += 8;

    y = writeLabel(doc, copy.signature, y);
    y = drawFieldLine(doc, y, CONTENT_WIDTH - 32);
    y += 8;

    y = writeLabel(doc, copy.date, y);
    drawFieldLine(doc, y, CONTENT_WIDTH - 32);

    doc.end();
  });
}

export function withdrawalFormPdfFilename(language: LegalLanguage): string {
  return language === "en" ? "Withdrawal-Form.pdf" : "Widerrufsformular.pdf";
}
