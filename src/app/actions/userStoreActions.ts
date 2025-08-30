
'use server';

// This server action file is now deprecated for saving store config, as the operation has been
// moved to the client-side to ensure proper Firebase Authentication context.
// This file is kept for the UserStoreConfig type definition which is used across the app,
// and can be used for other server-side store logic in the future.

import type { FieldValue } from 'firebase/firestore';

/**
 * Represents a single tier for volume discounts.
 */
export interface VolumeDiscountTier {
  quantity: number;
  percentage: number;
}

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
  
  // Volume discount settings
  volumeDiscounts?: {
    enabled: boolean;
    tiers: VolumeDiscountTier[];
  };

  // Timestamps
  createdAt: FieldValue;
  lastSaved: FieldValue;
}

// The saveUserStoreConfig function has been moved to the client-side component
// src/app/dashboard/store/create/page.tsx to resolve authentication permission issues.
