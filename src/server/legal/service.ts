import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { legalDocuments } from "../../db/schema.ts";
import { getSettingsMap } from "../settings.ts";
import { getAllDefaultDocuments, getDefaultLegalDocument } from "./defaults.ts";
import { getMissingCompanyFields, renderLegalTemplate } from "./placeholders.ts";
import type {
  LegalAcceptanceSnapshot,
  LegalDocumentKey,
  LegalDocumentRecord,
  LegalLanguage,
} from "./types.ts";
import { LEGAL_DOCUMENT_KEYS } from "./types.ts";

type Row = typeof legalDocuments.$inferSelect;

let legalTableAvailable: boolean | null = null;

function isMissingLegalTableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("legal_documents") &&
    (msg.includes("does not exist") ||
      msg.includes("relation") ||
      msg.includes("Failed query") ||
      msg.includes("undefined_table"))
  );
}

async function isLegalTableReady(): Promise<boolean> {
  if (legalTableAvailable !== null) return legalTableAvailable;
  try {
    await db.select({ id: legalDocuments.id }).from(legalDocuments).limit(1);
    legalTableAvailable = true;
  } catch (error) {
    if (isMissingLegalTableError(error)) {
      legalTableAvailable = false;
      console.warn(
        "[legal] Tabelle legal_documents fehlt — Fallback auf System-Defaults. Bitte npm run db:migrate ausführen."
      );
    } else {
      throw error;
    }
  }
  return legalTableAvailable ?? false;
}

function defaultLegalRecord(key: LegalDocumentKey, lang: LegalLanguage): LegalDocumentRecord {
  const fallback = getDefaultLegalDocument(key, lang);
  return {
    id: 0,
    documentKey: key,
    language: lang,
    version: 1,
    title: fallback.title,
    contentHtml: fallback.contentHtml,
    changeNote: null,
    adminUid: null,
    adminName: null,
    adminEmail: null,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
}

function rowToRecord(row: Row): LegalDocumentRecord {
  return {
    id: row.id,
    documentKey: row.documentKey as LegalDocumentKey,
    language: row.language === "en" ? "en" : "de",
    version: row.version,
    title: row.title,
    contentHtml: row.contentHtml,
    changeNote: row.changeNote,
    adminUid: row.adminUid,
    adminName: row.adminName,
    adminEmail: row.adminEmail,
    isActive: row.isActive,
    createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
  };
}

export async function ensureLegalDefaults(): Promise<void> {
  if (!(await isLegalTableReady())) return;

  for (const { key, lang, doc } of getAllDefaultDocuments()) {
    try {
      const [existing] = await db
        .select()
        .from(legalDocuments)
        .where(and(eq(legalDocuments.documentKey, key), eq(legalDocuments.language, lang)))
        .limit(1);
      if (existing) continue;

      await db.insert(legalDocuments).values({
        documentKey: key,
        language: lang,
        version: 1,
        title: doc.title,
        contentHtml: doc.contentHtml,
        changeNote: "Initialversion (System)",
        isActive: true,
      });
    } catch (error) {
      if (isMissingLegalTableError(error)) {
        legalTableAvailable = false;
        return;
      }
      throw error;
    }
  }
}

export async function getActiveLegalDocument(
  key: LegalDocumentKey,
  lang: LegalLanguage
): Promise<LegalDocumentRecord | null> {
  if (!(await isLegalTableReady())) {
    return defaultLegalRecord(key, lang);
  }

  await ensureLegalDefaults();

  try {
    const [row] = await db
      .select()
      .from(legalDocuments)
      .where(
        and(
          eq(legalDocuments.documentKey, key),
          eq(legalDocuments.language, lang),
          eq(legalDocuments.isActive, true)
        )
      )
      .orderBy(desc(legalDocuments.version))
      .limit(1);

    if (row) return rowToRecord(row);
  } catch (error) {
    if (isMissingLegalTableError(error)) {
      legalTableAvailable = false;
      return defaultLegalRecord(key, lang);
    }
    throw error;
  }

  return defaultLegalRecord(key, lang);
}

export async function getRenderedLegalDocument(key: LegalDocumentKey, lang: LegalLanguage) {
  const settings = await getSettingsMap();
  const doc = await getActiveLegalDocument(key, lang);
  if (!doc) return null;
  return {
    ...doc,
    renderedHtml: renderLegalTemplate(doc.contentHtml, settings, lang),
  };
}

export async function listLegalDocumentVersions(key: LegalDocumentKey, lang: LegalLanguage) {
  if (!(await isLegalTableReady())) {
    return [defaultLegalRecord(key, lang)];
  }
  await ensureLegalDefaults();
  const rows = await db
    .select()
    .from(legalDocuments)
    .where(and(eq(legalDocuments.documentKey, key), eq(legalDocuments.language, lang)))
    .orderBy(desc(legalDocuments.version));
  return rows.map(rowToRecord);
}

export async function listAllActiveLegalDocuments() {
  await ensureLegalDefaults();
  const result: LegalDocumentRecord[] = [];
  for (const key of LEGAL_DOCUMENT_KEYS) {
    for (const lang of ["de", "en"] as LegalLanguage[]) {
      const doc = await getActiveLegalDocument(key, lang);
      if (doc) result.push(doc);
    }
  }
  return result;
}

export async function publishLegalDocumentVersion(opts: {
  key: LegalDocumentKey;
  language: LegalLanguage;
  title: string;
  contentHtml: string;
  changeNote?: string;
  admin: { uid: string; name?: string | null; email?: string | null };
  activate?: boolean;
}): Promise<LegalDocumentRecord> {
  if (!(await isLegalTableReady())) {
    throw new Error("Rechtstexte-Datenbank nicht verfügbar. Bitte npm run db:migrate ausführen.");
  }
  const versions = await listLegalDocumentVersions(opts.key, opts.language);
  const nextVersion = (versions[0]?.version ?? 0) + 1;

  if (opts.activate !== false) {
    await db
      .update(legalDocuments)
      .set({ isActive: false })
      .where(
        and(
          eq(legalDocuments.documentKey, opts.key),
          eq(legalDocuments.language, opts.language),
          eq(legalDocuments.isActive, true)
        )
      );
  }

  const [inserted] = await db
    .insert(legalDocuments)
    .values({
      documentKey: opts.key,
      language: opts.language,
      version: nextVersion,
      title: opts.title,
      contentHtml: opts.contentHtml,
      changeNote: opts.changeNote || null,
      adminUid: opts.admin.uid,
      adminName: opts.admin.name || null,
      adminEmail: opts.admin.email || null,
      isActive: opts.activate !== false,
    })
    .returning();

  return rowToRecord(inserted);
}

export async function activateLegalDocumentVersion(id: number): Promise<LegalDocumentRecord> {
  const [row] = await db.select().from(legalDocuments).where(eq(legalDocuments.id, id)).limit(1);
  if (!row) throw new Error("Version nicht gefunden.");

  await db
    .update(legalDocuments)
    .set({ isActive: false })
    .where(
      and(
        eq(legalDocuments.documentKey, row.documentKey),
        eq(legalDocuments.language, row.language),
        eq(legalDocuments.isActive, true)
      )
    );

  const [updated] = await db
    .update(legalDocuments)
    .set({ isActive: true })
    .where(eq(legalDocuments.id, id))
    .returning();

  return rowToRecord(updated);
}

export async function buildLegalAcceptanceSnapshot(
  lang: LegalLanguage
): Promise<LegalAcceptanceSnapshot> {
  const [terms, privacy] = await Promise.all([
    getActiveLegalDocument("terms", lang),
    getActiveLegalDocument("privacy", lang),
  ]);
  return {
    acceptedAt: new Date().toISOString(),
    termsVersion: terms?.version ?? 1,
    termsLanguage: lang,
    privacyVersion: privacy?.version ?? 1,
    privacyLanguage: lang,
    withdrawalAcknowledged: true,
  };
}

export async function getLegalAdminOverview() {
  const settings = await getSettingsMap();
  const missingFields = getMissingCompanyFields(settings);
  const documents = await listAllActiveLegalDocuments();
  return { settings, missingFields, documents };
}

export { getMissingCompanyFields, renderLegalTemplate };
