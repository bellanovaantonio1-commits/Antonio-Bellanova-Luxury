import { Express, Response } from "express";
import QRCode from "qrcode";
import { AuthRequest, requireAuth, requireRole } from "../../middleware/auth.ts";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { products } from "../../db/schema.ts";
import {
  activateCertificate,
  cancelCertificatesForOrder,
  createCertificateForProduct,
  getCertificateAuditLog,
  getCertificateById,
  getCertificateByNumber,
  getCertificateForProduct,
  getCertificatePdfBuffer,
  getCertificatePdfBufferByNumber,
  getOrderCertificateSummary,
  issueCertificatesForPaidOrder,
  linkCertificateToOrder,
  listCertificatesAdmin,
  listCertificatesForCustomer,
  toPublicVerification,
  updateCertificateStatus,
  userCanAccessCertificate,
} from "./service.ts";
import { isProductCertifiable } from "./eligibility.ts";
import { getCertificatePublicUrl } from "./numbering.ts";
import { CERTIFICATE_STATUS_LABELS, type CertificateStatus } from "./types.ts";

export function registerCertificateRoutes(app: Express) {
  // Public verification (no customer data)
  app.get("/api/certificates/verify/:certificateNumber", async (req, res) => {
    try {
      const cert = await getCertificateByNumber(req.params.certificateNumber);
      if (!cert) return res.status(404).json({ error: "Zertifikat nicht gefunden." });
      res.json(toPublicVerification(cert));
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Verifikation fehlgeschlagen." });
    }
  });

  app.get("/api/certificates/verify/:certificateNumber/pdf", async (req, res) => {
    try {
      const buffer = await getCertificatePdfBufferByNumber(req.params.certificateNumber);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${req.params.certificateNumber}.pdf"`
      );
      res.send(buffer);
    } catch (error: unknown) {
      res.status(404).json({ error: error instanceof Error ? error.message : "PDF nicht verfügbar." });
    }
  });

  app.get("/api/certificates/verify/:certificateNumber/qr", async (req, res) => {
    try {
      const cert = await getCertificateByNumber(req.params.certificateNumber);
      if (!cert) return res.status(404).json({ error: "Zertifikat nicht gefunden." });
      const verifyUrl = getCertificatePublicUrl(cert.certificateNumber);
      const png = await QRCode.toBuffer(verifyUrl, {
        margin: 1,
        width: 240,
        color: { dark: "#111111", light: "#FFFFFF" },
      });
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(png);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : "QR-Code fehlgeschlagen." });
    }
  });

  app.get("/api/products/:slug/certificate", async (req, res) => {
    try {
      const [product] = await db
        .select({ id: products.id, type: products.type })
        .from(products)
        .where(eq(products.slug, req.params.slug))
        .limit(1);
      if (!product) return res.status(404).json({ error: "Produkt nicht gefunden." });

      const eligible = isProductCertifiable(product);
      if (!eligible) {
        return res.json({ eligible: false, certificate: null });
      }

      res.json({
        eligible: true,
        certificate: null,
        messages: {
          de: {
            title: "Echtheitszertifikat",
            subtitle: "Digital verifizierbar",
            note: "Zertifikat nach Zahlungseingang verfügbar",
          },
          en: {
            title: "Certificate of authenticity",
            subtitle: "Digitally verifiable",
            note: "Certificate available after payment is received",
          },
        },
      });
    } catch (error: unknown) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Zertifikat konnte nicht geladen werden.",
      });
    }
  });

  // Customer certificates
  app.get("/api/account/certificates", requireAuth, async (req: AuthRequest, res) => {
    try {
      const list = await listCertificatesForCustomer(req.user!.uid);
      res.json(
        list.map((c) => ({
          id: c.id,
          certificateNumber: c.certificateNumber,
          verificationCode: c.verificationCode,
          status: c.status,
          issuedAt: c.issuedAt,
          productName: c.snapshotData.productName || c.productName,
          brand: c.snapshotData.brand,
          model: c.snapshotData.model,
          referenceNumber: c.snapshotData.referenceNumber,
          orderId: c.orderId,
          orderNumber: c.orderNumber,
          mainImage: c.snapshotData.mainImage || null,
          verifyUrl: `/verify/certificate/${encodeURIComponent(c.certificateNumber)}`,
          detailUrl: `/account/certificates/${c.id}`,
        }))
      );
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Laden fehlgeschlagen." });
    }
  });

  app.get("/api/account/certificates/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!(await userCanAccessCertificate(id, req.user!.uid))) {
        return res.status(403).json({ error: "Zugriff verweigert." });
      }
      const cert = await getCertificateById(id);
      if (!cert) return res.status(404).json({ error: "Nicht gefunden." });
      res.json({
        certificate: {
          id: cert.id,
          certificateNumber: cert.certificateNumber,
          verificationCode: cert.verificationCode,
          status: cert.status,
          statusLabelDe: CERTIFICATE_STATUS_LABELS[cert.status].de,
          statusLabelEn: CERTIFICATE_STATUS_LABELS[cert.status].en,
          issuedAt: cert.issuedAt,
          orderNumber: cert.orderNumber,
          snapshot: cert.snapshotData,
          verifyUrl: `/verify/certificate/${encodeURIComponent(cert.certificateNumber)}`,
          qrUrl: `/api/certificates/verify/${encodeURIComponent(cert.certificateNumber)}/qr`,
        },
      });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Laden fehlgeschlagen." });
    }
  });

  app.get("/api/account/certificates/:id/pdf", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!(await userCanAccessCertificate(id, req.user!.uid))) {
        return res.status(403).json({ error: "Zugriff verweigert." });
      }
      const buffer = await getCertificatePdfBuffer(id);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="certificate-${id}.pdf"`);
      res.send(buffer);
    } catch (error: unknown) {
      res.status(400).json({ error: error instanceof Error ? error.message : "PDF fehlgeschlagen." });
    }
  });

  // Product certificate (admin)
  app.get("/api/admin/products/:productId/certificate", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const productId = parseInt(req.params.productId, 10);
      const cert = await getCertificateForProduct(productId);
      res.json({ certificate: cert });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Laden fehlgeschlagen." });
    }
  });

  app.post("/api/admin/products/:productId/certificate", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const productId = parseInt(req.params.productId, 10);
      const { language, activate } = req.body;
      let cert = await createCertificateForProduct(productId, {
        language: language === "en" ? "en" : "de",
        admin: { uid: req.user!.uid, name: req.user!.name, email: req.user!.email },
      });
      if (activate) {
        cert = await activateCertificate(cert.id, {
          uid: req.user!.uid,
          name: req.user!.name,
          email: req.user!.email,
        });
      }
      res.status(201).json(cert);
    } catch (error: unknown) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Erstellung fehlgeschlagen." });
    }
  });

  // Admin certificate management
  app.get("/api/admin/certificates", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const list = await listCertificatesAdmin({
        q: String(req.query.q || ""),
        status: String(req.query.status || "ALL"),
        limit: parseInt(String(req.query.limit || "50"), 10),
        offset: parseInt(String(req.query.offset || "0"), 10),
      });
      res.json({ certificates: list });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Laden fehlgeschlagen." });
    }
  });

  app.get("/api/admin/certificates/:id", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const cert = await getCertificateById(parseInt(req.params.id, 10));
      if (!cert) return res.status(404).json({ error: "Nicht gefunden." });
      const audit = await getCertificateAuditLog(cert.id);
      res.json({ certificate: cert, audit });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Laden fehlgeschlagen." });
    }
  });

  app.post("/api/admin/certificates/:id/activate", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const cert = await activateCertificate(parseInt(req.params.id, 10), {
        uid: req.user!.uid,
        name: req.user!.name,
        email: req.user!.email,
      });
      res.json(cert);
    } catch (error: unknown) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Aktivierung fehlgeschlagen." });
    }
  });

  app.patch("/api/admin/certificates/:id/status", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const status = String(req.body.status || "") as CertificateStatus;
      if (!["DRAFT", "ACTIVE", "CANCELLED", "REPLACED"].includes(status)) {
        return res.status(400).json({ error: "Ungültiger Status." });
      }
      const cert = await updateCertificateStatus(parseInt(req.params.id, 10), status, {
        uid: req.user!.uid,
        name: req.user!.name,
        email: req.user!.email,
      });
      res.json(cert);
    } catch (error: unknown) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Statusänderung fehlgeschlagen." });
    }
  });

  app.post("/api/admin/certificates/:id/link-order", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const { orderId, orderItemId } = req.body;
      const cert = await linkCertificateToOrder(
        parseInt(req.params.id, 10),
        parseInt(String(orderId), 10),
        orderItemId ? parseInt(String(orderItemId), 10) : null,
        { uid: req.user!.uid, name: req.user!.name, email: req.user!.email }
      );
      res.json(cert);
    } catch (error: unknown) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Verknüpfung fehlgeschlagen." });
    }
  });

  app.get("/api/admin/certificates/:id/pdf", requireAuth, requireRole(["ADMIN"]), async (req, res: Response) => {
    try {
      const buffer = await getCertificatePdfBuffer(parseInt(req.params.id, 10));
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="certificate-${req.params.id}.pdf"`);
      res.send(buffer);
    } catch (error: unknown) {
      res.status(400).json({ error: error instanceof Error ? error.message : "PDF fehlgeschlagen." });
    }
  });

  app.get("/api/admin/orders/:orderId/certificates", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId, 10);
      const list = await listCertificatesAdmin({ q: "", status: "ALL", limit: 200 });
      const summary = await getOrderCertificateSummary(orderId);
      res.json({
        certificates: list.filter((c) => c.orderId === orderId),
        summary,
      });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Laden fehlgeschlagen." });
    }
  });

  app.post("/api/admin/orders/:orderId/issue-certificates", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const orderId = parseInt(req.params.orderId, 10);
      const result = await issueCertificatesForPaidOrder(orderId, {
        uid: req.user!.uid,
        name: req.user!.name,
        email: req.user!.email,
      });
      const summary = await getOrderCertificateSummary(orderId);
      res.json({ ...result, summary });
    } catch (error: unknown) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Zertifikatserstellung fehlgeschlagen." });
    }
  });
}

export {
  cancelCertificatesForOrder,
  issueCertificatesForPaidOrder,
  getOrderCertificateSummary,
  getOrderCertificateSummaries,
} from "./service.ts";
