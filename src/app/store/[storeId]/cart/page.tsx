
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { StoreHeader } from '@/components/store/StoreHeader';
import { StoreFooter } from '@/components/store/StoreFooter';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import { Loader2, ShoppingCart, AlertTriangle, ArrowRight } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

function CartLoadingSkeleton() {
    return (
    <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-card h-16 flex items-center">
            <div className="container mx-auto px-4 md:px-6">
                <Skeleton className="h-6 w-1/4" />
            </div>
        </header>
        <main className="flex-1 py-12 md:py-16">
            <div className="container max-w-4xl mx-auto px-4">
                <Skeleton className="h-10 w-1/3 mb-8" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-4">
                        <Skeleton className="h-28 w-full" />
                        <Skeleton className="h-28 w-full" />
                    </div>
                    <div className="md:col-span-1">
                        <Skeleton className="h-48 w-full" />
                    </div>
                </div>
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

export default function CartPage() {
  const params = useParams();
  const storeId = params.storeId as string;

  const [storeConfig, setStoreConfig] = useState<UserStoreConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: Add state for cart items, e.g., const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    if (!storeId) {
      setError('Store ID is missing from the URL.');
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
          throw new Error("Store configuration not found.");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStoreConfig();
    // TODO: Add logic here to listen for `postMessage` from the customizer and add to cartItems state.
  }, [storeId]);

  if (isLoading || !storeConfig) {
    return <CartLoadingSkeleton />;
  }
  
  if (error) {
     // A minimal header/footer can be shown on error pages if desired
     return (
        <div className="flex flex-col min-h-screen bg-background">
            <header className="sticky top-0 z-50 w-full border-b bg-card h-16"></header>
            <main className="flex-1 flex items-center justify-center p-4">
                <Card className="w-full max-w-md p-6">
                    <div className="text-center text-destructive">
                        <AlertTriangle className="mx-auto h-12 w-12" />
                        <h2 className="mt-4 text-xl font-semibold">Error</h2>
                        <p className="mt-2 text-sm">{error}</p>
                    </div>
                </Card>
            </main>
            <footer className="border-t bg-muted/50 h-20"></footer>
        </div>
     )
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/50">
      <StoreHeader storeConfig={storeConfig} />
      <main className="flex-1 py-12 md:py-16">
        <div className="container max-w-4xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold font-headline text-foreground mb-8">
            Your Shopping Cart
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <Card>
                <CardContent className="p-6">
                  {/* Placeholder for when cart is empty */}
                  <div className="text-center py-12">
                    <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">Your cart is empty</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Looks like you haven't added any custom items yet.
                    </p>
                    <Button asChild className="mt-6">
                      <Link href={`/store/${storeId}/products`}>
                        Start Shopping
                      </Link>
                    </Button>
                  </div>
                  {/* TODO: Map over cartItems here and display them */}
                </CardContent>
              </Card>
            </div>
            <div className="md:col-span-1">
              <Card className="sticky top-28">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span>Calculated at next step</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>$0.00</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" disabled>
                    Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <StoreFooter storeConfig={storeConfig} />
    </div>
  );
}
