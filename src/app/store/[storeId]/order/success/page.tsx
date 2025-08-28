
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StoreHeader } from '@/components/store/StoreHeader';
import { StoreFooter } from '@/components/store/StoreFooter';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

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
                <Skeleton className="h-12 w-48 mx-auto" />
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

export default function OrderSuccessPage() {
  const params = useParams();
  const storeId = params.storeId as string;

  const [storeConfig, setStoreConfig] = useState<UserStoreConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!storeId) {
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
        }
      } catch (err: any) {
        console.error("Failed to load store config for success page:", err);
        // Fail silently, as the page can still render without it.
      } finally {
        setIsLoading(false);
      }
    };
    fetchStoreConfig();
  }, [storeId]);

  if (isLoading || !storeConfig) {
      return <OrderSuccessLoadingSkeleton />
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
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
          <Button size="lg" asChild>
            <Link href={`/store/${storeId}/products`}>
              Continue Shopping <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </main>
      <StoreFooter storeConfig={storeConfig} />
    </div>
  );
}
