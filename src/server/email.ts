type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[];
};

export async function sendEmail({ to, subject, html, attachments }: EmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "Antonio Bellanova <onboarding@resend.dev>";

  if (!apiKey) {
    console.log(`[Email] RESEND_API_KEY fehlt — "${subject}" an ${JSON.stringify(to)}`);
    return false;
  }

  try {
    const body: Record<string, unknown> = { from, to: Array.isArray(to) ? to : [to], subject, html };
    if (attachments?.length) body.attachments = attachments;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Email] Send failed:", err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[Email] Error:", e);
    return false;
  }
}

function layout(title: string, body: string) {
  return `<!DOCTYPE html><html><body style="font-family:Georgia,serif;background:#f5f5f5;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:32px">
      <p style="color:#c5a059;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 8px">Antonio Bellanova Luxury</p>
      <h1 style="font-size:22px;font-weight:normal;margin:0 0 24px;color:#111">${title}</h1>
      <div style="color:#333;font-size:14px;line-height:1.7">${body}</div>
    </div></body></html>`;
}

export async function sendOrderEmails(opts: {
  customerEmail: string;
  orderNumber: string;
  invoiceNumber?: string;
  total: string;
  items: { name: string; quantity: number; price: number }[];
  settings: Record<string, unknown>;
  language?: "de" | "en";
  pdfBuffer?: Buffer;
}) {
  const lang = opts.language === "en" ? "en" : "de";
  const locale = lang === "en" ? "en-GB" : "de-DE";
  const shopName = String(opts.settings.shopName || "Antonio Bellanova Luxury");
  const ownerEmail = String(opts.settings.contactEmail || "");
  const itemRows = opts.items
    .map((i) => `<li>${i.name} × ${i.quantity} — ${i.price.toLocaleString(locale, { style: "currency", currency: "EUR" })}</li>`)
    .join("");

  const instructions = lang === "en"
    ? opts.settings.paymentInstructionsEn || opts.settings.paymentInstructionsDe
    : opts.settings.paymentInstructionsDe;

  const bankBlock = `
    <p><strong>${lang === "en" ? "Bank transfer" : "Banküberweisung"}</strong></p>
    <p>${instructions || ""}</p>
    <p>${lang === "en" ? "Recipient" : "Empfänger"}: ${opts.settings.bankAccountHolder}<br/>IBAN: ${opts.settings.bankIban}<br/>BIC: ${opts.settings.bankBic}<br/>${lang === "en" ? "Bank" : "Bank"}: ${opts.settings.bankName}</p>
    <p><strong>${lang === "en" ? "Reference" : "Verwendungszweck"}:</strong> ${opts.orderNumber}</p>`;

  const invoiceLine = opts.invoiceNumber
    ? `<p>${lang === "en" ? "Invoice number" : "Rechnungsnummer"}: <strong>${opts.invoiceNumber}</strong></p>`
    : "";

  const attachments = opts.pdfBuffer && opts.invoiceNumber
    ? [{ filename: `${opts.invoiceNumber}.pdf`, content: opts.pdfBuffer.toString("base64") }]
    : undefined;

  const customerSubject = lang === "en"
    ? `Order confirmation ${opts.orderNumber} — ${shopName}`
    : `Bestellbestätigung ${opts.orderNumber} — ${shopName}`;

  const customerTitle = lang === "en" ? "Thank you for your order" : "Vielen Dank für Ihre Bestellung";
  const customerBody = lang === "en"
    ? `<p>Your order <strong>${opts.orderNumber}</strong> has been received.</p>${invoiceLine}<p>Total: <strong>${parseFloat(opts.total).toLocaleString(locale, { style: "currency", currency: "EUR" })}</strong></p><ul>${itemRows}</ul>${bankBlock}${opts.pdfBuffer ? "<p>Your invoice is attached as a PDF.</p>" : ""}`
    : `<p>Ihre Bestellung <strong>${opts.orderNumber}</strong> wurde erfolgreich entgegengenommen.</p>${invoiceLine}<p>Gesamtbetrag: <strong>${parseFloat(opts.total).toLocaleString(locale, { style: "currency", currency: "EUR" })}</strong></p><ul>${itemRows}</ul>${bankBlock}${opts.pdfBuffer ? "<p>Ihre Rechnung finden Sie im PDF-Anhang.</p>" : ""}`;

  await sendEmail({
    to: opts.customerEmail,
    subject: customerSubject,
    html: layout(customerTitle, customerBody),
    attachments,
  });

  if (ownerEmail) {
    await sendEmail({
      to: ownerEmail,
      subject: `Neue Bestellung ${opts.orderNumber}${opts.invoiceNumber ? ` / ${opts.invoiceNumber}` : ""}`,
      html: layout("Neue Bestellung", `
        <p>Kunde: ${opts.customerEmail}</p>
        <p>Bestellnummer: <strong>${opts.orderNumber}</strong></p>
        ${opts.invoiceNumber ? `<p>Rechnungsnummer: <strong>${opts.invoiceNumber}</strong></p>` : ""}
        <p>Gesamt: ${parseFloat(opts.total).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</p>
        <ul>${itemRows}</ul>
      `),
    });
  }
}

export async function sendInquiryEmails(opts: {
  type: string;
  typeLabel: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  subject?: string;
  message?: string;
  metadata?: Record<string, unknown>;
  settings: Record<string, unknown>;
}) {
  const shopName = String(opts.settings.shopName || "Antonio Bellanova Luxury");
  const ownerEmail = String(opts.settings.contactEmail || "");
  const name = [opts.firstName, opts.lastName].filter(Boolean).join(" ") || "Kunde";
  const meta = opts.metadata
    ? `<pre style="background:#f5f5f5;padding:12px;border-radius:8px;font-size:12px">${JSON.stringify(opts.metadata, null, 2)}</pre>`
    : "";

  if (ownerEmail) {
    await sendEmail({
      to: ownerEmail,
      subject: `${opts.typeLabel} — ${name}`,
      html: layout(opts.typeLabel, `
        <p><strong>${name}</strong> (${opts.email})</p>
        ${opts.phone ? `<p>Telefon: ${opts.phone}</p>` : ""}
        ${opts.subject ? `<p>Betreff: ${opts.subject}</p>` : ""}
        <p>${(opts.message || "").replace(/\n/g, "<br/>")}</p>
        ${meta}
      `),
    });
  }

  await sendEmail({
    to: opts.email,
    subject: `Ihre Anfrage bei ${shopName}`,
    html: layout("Anfrage erhalten", `
      <p>Guten Tag ${opts.firstName || ""},</p>
      <p>vielen Dank für Ihre ${opts.typeLabel.toLowerCase()}. Wir melden uns in Kürze bei Ihnen.</p>
      <p style="color:#666;font-size:12px">${shopName}<br/>${opts.settings.contactPhone || ""}</p>
    `),
  });
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendInvoiceIssuedEmail(opts: {
  customerEmail: string;
  orderNumber: string;
  invoiceNumber: string;
  total: string;
  settings: Record<string, unknown>;
  language?: "de" | "en";
  pdfBuffer?: Buffer;
}) {
  const lang = opts.language === "en" ? "en" : "de";
  const locale = lang === "en" ? "en-GB" : "de-DE";
  const shopName = String(opts.settings.shopName || "Antonio Bellanova Luxury");

  const attachments = opts.pdfBuffer
    ? [{ filename: `${opts.invoiceNumber}.pdf`, content: opts.pdfBuffer.toString("base64") }]
    : undefined;

  const subject = lang === "en"
    ? `Invoice ${opts.invoiceNumber} — ${shopName}`
    : `Rechnung ${opts.invoiceNumber} — ${shopName}`;

  const title = lang === "en" ? "Your invoice" : "Ihre Rechnung";
  const body = lang === "en"
    ? `<p>Your invoice <strong>${opts.invoiceNumber}</strong> for order <strong>${opts.orderNumber}</strong> has been issued.</p>
       <p>Total: <strong>${parseFloat(opts.total).toLocaleString(locale, { style: "currency", currency: "EUR" })}</strong></p>
       ${opts.pdfBuffer ? "<p>The invoice is attached as a PDF.</p>" : ""}`
    : `<p>Ihre Rechnung <strong>${opts.invoiceNumber}</strong> zur Bestellung <strong>${opts.orderNumber}</strong> wurde ausgestellt.</p>
       <p>Gesamtbetrag: <strong>${parseFloat(opts.total).toLocaleString(locale, { style: "currency", currency: "EUR" })}</strong></p>
       ${opts.pdfBuffer ? "<p>Die Rechnung finden Sie im PDF-Anhang.</p>" : ""}`;

  await sendEmail({ to: opts.customerEmail, subject, html: layout(title, body), attachments });
}
