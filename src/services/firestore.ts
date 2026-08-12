import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  addDoc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Product, UserRole, UserProfile } from "../types";

// Collection References
export const PRODUCTS_COL = collection(db, "products");
export const ORDERS_COL = collection(db, "orders");
export const USERS_COL = collection(db, "users");
export const INVENTORY_COL = collection(db, "inventory");
export const CUSTOMERS_COL = collection(db, "customers");
export const BRANDS_COL = collection(db, "brands");
export const CATEGORIES_COL = collection(db, "categories");

// Types for CRM and Inventory
export interface Customer {
  id?: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: "LEAD" | "ACTIVE" | "INACTIVE";
  tags: string[];
  notes?: string;
  createdAt: Timestamp;
}

export interface InventoryItem {
  productId: string;
  onHand: number;
  reserved: number;
  available: number;
  lastUpdated: Timestamp;
}

export interface Order {
  id?: string;
  orderNumber: string;
  customerId: string;
  status: "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  totalAmount: number;
  currency: string;
  items: any[];
  createdAt: Timestamp;
}

// CRM Services
export const crmService = {
  async getCustomers() {
    const snapshot = await getDocs(query(CUSTOMERS_COL, orderBy("createdAt", "desc")));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
  },

  async getCustomerByEmail(email: string) {
    const q = query(CUSTOMERS_COL, where("email", "==", email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Customer;
  },

  async addCustomer(customer: Omit<Customer, "id" | "createdAt">) {
    const newCustomer = {
      ...customer,
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(CUSTOMERS_COL, newCustomer);
    return { id: docRef.id, ...newCustomer };
  },

  async updateCustomerStatus(id: string, status: Customer["status"]) {
    const docRef = doc(db, "customers", id);
    await updateDoc(docRef, { status });
  }
};

// Inventory Services
export const inventoryService = {
  async getStock(productId: string) {
    const q = query(INVENTORY_COL, where("productId", "==", productId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as InventoryItem;
  },

  async updateStock(productId: string, onHand: number) {
    const q = query(INVENTORY_COL, where("productId", "==", productId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      await addDoc(INVENTORY_COL, {
        productId,
        onHand,
        reserved: 0,
        available: onHand,
        lastUpdated: Timestamp.now()
      });
    } else {
      const docRef = snapshot.docs[0].ref;
      const data = snapshot.docs[0].data() as InventoryItem;
      await updateDoc(docRef, {
        onHand,
        available: onHand - data.reserved,
        lastUpdated: Timestamp.now()
      });
    }
  },

  async reserveStock(productId: string, quantity: number) {
    const q = query(INVENTORY_COL, where("productId", "==", productId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) throw new Error("Product not found in inventory");
    
    const docRef = snapshot.docs[0].ref;
    const data = snapshot.docs[0].data() as InventoryItem;
    
    if (data.available < quantity) throw new Error("Insufficient stock");
    
    await updateDoc(docRef, {
      reserved: data.reserved + quantity,
      available: data.available - quantity,
      lastUpdated: Timestamp.now()
    });
  }
};

// Product Services
export const productService = {
  async getProducts() {
    const snapshot = await getDocs(PRODUCTS_COL);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
  },

  async getProductBySlug(slug: string) {
    const q = query(PRODUCTS_COL, where("slug", "==", slug));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
  }
};
