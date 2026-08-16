import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { createPgPool } from "../../db/pool.ts";
import {
  brands,
  certificateAudit,
  certificates,
  orderItems,
  orders,
  products,
  users,
} from "../../db/schema.ts";
import { allocateCertificateNumber, generateVerificationCode, getCertificatePublicUrl } from "./numbering.ts";
import { buildOrderCertificateSnapshot, buildProductSnapshot, snapshotFromStored } from "./snapshot.ts";
import { applySnapshotImages, getAllCertificateImageUrls } from "./images.ts";
import { generateCertificatePdf } from "./pdf.ts";
import { isProductCertifiable } from "./eligibility.ts";
import { sendCertificateReadyEmail } from "../email.ts";
import type {
  CertificateRecord,
  CertificateSnapshot,
  CertificateStatus,
  PublicCertificateVerification,
} from "./types.ts";
import { CERTIFICATE_STATUS_LABELS } from "./types.ts";

const pool = createPgPool();

const SYSTEM_ACTOR = { uid: "system", name: "Automatik", email: null as string | null };

async function notifyCertificateEmail(cert: CertificateRecord, language: "de" | "en") {
  if (!cert.customerId) return;
  const [user] = await db.select().from(users).where(eq(users.uid, cert.customerId)).limit(1);
  if (!user?.email) return;

  sendCertificateReadyEmail({
    customerEmail: user.email,
    certificateNumber: cert.certificateNumber,
    productName: cert.snapshotData.productName || `${cert.snapshotData.brand} ${cert.snapshotData.model}`,
    verifyUrl: getCertificatePublicUrl(cert.certificateNumber),
    language,
  }).catch((err) => console.error("[certificate-email]", err));
}

export interface IssueCertificatesResult {
  created: CertificateRecord[];
  skipped: number;
  errors: string[];
}

export interface OrderCertificateSummary {
  eligibleCount: number;
  issuedCount: number;
  activeCount: number;
  pendingCount: number;
  complete: boolean;
  hasPending: boolean;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes("duplicate key") ||
      err.message.includes("unique constraint") ||
      err.message.includes("idx_certificates_order_item_id_unique"))
  );
}

type CertRow = typeof certificates.$inferSelect;

function rowToRecord(
  row: CertRow,
  extras?: Partial<CertificateRecord>
): CertificateRecord {
  return {
    id: row.id,
    certificateNumber: row.certificateNumber,
    verificationCode: row.verificationCode,
    productId: row.productId,
    orderId: row.orderId,
    orderItemId: row.orderItemId,
    customerId: row.customerId,
    status: row.status as CertificateStatus,
    language: row.language === "en" ? "en" : "de",
    issuedAt: row.issuedAt ? row.issuedAt.toISOString() : null,
    replacedById: row.replacedById,
    snapshotData: snapshotFromStored(row.snapshotData),
    createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() || new Date().toISOString(),
    ...extras,
  };
}

async function logAudit(
  certificateId: number,
  admin: { uid: string; name?: string | null; email?: string | null },
  fieldName: string,
  oldValue: string | null,
  newValue: string | null
) {
  await db.insert(certificateAudit).values({
    certificateId,
    adminUid: admin.uid,
    adminName: admin.name || null,
    adminEmail: admin.email || null,
    fieldName,
    oldValue,
    newValue,
  });
}

export async function getCertificateById(id: number): Promise<CertificateRecord | null> {
  const [row] = await db.select().from(certificates).where(eq(certificates.id, id)).limit(1);
  if (!row) return null;
  return enrichCertificate(row);
}

export async function getCertificateByNumber(certificateNumber: string): Promise<CertificateRecord | null> {
  const [row] = await db
    .select()
    .from(certificates)
    .where(eq(certificates.certificateNumber, certificateNumber))
    .limit(1);
  if (!row) return null;
  return enrichCertificate(row);
}

async function enrichCertificate(row: CertRow): Promise<CertificateRecord> {
  const [product] = await db.select().from(products).where(eq(products.id, row.productId)).limit(1);
  let orderNumber: string | null = null;
  let customerEmail: string | null = null;
  let customerName: string | null = null;

  if (row.orderId) {
    const [order] = await db.select().from(orders).where(eq(orders.id, row.orderId)).limit(1);
    orderNumber = order?.orderNumber || null;
    if (order?.userId) {
      const [user] = await db.select().from(users).where(eq(users.uid, order.userId)).limit(1);
      customerEmail = user?.email || null;
      customerName = order.customerName || null;
    }
  }

  return rowToRecord(row, {
    productSlug: product?.slug || null,
    productName: product?.name || rowToRecord(row).snapshotData.productName,
    orderNumber,
    customerEmail,
    customerName,
    snapshotData: applySnapshotImages(snapshotFromStored(row.snapshotData), product),
  });
}

export async function getCertificateByOrderItemId(orderItemId: number): Promise<CertificateRecord | null> {
  const [row] = await db
    .select()
    .from(certificates)
    .where(eq(certificates.orderItemId, orderItemId))
    .limit(1);
  if (!row) return null;
  return enrichCertificate(row);
}

async function createActiveCertificateForOrderItem(opts: {
  productId: number;
  orderId: number;
  orderItemId: number;
  customerId: string | null;
  language: "de" | "en";
  order: typeof orders.$inferSelect;
  admin: { uid: string; name?: string | null; email?: string | null };
}): Promise<CertificateRecord> {
  const snapshot = await buildOrderCertificateSnapshot(opts.productId, opts.order, opts.language);
  const client = await pool.connect();
  const now = new Date();

  try {
    await client.query("BEGIN");
    const certificateNumber = await allocateCertificateNumber(client);
    const verificationCode = generateVerificationCode();

    const insert = await client.query<{ id: number }>(
      `INSERT INTO certificates (
        certificate_number, verification_code, product_id, order_id, order_item_id,
        customer_id, status, language, issued_at, snapshot_data, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7, $8, $9, $8)
      RETURNING id`,
      [
        certificateNumber,
        verificationCode,
        opts.productId,
        opts.orderId,
        opts.orderItemId,
        opts.customerId,
        opts.language,
        now,
        JSON.stringify(snapshot),
      ]
    );

    await client.query("COMMIT");
    const created = await getCertificateById(insert.rows[0].id);
    if (!created) throw new Error("Zertifikat konnte nicht geladen werden.");

    await logAudit(created.id, opts.admin, "status", null, "ACTIVE");
    return created;
  } catch (err) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(err)) {
      const existing = await getCertificateByOrderItemId(opts.orderItemId);
      if (existing) return existing;
    }
    throw err;
  } finally {
    client.release();
  }
}

/** Idempotent: erstellt Zertifikate für alle zertifizierbaren Positionen einer bezahlten Bestellung. */
export async function issueCertificatesForPaidOrder(
  orderId: number,
  actor?: { uid: string; name?: string | null; email?: string | null }
): Promise<IssueCertificatesResult> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) {
    return { created: [], skipped: 0, errors: ["Bestellung nicht gefunden."] };
  }

  if (order.paymentStatus !== "PAID") {
    return { created: [], skipped: 0, errors: ["Bestellung ist nicht bezahlt."] };
  }

  if (order.status === "CANCELLED") {
    return { created: [], skipped: 0, errors: ["Bestellung ist storniert."] };
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const language = order.language === "en" ? "en" : "de";
  const admin = actor || SYSTEM_ACTOR;
  const created: CertificateRecord[] = [];
  let skipped = 0;
  const errors: string[] = [];

  for (const item of items) {
    if (!item.productId) continue;

    const existing = await getCertificateByOrderItemId(item.id);
    if (existing) {
      skipped++;
      continue;
    }

    const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (!product || !isProductCertifiable(product)) continue;

    try {
      const cert = await createActiveCertificateForOrderItem({
        productId: item.productId,
        orderId: order.id,
        orderItemId: item.id,
        customerId: order.userId,
        language,
        order,
        admin,
      });
      created.push(cert);
    } catch (err) {
      if (isUniqueViolation(err)) {
        const again = await getCertificateByOrderItemId(item.id);
        if (again) {
          skipped++;
          continue;
        }
      }
      errors.push(err instanceof Error ? err.message : "Unbekannter Fehler");
    }
  }

  for (const cert of created) {
    await notifyCertificateEmail(cert, language);
  }

  return { created, skipped, errors };
}

export async function getOrderCertificateSummary(orderId: number): Promise<OrderCertificateSummary> {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  let eligibleCount = 0;

  for (const item of items) {
    if (!item.productId) continue;
    const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (product && isProductCertifiable(product)) eligibleCount++;
  }

  const certRows = await db.select().from(certificates).where(eq(certificates.orderId, orderId));
  const issuedCount = certRows.length;
  const activeCount = certRows.filter((c) => c.status === "ACTIVE").length;
  const pendingCount = Math.max(0, eligibleCount - issuedCount);

  return {
    eligibleCount,
    issuedCount,
    activeCount,
    pendingCount,
    complete: eligibleCount > 0 && issuedCount >= eligibleCount,
    hasPending: eligibleCount > 0 && issuedCount < eligibleCount,
  };
}

export async function getOrderCertificateSummaries(
  orderIds: number[]
): Promise<Map<number, OrderCertificateSummary>> {
  const map = new Map<number, OrderCertificateSummary>();
  await Promise.all(
    orderIds.map(async (id) => {
      map.set(id, await getOrderCertificateSummary(id));
    })
  );
  return map;
}

export async function getCertificateForProduct(productId: number): Promise<CertificateRecord | null> {
  const [row] = await db
    .select()
    .from(certificates)
    .where(
      and(
        eq(certificates.productId, productId),
        inArray(certificates.status, ["DRAFT", "ACTIVE"])
      )
    )
    .orderBy(desc(certificates.createdAt))
    .limit(1);
  if (!row) return null;
  return enrichCertificate(row);
}

export async function getActiveCertificateForProduct(productId: number): Promise<CertificateRecord | null> {
  const [row] = await db
    .select()
    .from(certificates)
    .where(and(eq(certificates.productId, productId), eq(certificates.status, "ACTIVE")))
    .orderBy(desc(certificates.issuedAt))
    .limit(1);
  if (!row) return null;
  return enrichCertificate(row);
}

export async function createCertificateForProduct(
  productId: number,
  opts: {
    language?: "de" | "en";
    orderId?: number | null;
    orderItemId?: number | null;
    customerId?: string | null;
    admin: { uid: string; name?: string | null; email?: string | null };
  }
): Promise<CertificateRecord> {
  const existing = await getCertificateForProduct(productId);
  if (existing) {
    throw new Error("Für dieses Produkt existiert bereits ein Zertifikat.");
  }

  const snapshot = await buildProductSnapshot(productId, opts.language || "de");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const certificateNumber = await allocateCertificateNumber(client);
    const verificationCode = generateVerificationCode();

    const insert = await client.query<{ id: number }>(
      `INSERT INTO certificates (
        certificate_number, verification_code, product_id, order_id, order_item_id,
        customer_id, status, language, snapshot_data
      ) VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT', $7, $8)
      RETURNING id`,
      [
        certificateNumber,
        verificationCode,
        productId,
        opts.orderId ?? null,
        opts.orderItemId ?? null,
        opts.customerId ?? null,
        opts.language || "de",
        JSON.stringify(snapshot),
      ]
    );

    await client.query("COMMIT");
    const created = await getCertificateById(insert.rows[0].id);
    if (!created) throw new Error("Zertifikat konnte nicht geladen werden.");

    await logAudit(created.id, opts.admin, "status", null, "DRAFT");
    return created;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function activateCertificate(
  certificateId: number,
  admin: { uid: string; name?: string | null; email?: string | null }
): Promise<CertificateRecord> {
  const cert = await getCertificateById(certificateId);
  if (!cert) throw new Error("Zertifikat nicht gefunden.");
  if (cert.status === "ACTIVE") return cert;
  if (cert.status !== "DRAFT") {
    throw new Error("Nur Entwürfe können ausgestellt werden.");
  }

  const now = new Date();
  await db
    .update(certificates)
    .set({ status: "ACTIVE", issuedAt: now, updatedAt: now })
    .where(eq(certificates.id, certificateId));

  await logAudit(certificateId, admin, "status", "DRAFT", "ACTIVE");
  const updated = await getCertificateById(certificateId);
  if (!updated) throw new Error("Zertifikat nicht gefunden.");
  await notifyCertificateEmail(updated, updated.language === "en" ? "en" : "de");
  return updated;
}

export async function updateCertificateStatus(
  certificateId: number,
  status: CertificateStatus,
  admin: { uid: string; name?: string | null; email?: string | null }
): Promise<CertificateRecord> {
  const cert = await getCertificateById(certificateId);
  if (!cert) throw new Error("Zertifikat nicht gefunden.");
  if (cert.status === status) return cert;

  await db
    .update(certificates)
    .set({ status, updatedAt: new Date() })
    .where(eq(certificates.id, certificateId));

  await logAudit(certificateId, admin, "status", cert.status, status);
  const updated = await getCertificateById(certificateId);
  if (!updated) throw new Error("Zertifikat nicht gefunden.");
  return updated;
}

export async function refreshCertificateSnapshot(
  certificateId: number,
  admin: { uid: string; name?: string | null; email?: string | null }
): Promise<CertificateRecord> {
  const cert = await getCertificateById(certificateId);
  if (!cert) throw new Error("Zertifikat nicht gefunden.");

  let snapshot: CertificateSnapshot;
  if (cert.orderId) {
    const [order] = await db.select().from(orders).where(eq(orders.id, cert.orderId)).limit(1);
    if (order) {
      snapshot = await buildOrderCertificateSnapshot(cert.productId, order, cert.language);
    } else {
      snapshot = await buildProductSnapshot(cert.productId, cert.language);
    }
  } else {
    snapshot = await buildProductSnapshot(cert.productId, cert.language);
  }

  const previous = cert.snapshotData;
  if (cert.orderId && previous.orderNumber && !snapshot.orderNumber) {
    snapshot.orderNumber = previous.orderNumber;
  }
  if (cert.orderId && previous.purchaseDate) {
    snapshot.purchaseDate = previous.purchaseDate;
  }
  if (cert.orderId && previous.paymentStatus) {
    snapshot.paymentStatus = previous.paymentStatus;
  }

  await db
    .update(certificates)
    .set({ snapshotData: snapshot, updatedAt: new Date() })
    .where(eq(certificates.id, certificateId));

  await logAudit(certificateId, admin, "snapshotData", "previous", "refreshed");
  const updated = await getCertificateById(certificateId);
  if (!updated) throw new Error("Zertifikat nicht gefunden.");
  return updated;
}

export async function refreshCertificatesForProduct(
  productId: number,
  admin?: { uid: string; name?: string | null; email?: string | null }
): Promise<number> {
  const actor = admin || SYSTEM_ACTOR;
  const rows = await db
    .select()
    .from(certificates)
    .where(
      and(eq(certificates.productId, productId), inArray(certificates.status, ["DRAFT", "ACTIVE"]))
    );

  let count = 0;
  for (const row of rows) {
    await refreshCertificateSnapshot(row.id, actor);
    count++;
  }
  return count;
}

export async function refreshAllCertificateSnapshots(
  admin: { uid: string; name?: string | null; email?: string | null }
): Promise<{ updated: number; errors: string[] }> {
  const rows = await db
    .select()
    .from(certificates)
    .where(inArray(certificates.status, ["DRAFT", "ACTIVE"]));

  let updated = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      await refreshCertificateSnapshot(row.id, admin);
      updated++;
    } catch (err) {
      errors.push(
        `${row.certificateNumber}: ${err instanceof Error ? err.message : "Unbekannter Fehler"}`
      );
    }
  }

  return { updated, errors };
}

export async function linkCertificateToOrder(
  certificateId: number,
  orderId: number,
  orderItemId: number | null,
  admin: { uid: string; name?: string | null; email?: string | null }
): Promise<CertificateRecord> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Bestellung nicht gefunden.");

  const cert = await getCertificateById(certificateId);
  if (!cert) throw new Error("Zertifikat nicht gefunden.");

  await db
    .update(certificates)
    .set({
      orderId,
      orderItemId,
      customerId: order.userId,
      updatedAt: new Date(),
    })
    .where(eq(certificates.id, certificateId));

  await logAudit(certificateId, admin, "orderId", String(cert.orderId || ""), String(orderId));
  const updated = await getCertificateById(certificateId);
  if (!updated) throw new Error("Zertifikat nicht gefunden.");
  return updated;
}

export async function cancelCertificatesForOrder(orderId: number, admin?: { uid: string; name?: string | null; email?: string | null }) {
  const rows = await db
    .select()
    .from(certificates)
    .where(and(eq(certificates.orderId, orderId), eq(certificates.status, "ACTIVE")));

  for (const row of rows) {
    await db
      .update(certificates)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(eq(certificates.id, row.id));

    if (admin) {
      await logAudit(row.id, admin, "status", "ACTIVE", "CANCELLED");
    }
  }
}

export async function linkCertificatesForOrderItems(orderId: number) {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return;

  for (const item of items) {
    if (!item.productId) continue;
    const [cert] = await db
      .select()
      .from(certificates)
      .where(
        and(
          eq(certificates.productId, item.productId),
          inArray(certificates.status, ["DRAFT", "ACTIVE"])
        )
      )
      .limit(1);

    if (cert && !cert.orderId) {
      await db
        .update(certificates)
        .set({
          orderId,
          orderItemId: item.id,
          customerId: order.userId,
          updatedAt: new Date(),
        })
        .where(eq(certificates.id, cert.id));
    }
  }
}

export function toPublicVerification(cert: CertificateRecord): PublicCertificateVerification {
  const snap = cert.snapshotData;
  const imageUrls = getAllCertificateImageUrls(snap);
  const status = cert.status;
  const labels = CERTIFICATE_STATUS_LABELS[status];
  const valid = status === "ACTIVE";

  const messageDe =
    status === "ACTIVE"
      ? "Zertifikat gültig"
      : status === "CANCELLED"
        ? "Dieses Zertifikat ist nicht mehr gültig."
        : status === "REPLACED"
          ? "Dieses Zertifikat wurde durch ein neues Zertifikat ersetzt."
          : "Dieses Zertifikat ist noch nicht ausgestellt.";

  const messageEn =
    status === "ACTIVE"
      ? "Certificate valid"
      : status === "CANCELLED"
        ? "This certificate is no longer valid."
        : status === "REPLACED"
          ? "This certificate has been replaced by a new certificate."
          : "This certificate has not been issued yet.";

  return {
    valid,
    certificateNumber: cert.certificateNumber,
    status,
    statusLabelDe: labels.de,
    statusLabelEn: labels.en,
    brand: snap.brand,
    model: snap.model,
    referenceNumber: snap.referenceNumber,
    productName: snap.productName || "",
    mainImage: imageUrls[0] || null,
    images: imageUrls,
    issuedAt: cert.issuedAt,
    messageDe,
    messageEn,
  };
}

export async function listCertificatesAdmin(filters: {
  q?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(filters.limit || 50, 200);
  const offset = filters.offset || 0;

  let query = db
    .select({
      cert: certificates,
      product: products,
      brand: brands,
      order: orders,
      user: users,
    })
    .from(certificates)
    .leftJoin(products, eq(certificates.productId, products.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(orders, eq(certificates.orderId, orders.id))
    .leftJoin(users, eq(certificates.customerId, users.uid))
    .orderBy(desc(certificates.createdAt))
    .limit(limit)
    .offset(offset);

  const rows = await query;

  let filtered = rows;
  if (filters.status && filters.status !== "ALL") {
    filtered = filtered.filter((r) => r.cert.status === filters.status);
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim().toLowerCase();
    filtered = filtered.filter((r) => {
      const snap = r.cert.snapshotData as CertificateSnapshot;
      return (
        r.cert.certificateNumber.toLowerCase().includes(q) ||
        String(r.product?.name || "").toLowerCase().includes(q) ||
        String(r.brand?.name || "").toLowerCase().includes(q) ||
        String(snap.model || "").toLowerCase().includes(q) ||
        String(snap.referenceNumber || "").toLowerCase().includes(q) ||
        String(r.order?.orderNumber || "").toLowerCase().includes(q)
      );
    });
  }

  return filtered.map((r) =>
    rowToRecord(r.cert, {
      productName: r.product?.name || null,
      productSlug: r.product?.slug || null,
      orderNumber: r.order?.orderNumber || null,
      customerEmail: r.user?.email || r.order?.customerEmail || null,
      customerName: r.order?.customerName || null,
      paymentStatus: r.order?.paymentStatus || null,
    })
  );
}

export async function listCertificatesForCustomer(userId: string): Promise<CertificateRecord[]> {
  const rows = await db
    .select()
    .from(certificates)
    .where(
      and(
        eq(certificates.customerId, userId),
        inArray(certificates.status, ["ACTIVE", "CANCELLED", "REPLACED"])
      )
    )
    .orderBy(desc(certificates.issuedAt));

  const result: CertificateRecord[] = [];
  for (const row of rows) {
    result.push(await enrichCertificate(row));
  }
  return result;
}

export async function getCertificatePdfBuffer(certificateId: number): Promise<Buffer> {
  const cert = await getCertificateById(certificateId);
  if (!cert) throw new Error("Zertifikat nicht gefunden.");
  if (cert.status === "DRAFT") throw new Error("Entwürfe können nicht als PDF ausgestellt werden.");
  return generateCertificatePdf(cert);
}

export async function getCertificatePdfBufferByNumber(certificateNumber: string): Promise<Buffer> {
  const cert = await getCertificateByNumber(certificateNumber);
  if (!cert) throw new Error("Zertifikat nicht gefunden.");
  return getCertificatePdfBuffer(cert.id);
}

export async function getCertificateAuditLog(certificateId: number) {
  return db
    .select()
    .from(certificateAudit)
    .where(eq(certificateAudit.certificateId, certificateId))
    .orderBy(desc(certificateAudit.changedAt));
}

export async function userCanAccessCertificate(certificateId: number, userId: string): Promise<boolean> {
  const [row] = await db.select().from(certificates).where(eq(certificates.id, certificateId)).limit(1);
  return !!row && row.customerId === userId;
}
