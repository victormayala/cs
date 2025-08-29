'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { PublicProduct } from '@/types/product';
import type { NativeProduct } from '@/app/actions/productActions';
import type { ProductOptionsFirestoreData } from '@/app/actions/productOptionsActions';

// A more detailed version for the PDP
interface PublicProductDetail extends PublicProduct {
    views: {
        id: string;
        name: string;
        imageUrl: string;
    }[];
}

export async function GET(request: Request, { params }: { params: { productId: string } }) {
  const { searchParams } = new URL(request.url);
  const configUserId = searchParams.get('configUserId');
  const { productId } = params;

  if (!configUserId || !productId) {
    return NextResponse.json({ error: 'Config User ID and Product ID are required.' }, { status: 400 });
  }

  if (!db) {
    console.error("/api/store/products/[productId]: Firestore not initialized.");
    return NextResponse.json({ error: 'Database service is not available.' }, { status: 500 });
  }

  try {
    const productRef = doc(db, `users/${configUserId}/products`, productId);
    const optionsRef = doc(db, 'userProductOptions', configUserId, 'products', productId);

    const [productSnap, optionsSnap] = await Promise.all([getDoc(productRef), getDoc(optionsRef)]);

    if (!productSnap.exists()) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const productData = productSnap.data() as NativeProduct;
    const optionsData = optionsSnap.exists() ? optionsSnap.data() as ProductOptionsFirestoreData : null;

    // Use a robust default image
    const defaultPlaceholderImage = `https://placehold.co/600x400.png?text=${encodeURIComponent(productData.name)}`;
    
    // Construct the views, ensuring they are valid
    const views = optionsData?.defaultViews?.map(view => ({
      id: view.id,
      name: view.name,
      // Fallback for each view's image
      imageUrl: view.imageUrl && !view.imageUrl.includes('placehold.co') ? view.imageUrl : `${defaultPlaceholderImage}&txtsize=30&text=${encodeURIComponent(view.name)}`,
    })) || [{ id: 'default_view', name: 'Front', imageUrl: defaultPlaceholderImage }];
    
    // Determine the primary image URL for the main product display
    const primaryImageUrl = views[0]?.imageUrl || defaultPlaceholderImage;

    const publicProductDetail: PublicProductDetail = {
      id: productId,
      name: productData.name,
      description: productData.description,
      price: optionsData?.price || 0,
      imageUrl: primaryImageUrl,
      productUrl: `/store/${configUserId}/products/${productId}`,
      views: views,
    };

    return NextResponse.json({ product: publicProductDetail });

  } catch (error: any) {
    console.error(`Error fetching product ${productId} for user ${configUserId}:`, error);
    return NextResponse.json({ error: `Failed to fetch product details: ${error.message}` }, { status: 500 });
  }
}
