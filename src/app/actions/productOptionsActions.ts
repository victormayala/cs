

'use server';

// This file defines shared types for product customization options.

// Note: The actual Firestore save/load functions are in client components
// to correctly use the client's Firebase auth context for security rules.

// Size attribute no longer has a price modifier
export interface SizeAttribute {
  id: string;
  name: string;
}

interface BoundaryBox {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProductView {
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

export interface ColorGroupOptions {
  selectedVariationIds: string[];
  // NEW: Allow overriding views for this specific color group
  views?: ProductView[]; 
}

// New interface for native product attributes
export interface ProductAttributeOptions {
  colors: { name: string; hex: string }[];
  sizes: SizeAttribute[];
}

export interface NativeProductVariation {
  id: string; // e.g., "color-Red-size-M"
  attributes: Record<string, string>; // e.g., { "Color": "Red", "Size": "M" }
  price: number;
  salePrice?: number | null; // Make it optional and allow null
}

export interface ShippingAttributes {
  weight: number; // in lbs
  length: number; // in inches
  width: number;  // in inches
  height: number; // in inches
}

export interface ProductOptionsFirestoreData {
  id: string;
  name: string;
  description: string;
  price: number;
  salePrice?: number | null; // Make it optional and allow null
  type: 'simple' | 'variable' | 'grouped' | 'external';
  // defaultViews is now deprecated. Views are managed per variation.
  defaultViews?: ProductView[];
  optionsByColor: Record<string, ColorGroupOptions>;
  groupingAttributeName: string | null;
  nativeAttributes?: ProductAttributeOptions; // Made optional for backwards compatibility
  nativeVariations?: NativeProductVariation[];
  shipping?: ShippingAttributes; // Optional shipping attributes
  allowCustomization?: boolean;
  lastSaved?: any; // Firestore server timestamp
  createdAt?: any; // Firestore server timestamp
}

// These types are also used on the client, so we export them.
export type { BoundaryBox };
