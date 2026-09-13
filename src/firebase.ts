import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore, 
  getFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const customDatabaseId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

let firestoreDb;

try {
  // Enable persistent local cache with multi-tab manager for offline resilience in clinics
  const firestoreSettings = {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  };

  if (customDatabaseId) {
    firestoreDb = initializeFirestore(app, firestoreSettings, customDatabaseId);
  } else {
    firestoreDb = initializeFirestore(app, firestoreSettings);
  }
} catch (err) {
  console.warn('[Firebase] Firestore initialization with persistent local cache warning, falling back:', err);
  firestoreDb = customDatabaseId ? getFirestore(app, customDatabaseId) : getFirestore(app);
}

export const db = firestoreDb;
export { app };
export default db;
