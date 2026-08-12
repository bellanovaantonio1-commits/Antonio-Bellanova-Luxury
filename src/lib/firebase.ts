import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import firebaseConfigData from "../../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfigData);

const isShadow = firebaseConfigData.firestoreDatabaseId?.startsWith('ai-studio-');

// For Firestore, use a separate app if it's a shadow project ID.
const firestoreApp = isShadow
  ? (getApps().find(a => a.name === "firestore-app") || initializeApp({ ...firebaseConfigData, projectId: firebaseConfigData.firestoreDatabaseId }, "firestore-app"))
  : app;

const dbId = isShadow ? '(default)' : (firebaseConfigData.firestoreDatabaseId || undefined);

// Initialize Firestore
export const db = getFirestore(firestoreApp, dbId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export default app;
