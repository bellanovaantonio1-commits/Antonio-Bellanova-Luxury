import { Express } from "express";
import { AuthRequest, requireAuth, requireRole } from "../../middleware/auth.ts";
import { getSettingsMap, updateSettingsMap } from "../settings.ts";
import {
  activateLegalDocumentVersion,
  buildLegalAcceptanceSnapshot,
  getLegalAdminOverview,
  getRenderedLegalDocument,
  listLegalDocumentVersions,
  publishLegalDocumentVersion,
} from "./service.ts";
import type { LegalDocumentKey, LegalLanguage } from "./types.ts";
import { LEGAL_DOCUMENT_KEYS } from "./types.ts";

function parseKey(raw: string): LegalDocumentKey | null {
  return LEGAL_DOCUMENT_KEYS.includes(raw as LegalDocumentKey) ? (raw as LegalDocumentKey) : null;
}

function parseLang(raw: unknown): LegalLanguage {
  return String(raw || "de") === "en" ? "en" : "de";
}

export function registerLegalRoutes(app: Express) {
  app.get("/api/legal/:key", async (req, res) => {
    try {
      const key = parseKey(req.params.key);
      if (!key) return res.status(404).json({ error: "Dokument nicht gefunden." });
      const lang = parseLang(req.query.lang);
      const doc = await getRenderedLegalDocument(key, lang);
      if (!doc) return res.status(404).json({ error: "Dokument nicht gefunden." });
      res.json({
        key,
        language: lang,
        version: doc.version,
        title: doc.title,
        html: doc.renderedHtml,
      });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Laden fehlgeschlagen." });
    }
  });

  app.get("/api/admin/legal/overview", requireAuth, requireRole(["ADMIN"]), async (_req, res) => {
    try {
      res.json(await getLegalAdminOverview());
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Laden fehlgeschlagen." });
    }
  });

  app.get("/api/admin/legal/documents/:key", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const key = parseKey(req.params.key);
      if (!key) return res.status(404).json({ error: "Unbekanntes Dokument." });
      const lang = parseLang(req.query.lang);
      const versions = await listLegalDocumentVersions(key, lang);
      const active = await getRenderedLegalDocument(key, lang);
      res.json({ key, language: lang, active, versions });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Laden fehlgeschlagen." });
    }
  });

  app.post("/api/admin/legal/documents/:key", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const key = parseKey(req.params.key);
      if (!key) return res.status(404).json({ error: "Unbekanntes Dokument." });
      const lang = parseLang(req.body.language || req.query.lang);
      const { title, contentHtml, changeNote, activate } = req.body;
      if (!title || !contentHtml) {
        return res.status(400).json({ error: "Titel und Inhalt erforderlich." });
      }
      const created = await publishLegalDocumentVersion({
        key,
        language: lang,
        title: String(title),
        contentHtml: String(contentHtml),
        changeNote: changeNote ? String(changeNote) : undefined,
        admin: { uid: req.user!.uid, name: req.user!.name, email: req.user!.email },
        activate: activate !== false,
      });
      res.status(201).json(created);
    } catch (error: unknown) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Speichern fehlgeschlagen." });
    }
  });

  app.post("/api/admin/legal/documents/version/:id/activate", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const doc = await activateLegalDocumentVersion(id);
      res.json(doc);
    } catch (error: unknown) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Aktivierung fehlgeschlagen." });
    }
  });

  app.put("/api/admin/legal/company", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const allowed = [
        "legalCompanyName",
        "shopName",
        "shopBrandName",
        "legalForm",
        "authorizedRepresentative",
        "contactAddress",
        "contactEmail",
        "contactPhone",
        "vatId",
        "taxNumber",
        "tradeRegisterCourt",
        "tradeRegisterNumber",
        "economicId",
        "supervisoryAuthority",
        "contentResponsible",
        "bankName",
        "bankIban",
        "bankBic",
        "bankAccountHolder",
        "paymentInstructionsDe",
        "paymentInstructionsEn",
      ];
      const patch: Record<string, string> = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) patch[key] = String(req.body[key] ?? "");
      }
      await updateSettingsMap(patch);
      res.json(await getSettingsMap());
    } catch (error: unknown) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Speichern fehlgeschlagen." });
    }
  });

  app.get("/api/legal/acceptance-snapshot", async (req, res) => {
    try {
      const lang = parseLang(req.query.lang);
      res.json(await buildLegalAcceptanceSnapshot(lang));
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Fehler." });
    }
  });
}

export { buildLegalAcceptanceSnapshot } from "./service.ts";
