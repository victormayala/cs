
export interface ShopifyImage {
  url: string;
  altText: string | null;
}

export interface ShopifyProduct {
  id: string; // e.g., "gid://shopify/Product/12345"
  title: string;
  handle: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
  updatedAt: string; // ISO 8601 date string
  featuredImage: ShopifyImage | null;
  // Fields for details page
  description?: string;
  priceRangeV2?: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    }
  }
}
