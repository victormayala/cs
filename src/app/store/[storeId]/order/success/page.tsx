
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StoreHeader } from '@/components/store/StoreHeader';
import { StoreFooter } from '@/components/store/StoreFooter';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import type { StoreOrder } from '@/lib/data-types';
import { CheckCircle2, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { getOrderByStripeSessionId } from '@/app/actions/stripeActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

function OrderSuccessLoadingSkeleton() {
    return (
    <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-card h-16 flex items-center">
            <div className="container mx-auto px-4 md:px-6">
                <Skeleton className="h-6 w-1/4" />
            </div>
        </header>
        <main className="flex-1 py-12 md:py-16">
            <div className="container max-w-2xl mx-auto px-4 text-center">
                <Skeleton className="h-16 w-16 mx-auto rounded-full mb-6" />
                <Skeleton className="h-10 w-3/4 mx-auto mb-4" />
                <Skeleton className="h-6 w-full mx-auto mb-8" />
                <div className="text-left mt-8">
                    <Skeleton className="h-8 w-1/2 mb-4" />
                    <Skeleton className="h-32 w-full" />
                </div>
                <Skeleton className="h-12 w-48 mx-auto mt-8" />
            </div>
        </main>
      <footer className="border-t bg-muted/50 h-20 flex items-center">
        <div className="container mx-auto px-4 md:px-6">
            <Skeleton className="h-4 w-1/4" />
        </div>
      </footer>
    </div>
    )
}

function OrderSuccessPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const storeId = params.storeId as string;
  const sessionId = searchParams.get('session_id');

  const [storeConfig, setStoreConfig] = useState<UserStoreConfig | null>(null);
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!storeId) {
        setError("Store ID is missing.");
        setIsLoading(false);
        return;
    }
    
    const fetchPageData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const storeDocRef = doc(db, 'userStores', storeId);
        const storeDocSnap = await getDoc(storeDocRef);
        if (storeDocSnap.exists()) {
          setStoreConfig({ ...storeDocSnap.data(), id: storeDocSnap.id } as UserStoreConfig);
        } else {
            throw new Error("Store not found.");
        }

        if (sessionId) {
            // Wait a moment for webhook to potentially process
            await new Promise(resolve => setTimeout(resolve, 2000));
            const { order: fetchedOrder, error: orderError } = await getOrderByStripeSessionId(storeId, sessionId);
            if (orderError) {
                // It's not a critical error if the order isn't found immediately,
                // the webhook might be delayed. We'll show a generic success message.
                console.warn("Could not fetch order details:", orderError);
            }
            setOrder(fetchedOrder);
        } else {
            console.warn("No session_id found in URL for order success page.");
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPageData();
  }, [storeId, sessionId]);

  if (isLoading) {
      return <OrderSuccessLoadingSkeleton />
  }
  
  if (error) {
       return (
        <div className="flex flex-col min-h-screen items-center justify-center p-4">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-destructive">Error</h2>
            <p className="text-muted-foreground">{error}</p>
        </div>
       )
  }
  
  if (!storeConfig) {
      return <OrderSuccessLoadingSkeleton />
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/50">
      <StoreHeader storeConfig={storeConfig} />
      <main className="flex-1 flex items-center justify-center py-12 md:py-16">
        <div className="container max-w-2xl mx-auto px-4 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-6" />
          <h1 className="text-3xl md:text-4xl font-bold font-headline text-foreground mb-4">
            Thank You For Your Order!
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Your custom creation is on its way. We've sent a confirmation email with your order details.
          </p>

          {order && (
            <Card className="text-left mt-8">
                <CardHeader>
                    <CardTitle>Order Confirmation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Order ID:</span>
                        <span className="font-mono text-foreground">{order.id}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Order Date:</span>
                        <span className="font-medium text-foreground">{format(new Date(order.createdAt as string), 'PPp')}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Customer:</span>
                        <span className="font-medium text-foreground">{order.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Amount:</span>
                        <span className="font-bold text-foreground">${order.totalAmount.toFixed(2)}</span>
                    </div>
                </CardContent>
            </Card>
          )}

          <Button size="lg" asChild className="mt-8">
            <Link href={`/store/${storeId}/shop`}>
              Continue Shopping <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </main>
      <StoreFooter storeConfig={storeConfig} />
    </div>
  );
}


export default function OrderSuccessPageWrapper() {
  return (
    <Suspense fallback={<OrderSuccessLoadingSkeleton />}>
        <OrderSuccessPageContent />
    </Suspense>
  )
}
