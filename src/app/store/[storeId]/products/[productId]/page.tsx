'use client';

import CustomizerPage from '@/app/customizer/page';

// This is a wrapper component.
// The CustomizerPage is a client component that reads searchParams.
// By having this wrapper, we can use a dynamic route like /store/[storeId]/products/[productId]
// and the CustomizerPage will automatically pick up the necessary `productId` and `configUserId`
// from the URL when it renders.

export default function StoreProductDetailPage() {
  // The actual logic is inside the CustomizerPage component, which will be rendered here.
  // It uses `useSearchParams` to get the product ID and other parameters.
  // We just need to make sure we pass the `configUserId` (which is `storeId` here) via the URL.
  // The CustomizerPage already expects `productId` and `configUserId` in its URL params.
  return <CustomizerPage />;
}