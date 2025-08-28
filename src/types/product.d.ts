/**
 * Represents the publicly-safe data structure for a product.
 * This is the data that will be sent to the generated storefront.
 */
export interface PublicProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  productUrl: string; // Link to the PDP
}
