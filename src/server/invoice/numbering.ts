import type { Pool } from "pg";

/** Race-safe invoice number: RE-2026-000001 */
export async function allocateInvoiceNumber(pool: Pool): Promise<string> {
  const year = new Date().getFullYear();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ last_number: number }>(
      `INSERT INTO invoice_sequences (year, last_number)
       VALUES ($1, 1)
       ON CONFLICT (year) DO UPDATE
         SET last_number = invoice_sequences.last_number + 1
       RETURNING last_number`,
      [year]
    );
    await client.query("COMMIT");
    const seq = result.rows[0]?.last_number ?? 1;
    return `RE-${year}-${String(seq).padStart(6, "0")}`;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
