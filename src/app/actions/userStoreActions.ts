
'use server';

import { db } from '@/lib/firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { FieldValue } from 'firebase/firestore';
import { headers } from 'next/headers';

/**
 * Represents the configuration for a user-generated e-commerce store.
 * This data will be stored in Firestore and used to generate/deploy the store.
 */
export interface UserStoreConfig {
  id: string; // Corresponds to the user's UID
  storeName: string;
  
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
    storeName: string;
    primaryColorHex: string;
    secondaryColorHex: string;
    logoUrl?: string;
}

interface SaveStoreConfigResponse {
    success: boolean;
    storeId?: string;
    error?: string;
}

export async function saveUserStoreConfig(input: SaveStoreConfigInput): Promise<SaveStoreConfigResponse> {
    const headersList = headers();
    // This is NOT secure for production without proper token validation.
    // In a real app, this should be derived from a verified session/token on the server.
    const userId = headersList.get('x-user-id');

    if (!userId) {
        return { success: false, error: "Authentication required. User ID not found." };
    }
    
    if (!input.storeName || input.storeName.trim().length < 3) {
        return { success: false, error: 'Store name must be at least 3 characters long.' };
    }
     if (!db) {
      return { success: false, error: "Database service is not available on the server." };
    }

    const storeRef = doc(db, 'userStores', userId);

    const newStoreData: Omit<UserStoreConfig, 'id' | 'createdAt'> & { lastSaved: FieldValue; createdAt?: FieldValue } = {
        storeName: input.storeName,
        branding: {
            primaryColorHex: input.primaryColorHex,
            secondaryColorHex: input.secondaryColorHex,
            logoUrl: input.logoUrl,
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
