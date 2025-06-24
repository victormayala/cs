
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

    // Strict type checking for inputs
    if (typeof configUserId !== 'string' || typeof productId !== 'string') {
        console.error(`/api/product-customization-check: Invalid type for input. configUserId type: ${typeof configUserId}, productId type: ${typeof productId}`);
        return NextResponse.json({ error: 'Invalid type for configUserId or productId. Both must be strings.' }, { status: 400 });
    }

    if (!db) {
      console.error("/api/product-customization-check: Firestore not initialized. Check firebase.ts");
      return NextResponse.json({ error: 'Database service is not available on the server.' }, { status: 500 });
    }

    let allowCustomization = true; // Default to true

    try {
      const docRef = doc(db, 'userProductOptions', configUserId, 'products', productId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const optionsData = docSnap.data() as ProductOptionsFirestoreData;
        // If allowCustomization is explicitly set to false, respect it.
        // Otherwise (true, undefined, or null), it's considered allowed.
        if (optionsData.allowCustomization === false) {
          allowCustomization = false;
        }
      }
      // If the document doesn't exist, we default to allowCustomization = true (as initialized)
      
      return NextResponse.json({ allowCustomization });

    } catch (firestoreError: any) {
      console.error(`Firestore error in /api/product-customization-check for configUser ${configUserId}, product ${productId}:`, firestoreError);
      
      let detailedFirestoreError = 'Failed to retrieve product customization status from the database.'; // Default message
      if (firestoreError && typeof firestoreError.message === 'string' && firestoreError.message.trim() !== '') {
          detailedFirestoreError = firestoreError.message;
          // Make the permission error message more specific for the client plugin dev
          if (detailedFirestoreError.toLowerCase().includes('permission-denied') || detailedFirestoreError.toLowerCase().includes('missing or insufficient permissions')) {
              detailedFirestoreError = "Access to product configuration data was denied. Please verify server-side Firestore security rules allow reads for this path, or check the API key if the API communicates directly with Firestore without admin privileges.";
          }
      } else if (firestoreError && typeof firestoreError.toString === 'function') {
          const firestoreErrorString = firestoreError.toString();
          if (firestoreErrorString !== '[object Object]' && firestoreErrorString.trim() !== '') { // Avoid generic "[object Object]"
              detailedFirestoreError = firestoreErrorString;
          }
      }
      // If Firestore read fails, the API itself should indicate a server error.
      return NextResponse.json({ error: `Server error checking product customization: ${detailedFirestoreError}` }, { status: 500 });
    }

  } catch (error: any) {
    // Catch errors from request.json() or other unexpected issues in the handler
    console.error('Error in /api/product-customization-check handler:', error);
    
    let errorMessage = 'An unexpected error occurred processing the request.'; // Default message
    if (error instanceof SyntaxError) { // Specifically for JSON parsing errors
      errorMessage = 'Invalid JSON in request body. Please ensure configUserId and productId are sent in a valid JSON object.';
    } else if (error && typeof error.message === 'string' && error.message.trim() !== '') { // Standard error object with a message
        errorMessage = error.message;
    } else if (typeof error === 'string' && error.trim() !== '') { // Error itself is a string
        errorMessage = error;
    } else if (error && typeof error.toString === 'function') { // Fallback to error.toString()
        const errorString = error.toString();
        if (errorString !== '[object Object]' && errorString.trim() !== '') { // Avoid generic "[object Object]"
            errorMessage = errorString;
        }
    }
    // The console.error above logs the full error object for deeper inspection if needed.
    return NextResponse.json({ error: `Handler Error: ${errorMessage}` }, { status: 500 });
  }
}
