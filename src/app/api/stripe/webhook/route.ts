
'use server';

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey || !stripeWebhookSecret) {
  throw new Error("Stripe keys are not set in environment variables.");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
  typescript: true,
});

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    console.warn("[Stripe Webhook] Missing signature.");
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, stripeWebhookSecret);
  } catch (err: any) {
    console.error(`[Stripe Webhook] Error verifying signature: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'account.updated':
      const account = event.data.object as Stripe.Account;
      console.log(`[Stripe Webhook] Received account.updated for ${account.id}. Charges enabled: ${account.charges_enabled}, Payouts enabled: ${account.payouts_enabled}.`);
      
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('stripeConnectAccountId', '==', account.id));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          console.warn(`[Stripe Webhook] No user found for Stripe account ID: ${account.id}`);
          break;
        }

        querySnapshot.forEach(async (userDoc) => {
          const userDocRef = doc(db, 'users', userDoc.id);
          const updates: any = {
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
          };

          if (account.details_submitted) {
            updates.connectOnboardingStatus = 'completed';
          } else if (userDoc.data().connectOnboardingStatus !== 'completed') {
            updates.connectOnboardingStatus = 'in_progress';
          }
          
          await updateDoc(userDocRef, updates);
          console.log(`[Stripe Webhook] Updated user ${userDoc.id} with latest Stripe Connect status.`);
        });
      } catch (dbError: any) {
        console.error(`[Stripe Webhook] Firestore error updating user for account ${account.id}:`, dbError);
        // We still return 200 to Stripe, as the event was received.
        // We log the error internally for manual intervention if needed.
      }
      break;
    
    // We will add logic for this in the next step to create orders in our DB.
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`[Stripe Webhook] Checkout session completed for ${session.id}. This will be handled in the next step.`);
      // TODO: Fulfill the purchase.
      break;

    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

// NOTE: You need to configure this endpoint in your Stripe dashboard:
// URL: https://<your-app-url>/api/stripe/webhook
// Events to listen for: 'account.updated', 'checkout.session.completed'
