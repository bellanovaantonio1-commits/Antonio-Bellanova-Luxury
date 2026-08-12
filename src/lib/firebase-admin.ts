import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getStorage as getAdminStorage } from "firebase-admin/storage";
import { getFirestore as getAdminFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

/**
 * AI Studio Firebase Admin Initialization
 */

// Main Admin App: Used for Auth. This MUST match the client project to verify tokens.
let adminAuthApp: any;
try {
  const authConfig: any = {
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket
  };
  
  if (!getApps().length) {
    adminAuthApp = initializeApp(authConfig);
  } else {
    adminAuthApp = getApp();
  }
} catch (e) {
  console.error("Firebase Admin Auth App initialization failed:", e);
  adminAuthApp = null;
}

export const adminAuth = adminAuthApp ? getAdminAuth(adminAuthApp) : null;

// Firestore/Storage Admin: Initialization.
let adminDb: any = null;
let adminStorage: any = null;

try {
  const dbId = firebaseConfig.firestoreDatabaseId;
  const isShadow = dbId && dbId.startsWith('ai-studio-');
  
  if (isShadow) {
    // For shadow projects, the database ID is actually the Project ID.
    // We initialize a separate app for this.
    const appName = "firestore-admin-app";
    let adminDbApp: any;
    try {
      adminDbApp = getApp(appName);
    } catch {
      adminDbApp = initializeApp({
        projectId: dbId,
        storageBucket: `${dbId}.firebasestorage.app`
      }, appName);
    }
    adminDb = getAdminFirestore(adminDbApp);
    adminStorage = getAdminStorage(adminDbApp);
    console.log(`Firestore Admin initialized with shadow project ID: ${dbId}`);
  } else {
    // Standard case: database is within the same project
    adminDb = getAdminFirestore(adminAuthApp, dbId || undefined);
    adminStorage = getAdminStorage(adminAuthApp);
    console.log(`Firestore Admin initialized with project: ${firebaseConfig.projectId}${dbId ? `, database: ${dbId}` : ""}`);
  }
} catch (e: any) {
  console.error("Firestore Admin initialization failed:", e.message);
}

export { adminDb, adminStorage, Timestamp, FieldValue };

