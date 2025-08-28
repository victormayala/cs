'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import MarketingHeader from '@/components/layout/MarketingHeader';
import MarketingFooter from '@/components/layout/MarketingFooter';
import { ProductCard, ProductCardSkeleton } from '@/components/store/ProductCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, PackageSearch } from 'lucide-react';
import type { PublicProduct } from '@/types/product';

export default function ProductListingPage() {
  const params = useParams();
  const storeId = params.storeId as string;

  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) {
      setError('Store ID is missing from the URL.');
      setIsLoading(false);
      return;
    }

    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/store/products?configUserId=${storeId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch products.');
        }
        const data = await response.json();
        setProducts(data.products || []);
      } catch (err: any) {
        console.error('Error fetching products:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [storeId]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MarketingHeader />
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

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive" className="max-w-2xl mx-auto">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Products</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : products.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-lg">
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
      <MarketingFooter />
    </div>
  );
}