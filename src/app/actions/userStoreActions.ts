'use server';

import { db } from '@/lib/firebase';
import { doc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import type { FieldValue } from 'firebase/firestore';
import { headers } from 'next/headers';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase'; // Assuming app is exported from firebase.ts

/**
 * Represents the configuration for a user-generated e-commerce store.
 * This data will be stored in Firestore and used to generate/deploy the store.
 */
export interface UserStoreConfig {
  id: string; // Corresponds to the user's UID
  userId: string; // Ensure userId is part of the data
  storeName: string;
  layout: 'casual' | 'corporate' | 'marketing';
  
  branding: {
    logoUrl?: string;
    primaryColorHex: string;
    secondaryColorHex: string;
  };
  
  // Deployment status and details
  deployment: {
    status: 'uninitialized' | 'pending' | 'active' | 'error';
    deployedUrl?: string;
    lastDeployedAt?: FieldValue;
  };
  
  // Timestamps
  createdAt: FieldValue;
  lastSaved: FieldValue;
}


interface SaveStoreConfigInput {
    // userId is removed from input, it will be derived from auth state on the server
    storeName: string;
    primaryColorHex: string;
    secondaryColorHex: string;
    layout: 'casual' | 'corporate' | 'marketing';
    logoUrl?: string;
}

interface SaveStoreConfigResponse {
    success: boolean;
    storeId?: string;
    error?: string;
}

// NOTE: This function can't be fully tested in a simple Node environment
// as it relies on Next.js server-side features (headers()) and Firebase Admin SDK
// which is typically initialized differently on a server.
async function getUserIdFromServerSession(): Promise<string | null> {
    // This is a placeholder for how you might get the UID on a server.
    // In a real Next.js app with Firebase Auth, you'd likely use a library
    // like 'next-firebase-auth' or handle session cookies manually.
    // For this environment, we'll try a simplified approach.
    // This is a conceptual implementation.
    try {
        const authHeader = headers().get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const idToken = authHeader.split('Bearer ')[1];
            // In a real backend, you'd use Firebase Admin SDK to verify this token
            // admin.auth().verifyIdToken(idToken) -> { uid }
            // For now, we'll just simulate a lookup or assume a mock mechanism.
            // This part is the most likely to differ from a real implementation.
            console.warn("Using mock user ID from a conceptual server session function.");
            return "mock-server-uid"; // Placeholder
        }
        
        // A more direct approach if the client could securely set a header
        const userIdFromHeader = headers().get('X-User-ID');
        if (userIdFromHeader) {
            return userIdFromHeader;
        }

        return null;
    } catch (error) {
        console.error("Error getting user ID from server session:", error);
        return null;
    }
}


export async function saveUserStoreConfig(input: SaveStoreConfigInput): Promise<SaveStoreConfigResponse> {
    const { storeName, layout, primaryColorHex, secondaryColorHex, logoUrl } = input;

    // This is a simplified stand-in for getting the user from a session
    // In a real app, this would be more robust (e.g., using next-auth or similar)
    const userId = headers().get('X-User-ID');

    if (!userId) {
        return { success: false, error: "Authentication failed: User ID could not be determined on the server." };
    }
    
    if (!storeName || storeName.trim().length < 3) {
        return { success: false, error: 'Store name must be at least 3 characters long.' };
    }
     if (!db) {
      return { success: false, error: "Database service is not available on the server." };
    }

    const storeRef = doc(db, 'userStores', userId);

    const newStoreData: Omit<UserStoreConfig, 'createdAt'> & { lastSaved: FieldValue; createdAt?: FieldValue } = {
        id: userId, // Set the document ID to be the user's ID
        userId: userId, // Also store the userId inside the document
        storeName: storeName,
        layout: layout,
        branding: {
            primaryColorHex: primaryColorHex,
            secondaryColorHex: secondaryColorHex,
            logoUrl: logoUrl,
        },
        deployment: {
            status: 'uninitialized',
        },
        lastSaved: serverTimestamp(),
    };

    try {
        const docSnap = await getDoc(storeRef);
        if (!docSnap.exists()) {
            newStoreData.createdAt = serverTimestamp();
        }
        
        await setDoc(storeRef, newStoreData, { merge: true });
        
        return { success: true, storeId: userId };
    } catch (error: any) {
        console.error(`Error saving store config for user ${userId}:`, error);
        return { success: false, error: `Failed to save store configuration: ${error.message}` };
    }
}
