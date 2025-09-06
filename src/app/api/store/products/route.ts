
'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc, documentId } from 'firebase/firestore';
import type { PublicProduct } from '@/types/product';
import type { NativeProduct } from '@/app/actions/productActions';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';


/**
 * Public API route to fetch all native products for a given store.
 * This is intended to be called by the generated public storefront.
 * 
 * @param request NextRequest object, expecting `storeId` in search params.
 * @returns A JSON response with an array of public-facing product data or an error.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('storeId');

  if (!storeId) {
    return NextResponse.json({ error: 'Store ID is required.' }, { status: 400 });
  }

  if (!db) {
    console.error("/api/store/products: Firestore not initialized.");
    return NextResponse.json({ error: 'Database service is not available.' }, { status: 500 });
  }

  try {
    const storeRef = doc(db, 'userStores', storeId);
    const storeSnap = await getDoc(storeRef);

    if (!storeSnap.exists()) {
      return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
    }

    const storeData = storeSnap.data() as UserStoreConfig;
    const { productIds, userId: configUserId } = storeData;

    if (!productIds || productIds.length === 0) {
      return NextResponse.json({ products: [] });
    }

    // Firestore `in` queries are limited to 30 elements. If more are needed, batching is required.
    if (productIds.length > 30) {
        console.warn(`Warning: Store ${storeId} has ${productIds.length} products, which is more than the query limit of 30. Truncating list.`);
        productIds.splice(30);
    }
    
    const productsRef = collection(db, `users/${configUserId}/products`);
    const q = query(productsRef, where(documentId(), 'in', productIds));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json({ products: [] });
    }

    const productPromises = querySnapshot.docs.map(async (productDoc) => {
      const productData = productDoc.data() as NativeProduct;
      const productId = productDoc.id;

      let primaryImageUrl = `https://placehold.co/400x400.png?text=${encodeURIComponent(productData.name)}`;
      let price = 0;

      try {
        const optionsRef = doc(db, 'userProductOptions', configUserId, 'products', productId);
        const optionsSnap = await getDoc(optionsRef);

        if (optionsSnap.exists()) {
          const optionsData = optionsSnap.data();
          const firstViewImage = optionsData.defaultViews?.[0]?.imageUrl;
          if (firstViewImage && typeof firstViewImage === 'string' && firstViewImage.trim() !== '' && !firstViewImage.includes('placehold.co')) {
            primaryImageUrl = firstViewImage;
          }
          price = optionsData.price || 0;
        }
      } catch (optionsError) {
        console.warn(`Could not fetch options for product ${productId}:`, optionsError);
      }

      const publicProduct: PublicProduct = {
        id: productId,
        name: productData.name,
        description: productData.description,
        price: price,
        imageUrl: primaryImageUrl,
        productUrl: `/store/${storeId}/products/${productId}`, // Use storeId
      };
      return publicProduct;
    });

    const products = await Promise.all(productPromises);
    
    // Sort products based on the order in the productIds array from the store config
    const sortedProducts = products.sort((a, b) => {
        return productIds.indexOf(a.id) - productIds.indexOf(b.id);
    });

    return NextResponse.json({ products: sortedProducts });

  } catch (error: any) {
    console.error(`Error fetching products for store ${storeId}:`, error);
    return NextResponse.json({ error: `Failed to fetch products: ${error.message}` }, { status: 500 });
  }
}
