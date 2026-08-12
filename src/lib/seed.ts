import { db } from "./firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  Timestamp 
} from "firebase/firestore";

const seedData = async () => {
  console.log("Starting Firestore seeding...");

  // Brands
  const brands = [
    { id: "brand_patek", name: "Patek Philippe", slug: "patek-philippe", description: "The pinnacle of Swiss watchmaking." },
    { id: "brand_rolex", name: "Rolex", slug: "rolex", description: "Timeless luxury and reliability." },
    { id: "brand_cartier", name: "Cartier", slug: "cartier", description: "Exquisite jewelry and timepieces." }
  ];

  for (const brand of brands) {
    await setDoc(doc(db, "brands", brand.id), brand);
  }

  // Categories
  const categories = [
    { id: "cat_watches", nameDe: "Uhren", nameEn: "Watches", slug: "watches" },
    { id: "cat_jewelry", nameDe: "Schmuck", nameEn: "Jewelry", slug: "jewelry" },
    { id: "cat_diamonds", nameDe: "Diamanten", nameEn: "Diamonds", slug: "diamonds" }
  ];

  for (const cat of categories) {
    await setDoc(doc(db, "categories", cat.id), cat);
  }

  // Sample Product
  const product = {
    name: "Nautilus 5711/1A",
    slug: "patek-philippe-nautilus-5711-1a",
    sku: "PP-5711-1A-010",
    brandId: "brand_patek",
    categoryId: "cat_watches",
    price: 158400,
    currency: "EUR",
    status: "ACTIVE",
    condition: "EXCELLENT",
    images: ["https://images.unsplash.com/photo-1547996160-81dfa63595aa"],
    watchDetails: {
      reference: "5711/1A-010",
      year: "2014",
      caseMaterial: "Steel",
      diameter: "40mm",
      movement: "Automatic",
      dial: "Blue Gradient",
      box: true,
      papers: true
    },
    descriptionDe: "Eine Ikone der Haute Horlogerie. Die Nautilus 5711/1A in Stahl mit blauem Zifferblatt ist eines der begehrtesten Sammlerstücke der Welt.",
    createdAt: Timestamp.now()
  };

  const productRef = doc(collection(db, "products"));
  await setDoc(productRef, product);

  // Initialize Inventory for the product
  await setDoc(doc(collection(db, "inventory")), {
    productId: productRef.id,
    onHand: 1,
    reserved: 0,
    available: 1,
    lastUpdated: Timestamp.now()
  });

  // Sample Customer
  await setDoc(doc(collection(db, "customers")), {
    firstName: "Max",
    lastName: "Mustermann",
    email: "max@example.com",
    phone: "+49 123 456789",
    status: "ACTIVE",
    tags: ["VIP", "Watch Collector"],
    notes: "Bevorzugt Patek Philippe und Rolex.",
    createdAt: Timestamp.now()
  });

  console.log("Firestore seeding completed.");
};

export default seedData;
