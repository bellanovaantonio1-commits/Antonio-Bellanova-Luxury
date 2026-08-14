import "../src/load-env.ts";

import { resolvePublicCondition, displayOrNotSpecified } from "../src/server/certificate/conditionPublic.ts";
import { generateVerificationCode, getCertificatePublicUrl } from "../src/server/certificate/numbering.ts";
import { toPublicVerification } from "../src/server/certificate/service.ts";
import type { CertificateRecord } from "../src/server/certificate/types.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// 1. Zustandsbeschreibung ohne Rank-Codes
{
  const de = resolvePublicCondition({ overallRank: "A" }, "de");
  assert(de === "Sehr guter gebrauchter Zustand", "rank A → DE text");
  assert(!de.includes("Rank"), "no rank in public DE");
  const en = resolvePublicCondition({ overallRank: "SA" }, "en");
  assert(en === "Excellent pre-owned condition", "rank SA → EN text");
}

// 2. Unbekannte Werte
{
  assert(displayOrNotSpecified("", "de") === "Nicht angegeben", "empty DE");
  assert(displayOrNotSpecified(null, "en") === "Not specified", "empty EN");
}

// 3. Verifikationscode-Format
{
  const code = generateVerificationCode();
  assert(/^AB-VERIFY-[A-F0-9]{8}$/.test(code), "verification code format");
  const codes = new Set(Array.from({ length: 20 }, () => generateVerificationCode()));
  assert(codes.size === 20, "verification codes unique in sample");
}

// 4. Öffentliche URL aus APP_URL
{
  const prev = process.env.APP_URL;
  process.env.APP_URL = "https://shop.example.com";
  const url = getCertificatePublicUrl("AB-ECHT-2026-000001");
  assert(url === "https://shop.example.com/certificate/AB-ECHT-2026-000001", "public URL");
  assert(!url.includes("localhost"), "no localhost in production URL");
  process.env.APP_URL = prev;
}

// 5. Öffentliche Verifikation ohne Kundendaten
{
  const mockCert: CertificateRecord = {
    id: 1,
    certificateNumber: "AB-ECHT-2026-000001",
    verificationCode: "AB-VERIFY-ABCDEF01",
    productId: 1,
    orderId: 99,
    orderItemId: 1,
    customerId: "secret-user",
    status: "ACTIVE",
    language: "de",
    issuedAt: "2026-01-15T10:00:00.000Z",
    replacedById: null,
    snapshotData: {
      brand: "Rolex",
      model: "Submariner",
      referenceNumber: "126610LN",
      serialNumber: "Nicht angegeben",
      category: "Nicht angegeben",
      movement: "Automatik",
      caseMaterial: "Stahl",
      caseSize: "41 mm",
      dial: "Schwarz",
      bracelet: "Oyster",
      clasp: "Nicht angegeben",
      waterResistance: "Nicht angegeben",
      year: "Nicht angegeben",
      conditionDe: "Sehr guter gebrauchter Zustand",
      conditionEn: "Very good pre-owned condition",
      scopeOfDeliveryDe: "Originalbox",
      scopeOfDeliveryEn: "Original box",
      productName: "Rolex Submariner",
      mainImageUrl: null,
    },
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-01-15T10:00:00.000Z",
    customerEmail: "secret@example.com",
    customerName: "Secret Customer",
    orderNumber: "ORD-999",
  };

  const pub = toPublicVerification(mockCert);
  const json = JSON.stringify(pub);
  assert(pub.valid === true, "ACTIVE is valid");
  assert(pub.brand === "Rolex", "brand in public");
  assert(!json.includes("secret"), "no customer id/email in public payload");
  assert(!("customerEmail" in pub), "no customerEmail field");
}

// 6. Storniertes Zertifikat
{
  const cancelled = toPublicVerification({
    ...({
      id: 2,
      certificateNumber: "AB-ECHT-2026-000002",
      verificationCode: "AB-VERIFY-12345678",
      productId: 1,
      orderId: null,
      orderItemId: null,
      customerId: null,
      status: "CANCELLED",
      language: "de",
      issuedAt: "2026-01-10T10:00:00.000Z",
      replacedById: null,
      snapshotData: {
        brand: "Omega",
        model: "Speedmaster",
        referenceNumber: "311.30.42.30.01.005",
        serialNumber: "Nicht angegeben",
        category: "Nicht angegeben",
        movement: "Nicht angegeben",
        caseMaterial: "Nicht angegeben",
        caseSize: "Nicht angegeben",
        dial: "Nicht angegeben",
        bracelet: "Nicht angegeben",
        clasp: "Nicht angegeben",
        waterResistance: "Nicht angegeben",
        year: "Nicht angegeben",
        conditionDe: "Nicht angegeben",
        conditionEn: "Not specified",
        scopeOfDeliveryDe: "Nicht angegeben",
        scopeOfDeliveryEn: "Not specified",
        productName: "Omega Speedmaster",
        mainImageUrl: null,
      },
      createdAt: "2026-01-10T10:00:00.000Z",
      updatedAt: "2026-01-11T10:00:00.000Z",
    } as CertificateRecord),
  });
  assert(cancelled.valid === false, "cancelled not valid");
  assert(cancelled.messageDe.includes("nicht mehr gültig"), "cancelled DE message");
}

console.log("All certificate tests passed.");
