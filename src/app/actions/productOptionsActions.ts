
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
  price: number; // Price for customizing this specific view
  boundaryBoxes: BoundaryBox[];
}

// New structure for variation-specific images
export interface VariationImage {
  imageUrl: string;
  aiHint?: string;
}

interface ColorGroupOptions {
  selectedVariationIds: string[];
  // Replaced variantViewImages with a simple array for a gallery
  variantImages: VariationImage[];
}

// New interface for native product attributes
export interface ProductAttributeOptions {
  colors: { name: string; hex: string }[];
  sizes: string[];
}

export interface NativeProductVariation {
  id: string; // e.g., "color-Red-size-M"
  attributes: Record<string, string>; // e.g., { "Color": "Red", "Size": "M" }
  price: number;
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
  nativeAttributes?: ProductAttributeOptions; // Made optional for backwards compatibility
  nativeVariations?: NativeProductVariation[];
  allowCustomization?: boolean;
  lastSaved?: any; // Firestore server timestamp
  createdAt?: any; // Firestore server timestamp
}

// These types are also used on the client, so we export them.
export type { BoundaryBox, ProductView, ColorGroupOptions };
