import type { CustomizationTechnique } from '@/app/actions/productActions';
import type { NativeProductVariation } from '@/app/actions/productOptionsActions';
import type { BoundaryBox } from '@/app/actions/productOptionsActions';

export interface ProductView {
  id: string;
  name: string;
  imageUrl: string;
  aiHint?: string;
  price?: number;
  embroideryAdditionalFee?: number;
  printAdditionalFee?: number;
  boundaryBoxes: BoundaryBox[];
}

export interface ProductForCustomizer {
  id: string;
  name: string;
  description: string;
  price: number;
  basePrice: number;
  views: ProductView[];
  source: 'woocommerce' | 'shopify' | 'customizer-studio';
  type: 'simple' | 'variable' | 'grouped' | 'external' | 'shopify' | 'customizer-studio' | undefined;
  allowCustomization?: boolean;
  customizationTechniques?: CustomizationTechnique[];
  nativeVariations?: NativeProductVariation[];
  nativeAttributes?: { name: string, options: string[] }[];
  meta?: {
    proxyUsed?: boolean;
    configUserIdUsed?: string | null;
    source: 'woocommerce' | 'shopify' | 'customizer-studio';
  };
}