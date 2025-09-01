
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
let firebaseInitializationError: string | null = null;

// Validate the config object
const missingKeys = Object.entries(firebaseConfig)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
    firebaseInitializationError = `CRITICAL FIREBASE CONFIG ERROR: The following required environment variables are missing: ${missingKeys.join(', ')}. Please check your .env.local file or hosting environment variables. Remember to restart your dev server after making changes.`;
    console.error(firebaseInitializationError);
} else {
    try {
        if (!getApps().length) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApp();
        }

        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);

    } catch (error: any) {
        firebaseInitializationError = `Firebase initialization failed: ${error.message}. This can happen if the config values are incorrect (e.g., a typo in the Project ID). Please double-check all NEXT_PUBLIC_FIREBASE_ environment variables.`;
        console.error(firebaseInitializationError, error);
        // Ensure services are undefined on error
        app = undefined;
        auth = undefined;
        db = undefined;
        storage = undefined;
    }
}


export { app, auth, db, storage, firebaseInitializationError };
