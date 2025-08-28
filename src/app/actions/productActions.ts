
'use server';

import { db } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { headers } from 'next/headers';
import { app } from '@/lib/firebase';

// This is the data model for a native product stored in Firestore
export interface NativeProduct {
  id: string; // The document ID
  userId: string; // The UID of the user who owns this product
  name: string;
  description: string;
  // We won't store full options here, just the base product info.
  // The customization options will be stored in the 'userProductOptions' collection,
  // same as for Shopify/WooCommerce products, using the product's ID as the key.
  createdAt: any; // Firestore server timestamp
  lastModified: any; // Firestore server timestamp
}

interface CreateProductInput {
    name: string;
}

interface CreateProductResponse {
    success: boolean;
    productId?: string;
    error?: string;
}

export async function createProduct(input: CreateProductInput): Promise<CreateProductResponse> {
  const headersList = headers();
  // TODO: This is a placeholder for server-side auth.
  // In a real app, you'd get the user from the session/token.
  // For now, we'll assume the client passes the UID, or we extract it from a custom header.
  // This is NOT secure for production without proper token validation.
  const userId = headersList.get('x-user-id');

  if (!userId) {
      return { success: false, error: "Authentication required. User ID not found." };
  }
  
  if (!input.name || input.name.trim().length === 0) {
    return { success: false, error: 'Product name is required.' };
  }

  if (!db) {
      return { success: false, error: "Database service is not available on the server." };
  }

  const productId = `cs_${crypto.randomUUID()}`;
  const productRef = doc(db, `users/${userId}/products`, productId);

  const newProductData: Omit<NativeProduct, 'id'> = {
    userId,
    name: input.name,
    description: "", // Can be edited later on the options page
    createdAt: serverTimestamp(),
    lastModified: serverTimestamp(),
  };

  try {
    await setDoc(productRef, newProductData);
    
    // Also create a default options document so the options page works immediately
    const optionsRef = doc(db, 'userProductOptions', userId, 'products', productId);
    await setDoc(optionsRef, {
        id: productId,
        name: input.name,
        description: "",
        price: 0,
        type: 'simple', // Native products are simple by default
        defaultViews: [], // User will add these in the options screen
        optionsByColor: {},
        groupingAttributeName: null,
        allowCustomization: true,
        createdAt: serverTimestamp(),
        lastSaved: serverTimestamp(),
    });

    return { success: true, productId: productId };
  } catch (error: any) {
    console.error(`Error creating product for user ${userId}:`, error);
    return { success: false, error: `Failed to create product in database: ${error.message}` };
  }
}

    