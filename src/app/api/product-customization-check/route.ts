
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { ProductOptionsFirestoreData } from '@/app/actions/productOptionsActions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { configUserId, productId } = body;

    if (!configUserId || !productId) {
      return NextResponse.json({ error: 'Missing configUserId or productId. Both are required.' }, { status: 400 });
    }

    if (typeof configUserId !== 'string' || typeof productId !== 'string') {
        console.error(`/api/product-customization-check: Invalid type for input. configUserId type: ${typeof configUserId}, productId type: ${typeof productId}`);
        return NextResponse.json({ error: 'Invalid type for configUserId or productId. Both must be strings.' }, { status: 400 });
    }

    if (!db) {
      console.error("/api/product-customization-check: Firestore not initialized. Check firebase.ts");
      return NextResponse.json({ error: 'Database service is not available on the server.' }, { status: 500 });
    }

    try {
      const optionsRef = doc(db, 'userProductOptions', configUserId, 'products', productId);
      const optionsSnap = await getDoc(optionsRef);

      if (optionsSnap.exists()) {
        const optionsData = optionsSnap.data() as ProductOptionsFirestoreData;
        const allowCustomization = optionsData.allowCustomization !== false;
        return NextResponse.json({ allowCustomization });
      }

      // If options don't exist, check if it's a valid native product
      const nativeProductRef = doc(db, `users/${configUserId}/products`, productId);
      const nativeProductSnap = await getDoc(nativeProductRef);

      if (nativeProductSnap.exists()) {
        // It's a valid native product, so customization should be allowed by default
        return NextResponse.json({ allowCustomization: true });
      }

      // If neither document exists, customization is effectively not configured/allowed.
      return NextResponse.json({ allowCustomization: false });

    } catch (firestoreError: any) {
      console.error(`Firestore error in /api/product-customization-check for configUser ${configUserId}, product ${productId}:`, firestoreError);
      
      let detailedFirestoreError = 'Failed to retrieve product customization status from the database.';
      if (firestoreError?.message) {
          detailedFirestoreError = firestoreError.message;
          if (detailedFirestoreError.toLowerCase().includes('permission-denied')) {
              detailedFirestoreError = "Access to product configuration data was denied. Check Firestore security rules.";
          }
      }
      
      return NextResponse.json({ error: `Server error checking product customization: ${detailedFirestoreError}` }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in /api/product-customization-check handler:', error);
    
    let errorMessage = 'An unexpected error occurred processing the request.';
    if (error instanceof SyntaxError) {
      errorMessage = 'Invalid JSON in request body.';
    } else if (error?.message) {
        errorMessage = error.message;
    }
    
    return NextResponse.json({ error: `Handler Error: ${errorMessage}` }, { status: 500 });
  }
}
