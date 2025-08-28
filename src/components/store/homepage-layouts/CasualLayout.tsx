
'use client';

import { Button } from '@/components/ui/button';
import { ProductCard, ProductCardSkeleton } from '@/components/store/ProductCard';
import type { PublicProduct } from '@/types/product';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { StoreHeader } from '../StoreHeader';
import { StoreFooter } from '../StoreFooter';

interface CasualLayoutProps {
  storeConfig: UserStoreConfig;
  products: PublicProduct[];
  isLoading: boolean;
}

export function CasualLayout({ storeConfig, products, isLoading }: CasualLayoutProps) {
  const heroProduct = products?.[0];

  return (
    <>
      <StoreHeader storeConfig={storeConfig} />
      <div className="w-full">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold font-headline mb-4" style={{ color: `hsl(var(--primary))` }}>
              Welcome to {storeConfig.storeName}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Your new favorite spot for unique, customizable gear. Let's create something amazing together!
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" asChild style={{ backgroundColor: `hsl(var(--primary))`, color: `hsl(var(--primary-foreground))` }}>
                <Link href={`/store/${storeConfig.id}/products`}>
                  Shop All Products <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              {heroProduct && (
                  <Button size="lg" variant="outline" asChild>
                  <Link href={heroProduct.productUrl}>
                      Featured: {heroProduct.name}
                  </Link>
                  </Button>
              )}
            </div>
          </div>
        </section>

        {/* Featured Products Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-bold font-headline">Featured Products</h2>
              <Button variant="link" asChild>
                <Link href={`/store/${storeConfig.id}/products`}>
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => <ProductCardSkeleton key={i} />)
                : products.slice(0, 3).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="bg-card p-10 rounded-lg shadow-lg flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <h3 className="text-3xl font-bold font-headline mb-2">Ready to Start Designing?</h3>
                <p className="text-muted-foreground max-w-lg">
                  Pick a product and unleash your creativity. Our customizer makes it easy and fun to create one-of-a-kind items.
                </p>
              </div>
              <Button size="lg" asChild className="flex-shrink-0" style={{ backgroundColor: `hsl(var(--secondary))`, color: `hsl(var(--secondary-foreground))` }}>
                <Link href={`/store/${storeConfig.id}/products`}>
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Browse Products
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
      <StoreFooter storeConfig={storeConfig} />
    </>
  );
}
