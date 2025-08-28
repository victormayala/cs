
'use server';

import { db } from '@/lib/firebase';
import { doc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import type { FieldValue } from 'firebase/firestore';
import { headers } from 'next/headers';

/**
 * Represents the configuration for a user-generated e-commerce store.
 * This data will be stored in Firestore and used to generate/deploy the store.
 */
export interface UserStoreConfig {
  id: string; // Corresponds to the user's UID
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
    userId: string;
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

export async function saveUserStoreConfig(input: SaveStoreConfigInput): Promise<SaveStoreConfigResponse> {
    const { userId, storeName, layout, primaryColorHex, secondaryColorHex, logoUrl } = input;

    if (!userId) {
        return { success: false, error: "Authentication required. User ID not found." };
    }
    
    if (!storeName || storeName.trim().length < 3) {
        return { success: false, error: 'Store name must be at least 3 characters long.' };
    }
     if (!db) {
      return { success: false, error: "Database service is not available on the server." };
    }

    const storeRef = doc(db, 'userStores', userId);

    const newStoreData: Omit<UserStoreConfig, 'id' | 'createdAt'> & { lastSaved: FieldValue; createdAt?: FieldValue } = {
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
