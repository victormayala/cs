
'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import type { PublicProduct } from '@/types/product';
import type { NativeProduct } from '@/app/actions/productActions';

/**
 * Public API route to fetch all native products for a given user (store).
 * This is intended to be called by the generated public storefront.
 * 
 * @param request NextRequest object, expecting `configUserId` in search params.
 * @returns A JSON response with an array of public-facing product data or an error.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const configUserId = searchParams.get('configUserId');

  if (!configUserId) {
    return NextResponse.json({ error: 'Configuration User ID is required.' }, { status: 400 });
  }

  if (!db) {
    console.error("/api/store/products: Firestore not initialized.");
    return NextResponse.json({ error: 'Database service is not available.' }, { status: 500 });
  }

  try {
    const productsRef = collection(db, `users/${configUserId}/products`);
    const q = query(productsRef);
    // Use { cache: 'no-store' } to prevent Next.js from caching the data fetch
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json({ products: [] });
    }

    // We need to fetch the options for each product to get the primary image URL
    const productPromises = querySnapshot.docs.map(async (productDoc) => {
      const productData = productDoc.data() as NativeProduct;
      const productId = productDoc.id;

      let primaryImageUrl = `https://placehold.co/400x400.png?text=${encodeURIComponent(productData.name)}`; // A default placeholder
      let price = 0;

      try {
        const optionsRef = doc(db, 'userProductOptions', configUserId, 'products', productId);
        // Use { cache: 'no-store' } for this fetch as well
        const optionsSnap = await getDoc(optionsRef);

        if (optionsSnap.exists()) {
          const optionsData = optionsSnap.data();
          // Use the image from the first default view as the primary image, with validation
          const firstViewImage = optionsData.defaultViews?.[0]?.imageUrl;
          if (firstViewImage && typeof firstViewImage === 'string' && firstViewImage.trim() !== '' && !firstViewImage.includes('placehold.co')) {
            primaryImageUrl = firstViewImage;
          }
          price = optionsData.price || 0;
        }
      } catch (optionsError) {
        console.warn(`Could not fetch options for product ${productId}:`, optionsError);
        // Continue without options data, using defaults
      }

      const publicProduct: PublicProduct = {
        id: productId,
        name: productData.name,
        description: productData.description,
        price: price,
        imageUrl: primaryImageUrl,
        // The URL to the product detail page (PDP) on the generated store
        productUrl: `/store/${configUserId}/products/${productId}`,
      };
      return publicProduct;
    });

    const products = await Promise.all(productPromises);

    return NextResponse.json({ products });

  } catch (error: any) {
    console.error(`Error fetching products for user ${configUserId}:`, error);
    // In a production environment, you might want a more generic error message
    return NextResponse.json({ error: `Failed to fetch products: ${error.message}` }, { status: 500 });
  }
}
