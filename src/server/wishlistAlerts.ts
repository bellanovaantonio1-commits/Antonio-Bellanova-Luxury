import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { users, wishlistAlerts } from "../db/schema.ts";
import { sendEmail } from "./email.ts";

export async function notifyWishlistAlerts(opts: {
  productId: number;
  productName: string;
  productSlug: string;
  oldPrice?: string | null;
  newPrice?: string | null;
  oldStock?: number | null;
  newStock?: number | null;
}): Promise<void> {
  const { productId, productName, productSlug, oldPrice, newPrice, oldStock, newStock } = opts;

  const priceDropped =
    oldPrice != null &&
    newPrice != null &&
    parseFloat(newPrice) < parseFloat(oldPrice);
  const backInStock = (oldStock ?? 0) <= 0 && (newStock ?? 0) > 0;

  if (!priceDropped && !backInStock) return;

  const alerts = await db.select().from(wishlistAlerts).where(eq(wishlistAlerts.productId, productId));
  if (alerts.length === 0) return;

  const baseUrl = (process.env.SITE_URL || process.env.VITE_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const productUrl = `${baseUrl}/product/${productSlug}`;

  for (const alert of alerts) {
    const wantsPrice = alert.notifyPriceDrop === "true" && priceDropped;
    const wantsStock = alert.notifyBackInStock === "true" && backInStock;
    if (!wantsPrice && !wantsStock) continue;

    const [user] = await db.select().from(users).where(eq(users.uid, alert.userId)).limit(1);
    if (!user?.email) continue;

    const subject = wantsStock
      ? `${productName} — wieder verfügbar`
      : `${productName} — Preissenkung`;

    const body = wantsStock
      ? `<p>Ein Artikel auf Ihrer Wunschliste ist wieder verfügbar:</p><p><strong>${productName}</strong></p><p><a href="${productUrl}">Zum Produkt</a></p>`
      : `<p>Der Preis eines Artikels auf Ihrer Wunschliste wurde gesenkt:</p><p><strong>${productName}</strong></p><p>Neuer Preis: €${parseFloat(newPrice!).toLocaleString("de-DE")}</p><p><a href="${productUrl}">Zum Produkt</a></p>`;

    sendEmail({ to: user.email, subject, html: body }).catch((e) =>
      console.error("Wishlist alert email failed", e)
    );
  }
}
