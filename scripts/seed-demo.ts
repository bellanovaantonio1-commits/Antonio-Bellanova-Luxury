import "../src/load-env.ts";

import { createPgPool } from "../src/db/pool.ts";

const demoBrands = [
  { name: "Rolex", slug: "rolex" },
  { name: "Patek Philippe", slug: "patek-philippe" },
  { name: "Cartier", slug: "cartier" },
  { name: "Omega", slug: "omega" },
];

const demoProducts = [
  {
    name: "Rolex Submariner Date",
    slug: "rolex-submariner-date-126610ln",
    sku: "RLX-126610LN",
    type: "WATCH",
    brandSlug: "rolex",
    price: "14500",
    status: "ACTIVE",
    stock: 1,
    descriptionDe: "Rolex Submariner Date Referenz 126610LN. Full Set, Ungetragen.",
    images: ["https://images.unsplash.com/photo-1523170335258-f5ed11844acb?w=800"],
    mainImage: "https://images.unsplash.com/photo-1523170335258-f5ed11844acb?w=800",
  },
  {
    name: "Patek Philippe Nautilus",
    slug: "patek-philippe-nautilus-5711",
    sku: "PP-5711-1A",
    type: "WATCH",
    brandSlug: "patek-philippe",
    price: "158400",
    status: "ACTIVE",
    stock: 1,
    descriptionDe: "Patek Philippe Nautilus 5711/1A. Exzellenter Zustand, Full Set.",
    images: ["https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=800"],
    mainImage: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=800",
  },
  {
    name: "Cartier Love Bracelet",
    slug: "cartier-love-bracelet-gold",
    sku: "CAR-LOVE-GLD",
    type: "JEWELRY",
    brandSlug: "cartier",
    price: "8200",
    status: "ACTIVE",
    stock: 2,
    descriptionDe: "Cartier Love Bracelet in Gelbgold. Größe 17, mit Schraubendreher.",
    images: ["https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800"],
    mainImage: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800",
  },
];

async function seed() {
  const pool = createPgPool();
  const client = await pool.connect();

  try {
    console.log("Seeding demo data...");

    for (const b of demoBrands) {
      await client.query(
        `INSERT INTO brands (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING`,
        [b.name, b.slug]
      );
    }

    await client.query(
      `INSERT INTO categories (name_de, slug) VALUES ('Uhren', 'watches'), ('Schmuck', 'jewelry') ON CONFLICT (slug) DO NOTHING`
    ).catch(() => {
      // slug might not be unique constraint on categories in all setups
    });

    for (const p of demoProducts) {
      const brandRes = await client.query(`SELECT id FROM brands WHERE slug = $1`, [p.brandSlug]);
      const brandId = brandRes.rows[0]?.id;

      await client.query(
        `INSERT INTO products (name, slug, sku, brand_id, type, price, status, stock, description_de, images, main_image, published)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'true')
         ON CONFLICT (slug) DO NOTHING`,
        [p.name, p.slug, p.sku, brandId, p.type, p.price, p.status, p.stock, p.descriptionDe, JSON.stringify(p.images), p.mainImage]
      );
    }

    console.log("Demo products seeded successfully!");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
