export type InvoicePdfDisposition = "inline" | "attachment";

export type InvoicePdfAction = "view" | "download" | "share";

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function canShareFiles() {
  if (typeof navigator === "undefined" || !navigator.share || !navigator.canShare) return false;
  try {
    const probe = new File(["%PDF"], "probe.pdf", { type: "application/pdf" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export function invoiceShareSupported() {
  return canShareFiles();
}

export async function fetchOrderInvoicePdf(
  orderId: number,
  token: string,
  disposition: InvoicePdfDisposition = "inline"
): Promise<Blob> {
  const res = await fetch(`/api/orders/${orderId}/invoice/pdf?disposition=${disposition}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let message = "Rechnung konnte nicht geladen werden.";
    try {
      const data = await res.json();
      if (data.error) message = data.error;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  const blob = await res.blob();
  if (blob.type && blob.type !== "application/pdf" && !blob.type.includes("pdf")) {
    throw new Error("Ungültiges PDF.");
  }
  return blob;
}

function openBlobInNewTab(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    window.location.assign(url);
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function performInvoicePdfAction(opts: {
  orderId: number;
  token: string;
  invoiceNumber: string;
  action: InvoicePdfAction;
}) {
  const filename = `${opts.invoiceNumber}.pdf`;
  const disposition: InvoicePdfDisposition =
    opts.action === "download" && !isMobileDevice() ? "attachment" : "inline";
  const blob = await fetchOrderInvoicePdf(opts.orderId, opts.token, disposition);

  if (opts.action === "share") {
    const file = new File([blob], filename, { type: "application/pdf" });
    if (canShareFiles()) {
      await navigator.share({
        files: [file],
        title: opts.invoiceNumber,
        text: opts.invoiceNumber,
      });
      return;
    }
    openBlobInNewTab(blob);
    return;
  }

  if (opts.action === "view" || isMobileDevice()) {
    openBlobInNewTab(blob);
    return;
  }

  triggerDownload(blob, filename);
}

export async function fetchAdminInvoicePdf(id: number, token: string): Promise<Blob> {
  const res = await fetch(`/api/admin/invoices/${id}/pdf?disposition=inline`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("PDF konnte nicht geladen werden.");
  return res.blob();
}

export async function openAdminInvoicePdf(id: number, token: string, invoiceNumber: string) {
  const blob = await fetchAdminInvoicePdf(id, token);
  if (isMobileDevice() || !window.matchMedia("(pointer: fine)").matches) {
    openBlobInNewTab(blob);
  } else {
    triggerDownload(blob, `${invoiceNumber}.pdf`);
  }
}
