
'use server';

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import type { StoreOrder, StoreCustomer } from '@/lib/data-types';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey || !stripeWebhookSecret) {
  throw new Error("Stripe keys are not set in environment variables.");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
  typescript: true,
});

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const { storeId, merchantId, cartItems: cartItemsString, customerName } = session.metadata || {};

  if (!storeId || !merchantId || !session.payment_intent) {
    console.error(`[Stripe Webhook] Missing required metadata or payment_intent from session ${session.id}. Cannot fulfill order.`);
    return;
  }
  
  try {
    const customerEmail = session.customer_details?.email;
    if (!customerEmail) {
        console.error(`[Stripe Webhook] No customer email found for session ${session.id}.`);
        return;
    }

    let customerId: string;
    const customerQuery = query(collection(db, `users/${merchantId}/customers`), where("email", "==", customerEmail));
    const customerSnapshot = await getDocs(customerQuery);
    
    if (customerSnapshot.empty) {
        // Create new customer
        const newCustomerData: Omit<StoreCustomer, 'id'> = {
            name: customerName || session.customer_details?.name || 'N/A',
            email: customerEmail,
            storeId: storeId,
            createdAt: serverTimestamp(),
            totalSpent: (session.amount_total || 0) / 100,
            orderCount: 1,
        };
        const customerDocRef = await addDoc(collection(db, `users/${merchantId}/customers`), newCustomerData);
        customerId = customerDocRef.id;
    } else {
        // Update existing customer
        const customerDoc = customerSnapshot.docs[0];
        customerId = customerDoc.id;
        const customerData = customerDoc.data() as StoreCustomer;
        await updateDoc(doc(db, `users/${merchantId}/customers`, customerId), {
            totalSpent: customerData.totalSpent + ((session.amount_total || 0) / 100),
            orderCount: customerData.orderCount + 1,
        });
    }

    // Create the order document
    const newOrderData: Omit<StoreOrder, 'id'> = {
        storeId: storeId,
        customerId: customerId,
        customerName: customerName || session.customer_details?.name || 'N/A',
        totalAmount: (session.amount_total || 0) / 100,
        status: 'processing',
        items: cartItemsString ? JSON.parse(cartItemsString) : [],
        stripeCheckoutSessionId: session.id, // Store stripe session ID for reference
        createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, `users/${merchantId}/orders`), newOrderData);

    console.log(`[Stripe Webhook] Successfully fulfilled order for session ${session.id}.`);

  } catch (error) {
    console.error(`[Stripe Webhook] Error fulfilling order for session ${session.id}:`, error);
    // We don't throw here because we want to send a 200 to Stripe to prevent retries
    // for this specific error. The error is logged for manual follow-up.
  }
}

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
    
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`[Stripe Webhook] Checkout session completed for ${session.id}. Fulfilling purchase...`);
      await handleCheckoutSessionCompleted(session);
      break;

    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

// NOTE: You need to configure this endpoint in your Stripe dashboard:
// URL: https://<your-app-url>/api/stripe/webhook
// Events to listen for: 'account.updated', 'checkout.session.completed'

