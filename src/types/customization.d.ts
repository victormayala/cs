// Type definitions for product views and variations
export interface ProductView {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  aiHint?: string;
  embroideryAdditionalFee: number;
  printAdditionalFee: number;
  boundaryBoxes: Array<BoundaryBox>;
}

export interface BoundaryBox {
  id: string;
  name: string;
  x: number;      // Position from left as a percentage (0-100)
  y: number;      // Position from top as a percentage (0-100)
  width: number;  // Width as a percentage (0-100)
  height: number; // Height as a percentage (0-100)
}

export interface ProductVariation {
  id: string;
  attributes: Record<string, string>;
}

export interface WCVariationImage {
  id: number;
  src: string;
  alt?: string;
}

export interface WooCommerceVariation {
  id: number;
  attributes: Array<{
    name: string;
    option: string;
  }>;
  image: WCVariationImage | null;
  price?: string;
}

export interface CustomizedProduct extends PublicProduct {
  views?: ProductView[];
  nativeVariations?: ProductVariation[];
}