
'use server';

import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import type { User } from '@/contexts/AuthContext';

// Ensure the Stripe secret key is set
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error("Stripe secret key is not set in environment variables. Please set STRIPE_SECRET_KEY.");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
});

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
        const loginLink = await stripe.accounts.createLoginLink(accountId);
        return { success: true, url: loginLink.url };
    } catch (error: any) {
        console.error(`Error creating Stripe login link for account ${accountId}:`, error);
        const errorMessage = error.raw?.message || 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}
