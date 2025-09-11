
'use server';

import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { User } from '@/contexts/AuthContext';
import type { CartItem } from '@/app/store/[storeId]/checkout/page';
import type { UserStoreConfig } from './userStoreActions';
import type { StoreOrder } from '@/lib/data-types';


// Helper function to get the Stripe instance on demand
function getStripeInstance() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("Stripe secret key is not set in environment variables. Please set STRIPE_SECRET_KEY.");
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20',
  });
}


interface CreateDeferredStripeAccountArgs {
  userId: string;
  email: string;
  name: string;
}

/**
 * Creates a deferred Stripe Connect Express account for a new user.
 * This function is called immediately after a user signs up.
 * It creates the account but does not initiate the onboarding flow.
 * @param {CreateDeferredStripeAccountArgs} args - The user details required.
 * @returns {Promise<{success: boolean; accountId?: string; error?: string}>} - The result of the operation.
 */
export async function createDeferredStripeAccount(
  args: CreateDeferredStripeAccountArgs
): Promise<{success: boolean; accountId?: string; error?: string}> {
  const { userId, email, name } = args;

  if (!userId || !email) {
    return { success: false, error: 'User ID and email are required.' };
  }

  try {
    const stripe = getStripeInstance();
    const account = await stripe.accounts.create({
      type: 'express',
      email: email,
      business_type: 'individual',
      business_profile: {
        name: name,
        // It's good practice to provide a default support email
        support_email: email,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // Save the Stripe Connect Account ID to the user's document in Firestore
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      stripeConnectAccountId: account.id,
      connectOnboardingStatus: "not_started",
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    });

    console.log(`Successfully created deferred Stripe account ${account.id} for user ${userId}`);
    return { success: true, accountId: account.id };

  } catch (error: any) {
    console.error('Error creating Stripe deferred account:', error);
    // It's important not to expose raw Stripe errors to the client
    const errorMessage = error.raw?.message || 'An unexpected error occurred while creating the Stripe account.';
    
    // You might want to update the user doc with an error state here
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
        stripeConnectAccountError: errorMessage,
    }).catch(dbError => console.error("Failed to write Stripe error to user doc:", dbError));

    return { success: false, error: errorMessage };
  }
}

/**
 * Creates a Stripe Account Link for onboarding or viewing the dashboard.
 * @param {string} accountId - The Stripe Connect account ID (acct_...).
 * @param {string} type - The type of link to create ('account_onboarding' or 'account_update').
 * @returns {Promise<{success: boolean; url?: string; error?: string}>} - The result with the URL.
 */
export async function createStripeAccountLink(
    accountId: string, 
    type: 'account_onboarding' | 'account_update'
): Promise<{success: boolean; url?: string; error?: string}> {
  if (!accountId) {
    return { success: false, error: 'Stripe account ID is required.' };
  }

  // Get the base URL from environment variables to construct the return/refresh URLs
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const returnUrl = `${appUrl}/dashboard?stripe_return=true`;
  const refreshUrl = `${appUrl}/dashboard`;

  try {
    const stripe = getStripeInstance();
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: type,
    });
    
    return { success: true, url: accountLink.url };

  } catch (error: any) {
    console.error(`Error creating Stripe account link for account ${accountId}:`, error);
    const errorMessage = error.raw?.message || 'An unexpected error occurred while creating the Stripe link.';
    return { success: false, error: errorMessage };
  }
}

/**
 * Creates a Stripe Login Link for accessing the Express dashboard.
 * @param {string} accountId - The Stripe Connect account ID.
 * @returns {Promise<{success: boolean; url?: string; error?: string}>} - The result with the login URL.
 */
export async function createStripeLoginLink(
    accountId: string
): Promise<{success: boolean; url?: string; error?: string}> {
    if (!accountId) {
        return { success: false, error: 'Stripe account ID is required.' };
    }

    try {
        const stripe = getStripeInstance();
        const loginLink = await stripe.accounts.createLoginLink(accountId);
        return { success: true, url: loginLink.url };
    } catch (error: any) {
        console.error(`Error creating Stripe login link for account ${accountId}:`, error);
        const errorMessage = error.raw?.message || 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}


/**
 * Creates a Stripe Checkout session for a given store and cart items.
 */
export async function createCheckoutSession(
  storeId: string,
  cartItems: CartItem[],
  customerInfo: { email: string, name: string }
): Promise<{ sessionId?: string; url?: string | null; error?: string }> {
  if (!storeId || !cartItems || cartItems.length === 0) {
    return { error: 'Store ID and cart items are required.' };
  }

  try {
    const stripe = getStripeInstance();
    const storeDocRef = doc(db, 'userStores', storeId);
    const storeDocSnap = await getDoc(storeDocRef);

    if (!storeDocSnap.exists()) {
      throw new Error('Store configuration not found.');
    }
    const storeConfig = storeDocSnap.data() as UserStoreConfig;
    const merchantId = storeConfig.userId;

    const merchantUserDocRef = doc(db, 'users', merchantId);
    const merchantUserDocSnap = await getDoc(merchantUserDocRef);
    const merchantStripeAccountId = merchantUserDocSnap.data()?.stripeConnectAccountId;

    if (!merchantStripeAccountId) {
      throw new Error('The store owner has not configured their payment account.');
    }
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const line_items = cartItems.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.productName,
          // You could add a description or images here if desired
          // description: `Customized product: ${item.customizationDetails...}`
          images: item.previewImageUrls?.map(p => p.url).slice(0, 8), // Stripe allows up to 8 images
        },
        unit_amount: Math.round(item.totalCustomizationPrice * 100), // Price in cents
      },
      quantity: item.quantity,
    }));
    
    // For now, a fixed 10% application fee. This could be made more dynamic.
    const applicationFeeAmount = Math.round(line_items.reduce((acc, item) => acc + item.price_data.unit_amount * item.quantity, 0) * 0.10);


    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${appUrl}/store/${storeId}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/store/${storeId}/cart`,
      customer_email: customerInfo.email,
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: merchantStripeAccountId,
        },
      },
      metadata: {
          storeId: storeId,
          merchantId: merchantId,
          cartItems: JSON.stringify(cartItems.map(item => ({id: item.id, name: item.productName, quantity: item.quantity}))), // Store simplified cart info
          customerName: customerInfo.name,
      }
    });

    return { sessionId: session.id, url: session.url };

  } catch (error: any) {
    console.error('Error creating Stripe Checkout session:', error);
    return { error: error.message || 'An unexpected error occurred.' };
  }
}

/**
 * Retrieves an order from Firestore based on the Stripe Checkout Session ID.
 */
export async function getOrderByStripeSessionId(
    storeId: string, 
    stripeSessionId: string
): Promise<{ order: StoreOrder | null, error?: string }> {
    if (!storeId || !stripeSessionId) {
        return { order: null, error: "Store ID and Session ID are required." };
    }

    try {
        const storeDocRef = doc(db, 'userStores', storeId);
        const storeDocSnap = await getDoc(storeDocRef);
        if (!storeDocSnap.exists()) {
            return { order: null, error: "Store not found." };
        }
        const merchantId = storeDocSnap.data().userId;

        const ordersRef = collection(db, `users/${merchantId}/orders`);
        const q = query(
            ordersRef,
            where("stripeCheckoutSessionId", "==", stripeSessionId),
            limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { order: null, error: "Order not found." };
        }

        const orderDoc = querySnapshot.docs[0];
        const orderData = orderDoc.data() as Omit<StoreOrder, 'id'>;

        // Manually convert Firestore Timestamp to JSON-serializable format (ISO string)
        const serializableOrder: StoreOrder = {
            id: orderDoc.id,
            ...orderData,
            createdAt: (orderData.createdAt as Timestamp).toDate().toISOString(),
        };

        return { order: serializableOrder };
    } catch (err: any) {
        console.error("Error fetching order by session ID:", err);
        return { order: null, error: "Failed to retrieve order details from the database." };
    }
}
