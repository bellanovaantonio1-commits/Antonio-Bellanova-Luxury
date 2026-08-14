export async function downloadCertificatePdf(certificateId: number, token: string, certificateNumber: string) {
  const res = await fetch(`/api/account/certificates/${certificateId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "PDF konnte nicht geladen werden.");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${certificateNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function openCertificateVerify(certificateNumber: string) {
  window.open(`/certificate/${encodeURIComponent(certificateNumber)}`, "_blank", "noopener,noreferrer");
}

export async function viewCertificatePdf(certificateId: number, token: string) {
  const res = await fetch(`/api/account/certificates/${certificateId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("PDF konnte nicht geöffnet werden.");
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), "_blank");
}
