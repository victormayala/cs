
'use server';

// This file is now primarily for exporting types, as all Firestore operations
// that depend on user authentication have been moved to client-side components
// to ensure they run with the user's auth context, resolving permission errors.

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

// The createProduct function has been moved to the client-side component
// src/app/dashboard/products/create/page.tsx to resolve authentication permission issues.
