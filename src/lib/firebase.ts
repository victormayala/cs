
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app;
let auth: any;
let db: any; 
let storage: any;

if (!firebaseConfig.apiKey) {
  console.error(
    'CRITICAL FIREBASE CONFIG ERROR: Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is MISSING or NOT ACCESSIBLE in the environment. Firebase will NOT initialize correctly. Please check your .env.local file (and ensure you restart your dev server) or your hosting environment variables. The key must be prefixed with NEXT_PUBLIC_ for client-side Next.js access.'
  );
  app = undefined;
  auth = undefined;
  db = undefined;
  storage = undefined;
} else {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (error: any) {
      console.error(
        `Firebase initialization error during initializeApp: ${error.message}. This can occur if Firebase configuration values (other than API key, which was present) are incorrect or if the project setup is incomplete for this app. Double-check all NEXT_PUBLIC_FIREBASE_ environment variables.`
      );
      app = undefined;
      auth = undefined;
      db = undefined;
      storage = undefined;
    }
  } else {
    app = getApp();
  }

  if (app) {
    try {
      auth = getAuth(app);
    } catch (error: any) {
      console.error(
        `Firebase getAuth() error: ${error.message}. This often follows an 'auth/invalid-api-key' during initializeApp if the API key in your environment variables (though present) is incorrect, or if other config values are problematic.`
      );
      auth = undefined;
    }
    try {
      db = getFirestore(app);
    } catch (error: any) {
      console.error(`Firebase getFirestore() error: ${error.message}.`);
      db = undefined;
    }
    try {
      storage = getStorage(app);
    } catch (error: any) {
      console.error(`Firebase getStorage() error: ${error.message}.`);
      storage = undefined;
    }
  } else {
    auth = undefined;
    db = undefined;
    storage = undefined;
    if (firebaseConfig.apiKey) {
        console.error("Firebase app object is undefined after initialization attempt, even though API key was present. Cannot initialize auth, db, or storage. Check for earlier Firebase initialization errors.");
    }
  }
}

export { app, auth, db, storage };
