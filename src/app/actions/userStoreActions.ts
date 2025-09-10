
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

interface HomePageContent {
  hero: {
    headline: string;
    subheading: string;
    primaryButtonText: string;
    primaryButtonLink?: string;
    secondaryButtonText: string;
    secondaryButtonLink?: string;
    backgroundImageUrl?: string;
  };
  features: {
    enabled: boolean;
    title: string;
    items: {
      title: string;
      description: string;
    }[];
  };
  shipping: {
    enabled: boolean;
    title: string;
    items: {
      title: string;
      description: string;
    }[];
  };
  testimonials: {
    enabled: boolean;
    title: string;
    items: {
      quote: string;
      author: string;
    }[];
  };
  callToAction: {
    enabled: boolean;
    headline: string;
    subheading: string;
    buttonText: string;
    buttonLink?: string;
  };
}


/**
 * Represents the configuration for a user-generated e-commerce store.
 * This data will be stored in Firestore and used to generate/deploy the store.
 */
export interface UserStoreConfig {
  id: string; // The unique ID of the store document
  userId: string; // The UID of the user who owns this store
  storeName: string;
  layout: 'casual' | 'corporate' | 'marketing';
  
  branding: {
    logoUrl?: string;
    primaryColorHex: string;
    secondaryColorHex: string;
  };
  
  // Deployment status and details
  deployment?: {
    status: 'uninitialized' | 'pending' | 'active' | 'error';
    deployedUrl?: string;
    lastDeployedAt?: FieldValue;
  };
  
  // Volume discount settings
  volumeDiscounts?: {
    enabled: boolean;
    tiers: VolumeDiscountTier[];
  };

  // Shipping settings
  shipping?: {
    localDeliveryEnabled: boolean;
    localDeliveryFee: number;
    localDeliveryText: string;
  };

  // Embroidery settings
  embroidery?: {
    setupFeeEnabled: boolean;
    setupFeeAmount: number;
    setupFeeDescription: string;
  };

  // Added to store which products are part of this store
  productIds?: string[];
  
  // NEW: Editable page content
  pages?: {
    homepage?: Partial<HomePageContent>; // Use the new detailed type
    about?: {
      title?: string;
      body?: string;
    },
    faq?: {
      title?: string;
      introduction?: string;
      questions?: { question: string; answer: string; }[];
    },
    contact?: {
      title?: string;
      email?: string;
      phone?: string;
      address?: string;
    },
    terms?: {
      title?: string;
      body?: string;
    },
    privacy?: {
      title?: string;
      body?: string;
    }
  }

  // Timestamps
  createdAt: FieldValue;
  lastSaved: FieldValue;
}

// The saveUserStoreConfig function has been moved to the client-side component
// src/app/dashboard/store/create/page.tsx to resolve authentication permission issues.
