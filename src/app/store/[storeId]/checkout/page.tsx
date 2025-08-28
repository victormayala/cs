
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StoreHeader } from '@/components/store/StoreHeader';
import { StoreFooter } from '@/components/store/StoreFooter';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import { CreditCard, Lock, AlertTriangle } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

function CheckoutLoadingSkeleton() {
    return (
    <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-card h-16 flex items-center">
            <div className="container mx-auto px-4 md:px-6">
                <Skeleton className="h-6 w-1/4" />
            </div>
        </header>
        <main className="flex-1 py-12 md:py-16">
            <div className="container max-w-4xl mx-auto px-4 text-center">
                <Skeleton className="h-10 w-1/2 mx-auto mb-8" />
                <Skeleton className="h-96 w-full" />
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

export default function CheckoutPage() {
  const params = useParams();
  const storeId = params.storeId as string;

  const [storeConfig, setStoreConfig] = useState<UserStoreConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!storeId) {
      setError('Store ID is missing.');
      setIsLoading(false);
      return;
    }
    const fetchStoreConfig = async () => {
      setIsLoading(true);
      try {
        const storeDocRef = doc(db, 'userStores', storeId);
        const storeDocSnap = await getDoc(storeDocRef);
        if (storeDocSnap.exists()) {
          setStoreConfig({ ...storeDocSnap.data(), id: storeDocSnap.id } as UserStoreConfig);
        } else {
          throw new Error("Store not found.");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStoreConfig();
  }, [storeId]);

  if (isLoading || !storeConfig) {
      return <CheckoutLoadingSkeleton />
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/50">
      <StoreHeader storeConfig={storeConfig} />
      <main className="flex-1 py-12 md:py-16">
        <div className="container max-w-xl mx-auto px-4 text-center">
          <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="text-3xl md:text-4xl font-bold font-headline text-foreground mb-8">
            Secure Checkout
          </h1>
          
          <Card>
            <CardHeader>
              <CardTitle>Payment Processing</CardTitle>
            </CardHeader>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <CreditCard className="mx-auto h-16 w-16 mb-4" />
                <p className="font-medium text-lg">Coming Soon</p>
                <p className="text-sm mt-2">
                  Real payment processing via Stripe will be implemented here.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Button variant="link" asChild className="mt-8">
            <Link href={`/store/${storeId}/cart`}>
              Return to Cart
            </Link>
          </Button>
        </div>
      </main>
      <StoreFooter storeConfig={storeConfig} />
    </div>
  );
}
