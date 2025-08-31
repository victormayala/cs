
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { PublicProduct } from '@/types/product';
import type { NativeProduct, CustomizationTechnique } from '@/app/actions/productActions';
import type { ProductOptionsFirestoreData, ProductAttributeOptions, VariationImage, NativeProductVariation } from '@/app/actions/productOptionsActions';
import type { SizeAttribute } from '@/app/dashboard/products/[productId]/options/page';
import { ProductCategory } from '@/app/dashboard/categories/page';

interface ProductAttributeOptionsForPDP extends Omit<ProductAttributeOptions, 'sizes'> {
  sizes: SizeAttribute[];
}
// A more detailed version for the PDP
interface PublicProductDetail extends PublicProduct {
    salePrice?: number | null; // Allow null to represent no sale price
    views: {
        id: string;
        name: string;
        imageUrl: string;
    }[];
    attributes?: ProductAttributeOptionsForPDP;
    variationImages?: Record<string, VariationImage[]>; // Key: Color Name
    brand?: string;
    sku?: string;
    category?: string; // Now holds the category NAME
    customizationTechniques?: CustomizationTechnique[];
    nativeVariations?: NativeProductVariation[];
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

    const [productSnap, optionsSnap] = await Promise.all([
        getDoc(productRef),
        getDoc(optionsRef)
    ]);

    if (!productSnap.exists()) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const productData = productSnap.data() as NativeProduct;
    const optionsData = optionsSnap.exists() ? optionsSnap.data() as ProductOptionsFirestoreData : null;
    
    // --- Corrected Category Name Fetching Logic ---
    let categoryName: string | undefined = undefined;
    if (productData.category && typeof productData.category === 'string') {
        const categoryId = productData.category;
        try {
            const categoryDocRef = doc(db, 'users', configUserId, 'productCategories', categoryId);
            const categoryDocSnap = await getDoc(categoryDocRef);
            if (categoryDocSnap.exists()) {
                const categoryData = categoryDocSnap.data() as ProductCategory;
                categoryName = categoryData.name;
            } else {
                console.warn(`Category document with ID "${categoryId}" not found for user "${configUserId}".`);
            }
        } catch (catError) {
            console.error(`Error fetching category "${categoryId}" for product "${productId}":`, catError);
            // Don't block the request if category fetch fails, just log it.
        }
    }
    // --- End Corrected Logic ---
    
    const defaultPlaceholderImage = `https://placehold.co/600x400.png?text=${encodeURIComponent(productData.name)}`;
    
    const views = optionsData?.defaultViews?.map(view => ({
      id: view.id,
      name: view.name,
      imageUrl: view.imageUrl && !view.imageUrl.includes('placehold.co') ? view.imageUrl : `${defaultPlaceholderImage}&txtsize=30&text=${encodeURIComponent(view.name)}`,
    })) || [{ id: 'default_view', name: 'Front', imageUrl: defaultPlaceholderImage }];
    
    const primaryImageUrl = views[0]?.imageUrl || defaultPlaceholderImage;

    const variationImages: Record<string, VariationImage[]> = {};
    if (optionsData?.optionsByColor) {
      for (const color in optionsData.optionsByColor) {
        const colorGroup = optionsData.optionsByColor[color];
        if (colorGroup.variantImages && colorGroup.variantImages.length > 0) {
          variationImages[color] = colorGroup.variantImages.filter(img => img && img.imageUrl);
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
      productUrl: `/store/${configUserId}/products/${productId}`,
      views: views,
      attributes: optionsData?.nativeAttributes as ProductAttributeOptionsForPDP | undefined,
      variationImages: Object.keys(variationImages).length > 0 ? variationImages : undefined,
      brand: productData.brand,
      sku: productData.sku,
      category: categoryName, // Use the fetched name here
      customizationTechniques: productData.customizationTechniques,
      nativeVariations: cleanNativeVariations,
    };

    return NextResponse.json({ product: publicProductDetail }, {
        headers: {
            'Cache-Control': 'no-store, max-age=0, must-revalidate',
        },
    });

  } catch (error: any) {
    console.error(`Error fetching product ${productId} for user ${configUserId}:`, error);
    return NextResponse.json({ error: `Failed to fetch product details: ${error.message}` }, { status: 500 });
  }
}
