
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProductCard, ProductCardSkeleton } from '@/components/store/ProductCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, PackageSearch } from 'lucide-react';
import type { PublicProduct } from '@/types/product';
import { StoreHeader } from '@/components/store/StoreHeader';
import { StoreFooter } from '@/components/store/StoreFooter';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function ProductListingLoadingSkeleton() {
    return (
    <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-card h-16 flex items-center">
            <div className="container mx-auto px-4 md:px-6">
                <Skeleton className="h-6 w-1/4" />
            </div>
        </header>
      <main className="flex-1 py-12 md:py-16">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="mb-12">
            <Skeleton className="h-10 w-1/3 mb-4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
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

function StoreNotFound() {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-card h-16"></header>
        <main className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-destructive">
                <AlertTriangle className="mx-auto h-12 w-12" />
                <h2 className="mt-4 text-xl font-semibold">Store Not Found</h2>
                <p className="mt-2 text-sm text-muted-foreground">The store you are looking for does not seem to exist. Please check the URL.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/">
                        Go to Homepage
                    </Link>
                </Button>
            </div>
        </main>
        <footer className="border-t bg-muted/50 h-20"></footer>
      </div>
    );
}

export default function ShopPage() {
  const params = useParams();
  const storeId = params.storeId as string;

  const [storeConfig, setStoreConfig] = useState<UserStoreConfig | null>(null);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) {
      setError('Store ID is missing from the URL.');
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
          setError("Store configuration not found.");
          setIsLoading(false);
          return;
        }

        const response = await fetch(`/api/store/products?storeId=${storeId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch products.');
        }
        const data = await response.json();
        setProducts(data.products || []);
      } catch (err: any) {
        console.error('Error fetching page data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPageData();
  }, [storeId]);
  
  if (isLoading) {
      return <ProductListingLoadingSkeleton />
  }

  if (error) {
     return <StoreNotFound />;
  }
  
  if (!storeConfig) {
      return <ProductListingLoadingSkeleton />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <StoreHeader storeConfig={storeConfig} />
      <main className="flex-1 py-12 md:py-16">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-left mb-12">
            <h1 className="text-4xl md:text-5xl font-bold font-headline text-foreground mb-4">
              Our Products
            </h1>
            <p className="text-lg text-muted-foreground">
              Browse our collection of customizable products.
            </p>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-lg bg-muted/20">
                <PackageSearch className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-semibold text-foreground">No Products Found</h2>
                <p className="text-muted-foreground mt-2">
                    This store doesn't have any products available yet. Please check back later.
                </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>
      <StoreFooter storeConfig={storeConfig} />
    </div>
  );
}
