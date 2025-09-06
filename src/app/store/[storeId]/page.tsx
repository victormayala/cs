
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import type { PublicProduct } from '@/types/product';

import { CasualLayout } from '@/components/store/homepage-layouts/CasualLayout';
import { CorporateLayout } from '@/components/store/homepage-layouts/CorporateLayout';
import { MarketingLayout } from '@/components/store/homepage-layouts/MarketingLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import Head from 'next/head';
import { StoreHeader } from '@/components/store/StoreHeader';
import { StoreFooter } from '@/components/store/StoreFooter';

function hexToHsl(hex: string): string | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    console.warn(`Invalid hex color provided to hexToHsl: ${hex}`);
    return null;
  }

  const r = parseInt(hex.substring(1, 3), 16) / 255;
  const g = parseInt(hex.substring(3, 5), 16) / 255;
  const b = parseInt(hex.substring(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
}

function StoreLoadingSkeleton() {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <header className="sticky top-0 z-50 w-full border-b bg-card h-16"></header>
            <main className="flex-1 flex items-center justify-center">
                <div className="flex items-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 mr-3 animate-spin text-primary" />
                    <span className="text-lg">Loading Store...</span>
                </div>
            </main>
            <footer className="border-t bg-muted/50 h-20"></footer>
        </div>
    );
}

function StoreErrorState({ error }: { error: string }) {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <header className="sticky top-0 z-50 w-full border-b bg-card h-16"></header>
            <main className="flex-1 flex items-center justify-center p-4">
                <Alert variant="destructive" className="max-w-md">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error Loading Store</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </main>
            <footer className="border-t bg-muted/50 h-20"></footer>
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
        const config = { ...storeDocSnap.data(), id: storeDocSnap.id } as UserStoreConfig;
        setStoreConfig(config);

        // Fetch products for the store
        const productsResponse = await fetch(`/api/store/products?configUserId=${config.userId}`);
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
  
  const primaryHsl = hexToHsl(storeConfig.branding.primaryColorHex);
  const secondaryHsl = hexToHsl(storeConfig.branding.secondaryColorHex);
  
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
    <>
      <Head>
        <style id="dynamic-theme-styles">
          {`
            :root {
              ${primaryHsl ? `--primary: ${primaryHsl};` : ''}
              ${secondaryHsl ? `--secondary: ${secondaryHsl};` : ''}
              ${secondaryHsl ? `--accent: ${secondaryHsl};` : ''}
            }
          `}
        </style>
      </Head>
      <div className="flex flex-col min-h-screen bg-background">
        {renderLayout()}
      </div>
    </>
  );
}
