
'use server';

// This file defines shared types for product customization options.

// Note: The actual Firestore save/load functions are in client components
// to correctly use the client's Firebase auth context for security rules.

interface BoundaryBox {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ProductView {
  id: string;
  name: string;
  imageUrl: string;
  aiHint?: string;
  boundaryBoxes: BoundaryBox[];
  price?: number;
}

interface ColorGroupOptions {
  selectedVariationIds: string[];
  variantViewImages: Record<string, { imageUrl: string; aiHint?: string }>;
}

// New interface for native product attributes
export interface ProductAttributeOptions {
  colors: string[];
  sizes: string[];
}

export interface ProductOptionsFirestoreData {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'simple' | 'variable' | 'grouped' | 'external';
  defaultViews: ProductView[];
  optionsByColor: Record<string, ColorGroupOptions>;
  groupingAttributeName: string | null;
  nativeAttributes?: ProductAttributeOptions; // New field for native products
  allowCustomization?: boolean;
  lastSaved?: any; // Firestore server timestamp
  createdAt?: any; // Firestore server timestamp
}

// These types are also used on the client, so we export them.
export type { BoundaryBox, ProductView, ColorGroupOptions };
