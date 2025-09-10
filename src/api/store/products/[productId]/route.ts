

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { PublicProduct } from '@/types/product';
import type { NativeProduct, CustomizationTechnique } from '@/app/actions/productActions';
import type { ProductOptionsFirestoreData, ProductAttributeOptions, VariationImage, NativeProductVariation, ProductView } from '@/app/actions/productOptionsActions';
import type { SizeAttribute } from '@/app/dashboard/products/[productId]/options/page';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import { ProductCategory } from '@/app/dashboard/categories/page';

interface ProductAttributeOptionsForPDP extends Omit<ProductAttributeOptions, 'sizes'> {
  sizes: SizeAttribute[];
}
// A more detailed version for the PDP
interface PublicProductDetail extends PublicProduct {
    salePrice?: number | null; // Allow null to represent no sale price
    views: ProductView[];
    attributes?: ProductAttributeOptionsForPDP;
    variationImages?: Record<string, ProductView[]>; // Key: Color Name
    brand?: string;
    sku?: string;
    category?: string; // This will now hold the category ID
    customizationTechniques?: CustomizationTechnique[];
    nativeVariations?: NativeProductVariation[];
}

export async function GET(request: Request, { params }: { params: { productId: string } }) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('storeId');
  const { productId } = params;

  if (!storeId || !productId) {
    return NextResponse.json({ error: 'Store ID and Product ID are required.' }, { status: 400 });
  }

  if (!db) {
    console.error("/api/store/products/[productId]: Firestore not initialized.");
    return NextResponse.json({ error: 'Database service is not available.' }, { status: 500 });
  }

  try {
    const storeRef = doc(db, 'userStores', storeId);
    const storeSnap = await getDoc(storeRef);

    if (!storeSnap.exists()) {
      return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
    }
    const storeData = storeSnap.data() as UserStoreConfig;
    const configUserId = storeData.userId;

    // Check if the product is actually part of the store
    if (!storeData.productIds?.includes(productId)) {
        return NextResponse.json({ error: 'Product not found in this store.' }, { status: 404 });
    }

    const productRef = doc(db, `users/${configUserId}/products`, productId);
    const optionsRef = doc(db, 'userProductOptions', configUserId, 'products', productId);

    const [productSnap, optionsSnap] = await Promise.all([
        getDoc(productRef),
        getDoc(optionsRef)
    ]);

    if (!productSnap.exists()) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const productData = productSnap.data() as NativeProduct;
    const optionsData = optionsSnap.exists() ? optionsSnap.data() as ProductOptionsFirestoreData : null;
    
    const defaultPlaceholderImage = `https://placehold.co/600x400.png?text=${encodeURIComponent(productData.name)}`;
    
    const views = optionsData?.defaultViews?.map(view => ({
      ...view, // Spread to include all properties like boundaryBoxes
      imageUrl: view.imageUrl && !view.imageUrl.includes('placehold.co') ? view.imageUrl : `${defaultPlaceholderImage}&txtsize=30&text=${encodeURIComponent(view.name)}`,
    })) || [{ id: 'default_view', name: 'Front', imageUrl: defaultPlaceholderImage, boundaryBoxes: [], price: 0 }];
    
    const primaryImageUrl = views[0]?.imageUrl || defaultPlaceholderImage;

    // Correctly process the variation images object from the `views` array inside each color group
    const variationImages: Record<string, ProductView[]> = {};
    if (optionsData?.optionsByColor) {
      for (const color in optionsData.optionsByColor) {
        const colorGroup = optionsData.optionsByColor[color];
        if (colorGroup.views && Array.isArray(colorGroup.views) && colorGroup.views.length > 0) {
           variationImages[color] = colorGroup.views.map(view => ({
               ...view,
               imageUrl: view.imageUrl && !view.imageUrl.includes('placehold.co') ? view.imageUrl : `${defaultPlaceholderImage}&txtsize=30&text=${encodeURIComponent(view.name)}`
           }));
        }
      }
    }
    
    const cleanNativeVariations = (optionsData?.nativeVariations || []).map(v => {
      const cleanVariation: any = { ...v };
      cleanVariation.salePrice = (v.salePrice !== undefined && v.salePrice !== null && !isNaN(v.salePrice)) ? v.salePrice : null;
      return cleanVariation as NativeProductVariation;
    });

    const publicProductDetail: PublicProductDetail = {
      id: productId,
      name: productData.name,
      description: productData.description,
      price: optionsData?.price ?? 0,
      salePrice: optionsData?.salePrice ?? null,
      imageUrl: primaryImageUrl,
      productUrl: `/store/${storeId}/shop/${productId}`, // Use storeId and new route
      views: views,
      attributes: optionsData?.nativeAttributes as ProductAttributeOptionsForPDP | undefined,
      variationImages: Object.keys(variationImages).length > 0 ? variationImages : undefined,
      brand: productData.brand,
      sku: productData.sku,
      category: productData.category, // Pass the ID directly
      customizationTechniques: productData.customizationTechniques,
      nativeVariations: cleanNativeVariations,
    };

    return NextResponse.json({ product: publicProductDetail }, {
        headers: {
            'Cache-Control': 'no-store, max-age=0, must-revalidate',
        },
    });

  } catch (error: any) {
    console.error(`Error fetching product ${productId} for store ${storeId}:`, error);
    return NextResponse.json({ error: `Failed to fetch product details: ${error.message}` }, { status: 500 });
  }
}
