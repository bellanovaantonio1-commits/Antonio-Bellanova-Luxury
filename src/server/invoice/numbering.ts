import type { PoolClient } from "pg";

/** Race-safe invoice number inside an open transaction: RE-2026-000001 */
export async function allocateInvoiceNumber(client: PoolClient): Promise<string> {
  const year = new Date().getFullYear();
  const result = await client.query<{ last_number: number }>(
    `INSERT INTO invoice_sequences (year, last_number)
     VALUES ($1, 1)
     ON CONFLICT (year) DO UPDATE
       SET last_number = invoice_sequences.last_number + 1
     RETURNING last_number`,
    [year]
  );
  const seq = result.rows[0]?.last_number ?? 1;
  return `RE-${year}-${String(seq).padStart(6, "0")}`;
}

/** Race-safe credit note number inside an open transaction: ST-2026-000001 */
export async function allocateCreditNoteNumber(client: PoolClient): Promise<string> {
  const year = new Date().getFullYear();
  const result = await client.query<{ last_number: number }>(
    `INSERT INTO credit_note_sequences (year, last_number)
     VALUES ($1, 1)
     ON CONFLICT (year) DO UPDATE
       SET last_number = credit_note_sequences.last_number + 1
     RETURNING last_number`,
    [year]
  );
  const seq = result.rows[0]?.last_number ?? 1;
  return `ST-${year}-${String(seq).padStart(6, "0")}`;
}
