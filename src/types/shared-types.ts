import type { BoundaryBox } from '@/app/actions/productOptionsActions';

export interface ProductView {
  id: string;
  name: string;
  imageUrl: string;
  aiHint?: string;
  price: number;
  embroideryAdditionalFee: number;
  printAdditionalFee: number;
  boundaryBoxes: BoundaryBox[];
}

export interface ColorGroupOptions {
  selectedVariationIds: string[];
  views?: ProductView[];
}

export interface ColorGroupOptionsForCustomizer extends ColorGroupOptions {
  _brand?: 'ColorGroupOptionsForCustomizer';
}