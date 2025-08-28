'use server';

// This file defines the data structures and server actions
// related to the "Build Your Own Store" feature.

import type { FieldValue } from 'firebase/firestore';

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
