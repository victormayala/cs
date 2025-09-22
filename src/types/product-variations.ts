import type { ProductVariation } from './customization';
import type { NativeProductVariation } from '@/app/actions/productOptionsActions';

export type SelectedVariation = ProductVariation | NativeProductVariation | null;