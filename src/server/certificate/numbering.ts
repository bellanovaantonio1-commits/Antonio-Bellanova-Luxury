import type { PoolClient } from "pg";
import crypto from "crypto";

export async function allocateCertificateNumber(client: PoolClient): Promise<string> {
  const year = new Date().getFullYear();
  const result = await client.query<{ last_number: number }>(
    `INSERT INTO certificate_sequences (year, last_number)
     VALUES ($1, 1)
     ON CONFLICT (year) DO UPDATE
       SET last_number = certificate_sequences.last_number + 1
     RETURNING last_number`,
    [year]
  );
  const seq = result.rows[0]?.last_number ?? 1;
  return `AB-ECHT-${year}-${String(seq).padStart(6, "0")}`;
}

export function generateVerificationCode(): string {
  const bytes = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `AB-VERIFY-${bytes}`;
}

export function getCertificatePublicUrl(certificateNumber: string): string {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/certificate/${encodeURIComponent(certificateNumber)}`;
}
