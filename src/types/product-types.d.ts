import type { ProductView } from './customization';
import type { CustomizationTechnique } from '@/app/actions/productActions';

export interface BaseProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  source: 'customizer-studio' | 'woocommerce' | 'shopify';
}

// Extended type with additional properties used in the customizer
export interface ProductForCustomizer extends BaseProduct {
  views: ProductView[];
  type: 'simple' | 'variable' | 'grouped' | 'external';  // Match WooCommerce types
  basePrice: number;  // Required for price calculations
  allowCustomization: boolean;
  customizationTechniques?: CustomizationTechnique[];
  meta: Record<string, any>;  // Required for storing metadata
  nativeVariations?: Array<{
    id: string;
    attributes: Record<string, string>;
    price: number;
  }>;
}

export interface ColorGroupOptionsForCustomizer {
  price: number;
  views: ProductView[];
}