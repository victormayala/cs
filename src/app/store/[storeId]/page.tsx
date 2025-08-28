
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import type { PublicProduct } from '@/types/product';

import MarketingHeader from '@/components/layout/MarketingHeader';
import MarketingFooter from '@/components/layout/MarketingFooter';
import { CasualLayout } from '@/components/store/homepage-layouts/CasualLayout';
import { CorporateLayout } from '@/components/store/homepage-layouts/CorporateLayout';
import { MarketingLayout } from '@/components/store/homepage-layouts/MarketingLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, PackageSearch } from 'lucide-react';

function StoreLoadingSkeleton() {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <MarketingHeader />
            <main className="flex-1 flex items-center justify-center">
                <div className="flex items-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 mr-3 animate-spin text-primary" />
                    <span className="text-lg">Loading Store...</span>
                </div>
            </main>
            <MarketingFooter />
        </div>
    );
}

function StoreErrorState({ error }: { error: string }) {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <MarketingHeader />
            <main className="flex-1 flex items-center justify-center p-4">
                <Alert variant="destructive" className="max-w-md">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error Loading Store</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </main>
            <MarketingFooter />
        </div>
    );
}

export default function StorefrontHomepage() {
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

    async function fetchStoreData() {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch store configuration
        const storeDocRef = doc(db, 'userStores', storeId);
        const storeDocSnap = await getDoc(storeDocRef);

        if (!storeDocSnap.exists()) {
          throw new Error('This store could not be found. Please check the URL.');
        }
        const config = storeDocSnap.data() as UserStoreConfig;
        setStoreConfig(config);

        // Set CSS variables for branding
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--primary', config.branding.primaryColorHex.replace('#', ''));
          document.documentElement.style.setProperty('--secondary', config.branding.secondaryColorHex.replace('#', ''));
        }

        // Fetch products for the store
        const productsResponse = await fetch(`/api/store/products?configUserId=${storeId}`);
        if (!productsResponse.ok) {
          const errorData = await productsResponse.json();
          throw new Error(errorData.error || 'Failed to fetch products for this store.');
        }
        const productsData = await productsResponse.json();
        setProducts(productsData.products || []);

      } catch (err: any) {
        console.error('Error fetching store data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStoreData();
  }, [storeId]);


  if (isLoading) {
    return <StoreLoadingSkeleton />;
  }

  if (error) {
    return <StoreErrorState error={error} />;
  }

  if (!storeConfig) {
     return <StoreErrorState error="Store configuration is missing." />;
  }
  
  const renderLayout = () => {
    switch (storeConfig.layout) {
      case 'casual':
        return <CasualLayout storeConfig={storeConfig} products={products} isLoading={isLoading} />;
      case 'corporate':
        return <CorporateLayout storeConfig={storeConfig} products={products} isLoading={isLoading} />;
      case 'marketing':
        return <MarketingLayout storeConfig={storeConfig} products={products} isLoading={isLoading} />;
      default:
        return <StoreErrorState error={`Unknown layout type: ${storeConfig.layout}`} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MarketingHeader />
      <main className="flex-1">
        {renderLayout()}
      </main>
      <MarketingFooter />
    </div>
  );
}
