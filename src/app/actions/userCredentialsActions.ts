
'use server';

// This file is now primarily for exporting types, as all Firestore operations
// that depend on user authentication have been moved to client-side components
// to ensure they run with the user's auth context, resolving permission errors.
import type { WooCommerceCredentials as WC } from '@/app/actions/woocommerceActions';

export interface UserWooCommerceCredentials extends WC {
  lastSaved?: any; // Firestore server timestamp
}

// The save/load/delete functions have been moved to their respective client components
// to correctly use the client's Firebase auth context for Firestore security rules.
