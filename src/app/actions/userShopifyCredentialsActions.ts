
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export interface ShopifyCredentials {
  shop: string;
  accessToken: string;
}

export interface UserShopifyCredentials extends ShopifyCredentials {
  lastSaved?: any; // Firestore server timestamp
  createdAt?: any;
}

export async function saveShopifyCredentials(
  userId: string,
  shop: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !shop || !accessToken) {
    return { success: false, error: 'User ID, shop, and access token are required.' };
  }
  if (!db) {
    console.error("Firestore not initialized. Check firebase.ts");
    return { success: false, error: 'Database service is not available.' };
  }

  try {
    const docRef = doc(db, 'userShopifyCredentials', userId);
    const docSnap = await getDoc(docRef);

    const dataToSave: Partial<UserShopifyCredentials> = {
      shop,
      accessToken,
      lastSaved: serverTimestamp(),
    };

    if (!docSnap.exists()) {
      dataToSave.createdAt = serverTimestamp();
    }

    await setDoc(docRef, dataToSave, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error('Error saving Shopify credentials to Firestore:', error);
    return { success: false, error: `Failed to save credentials: ${error.message}` };
  }
}

export async function loadShopifyCredentials(
  userId: string
): Promise<{ credentials?: UserShopifyCredentials; error?: string }> {
  if (!userId) {
    return { error: 'User ID is required.' };
  }
  if (!db) {
    console.error("Firestore not initialized. Check firebase.ts");
    return { error: 'Database service is not available.' };
  }

  try {
    const docRef = doc(db, 'userShopifyCredentials', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { credentials: docSnap.data() as UserShopifyCredentials };
    }
    return { credentials: undefined };
  } catch (error: any) {
    console.error('Error loading Shopify credentials from Firestore:', error);
    return { error: `Failed to load credentials: ${error.message}` };
  }
}

export async function deleteShopifyCredentials(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  if (!db) {
    console.error("Firestore not initialized. Check firebase.ts");
    return { success: false, error: 'Database service is not available.' };
  }

  try {
    const docRef = doc(db, 'userShopifyCredentials', userId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error: any)
  {
    console.error('Error deleting Shopify credentials from Firestore:', error);
    return { success: false, error: `Failed to delete credentials: ${error.message}` };
  }
}
