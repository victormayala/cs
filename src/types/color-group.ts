import type { ProductView } from '@/types/product-types';

export interface ColorGroupOptions {
  selectedVariationIds: string[];
  views?: ProductView[];
}

export interface ColorGroupOptionsForCustomizer extends ColorGroupOptions {}