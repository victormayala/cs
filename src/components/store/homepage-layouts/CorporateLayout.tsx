
'use client';

import { Button } from '@/components/ui/button';
import { ProductCard, ProductCardSkeleton } from '@/components/store/ProductCard';
import type { PublicProduct } from '@/types/product';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import { ArrowRight, Building, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface CorporateLayoutProps {
  storeConfig: UserStoreConfig;
  products: PublicProduct[];
  isLoading: boolean;
}

export function CorporateLayout({ storeConfig, products, isLoading }: CorporateLayoutProps) {
  const heroProduct = products?.[0];

  return (
    <div className="w-full bg-background">
      {/* Hero Section */}
      <section className="w-full py-20 md:py-28 bg-white border-b">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4 text-gray-900 leading-tight">
              {storeConfig.storeName}: Professional Customization Solutions
            </h1>
            <p className="text-lg text-gray-600 max-w-xl mb-8">
              Elevate your brand with high-quality, customizable products tailored for corporate needs.
            </p>
            <div className="flex gap-4">
              <Button size="lg" asChild style={{ backgroundColor: `hsl(var(--primary))`, color: `hsl(var(--primary-foreground))` }}>
                <Link href={`/store/${storeConfig.id}/products`}>
                  Browse Catalog
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/contact">Contact Sales</Link>
              </Button>
            </div>
          </div>
          <div className="relative aspect-video w-full bg-gray-100 rounded-lg overflow-hidden">
             {heroProduct ? (
                <Image
                    src={heroProduct.imageUrl}
                    alt={`${heroProduct.name} - Featured Product`}
                    fill
                    className="object-contain"
                    data-ai-hint="corporate product"
                />
            ) : (
                <div className="flex items-center justify-center h-full">
                    <Building className="h-16 w-16 text-gray-300" />
                </div>
            )}
          </div>
        </div>
      </section>

      {/* Value Props Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 text-center">
                <div className="p-4">
                    <CheckCircle className="h-10 w-10 text-primary mx-auto mb-3" style={{color: `hsl(var(--primary))`}}/>
                    <h3 className="text-lg font-semibold text-gray-800">Quality Guaranteed</h3>
                    <p className="text-sm text-gray-600 mt-1">Premium materials for a professional finish.</p>
                </div>
                <div className="p-4">
                    <CheckCircle className="h-10 w-10 text-primary mx-auto mb-3" style={{color: `hsl(var(--primary))`}}/>
                    <h3 className="text-lg font-semibold text-gray-800">Bulk Discounts</h3>
                    <p className="text-sm text-gray-600 mt-1">Competitive pricing for large volume orders.</p>
                </div>
                <div className="p-4">
                    <CheckCircle className="h-10 w-10 text-primary mx-auto mb-3" style={{color: `hsl(var(--primary))`}}/>
                    <h3 className="text-lg font-semibold text-gray-800">Easy Online Design</h3>
                    <p className="text-sm text-gray-600 mt-1">Intuitive tools to upload logos and add text.</p>
                </div>
            </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="mb-10">
            <h2 className="text-3xl font-bold font-headline text-gray-900">Our Products</h2>
            <p className="text-md text-gray-500 mt-1">Select a product to begin customization.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : products.slice(0, 4).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
          </div>
           {products.length > 4 && (
                <div className="text-center mt-12">
                    <Button size="lg" variant="outline" asChild>
                        <Link href={`/store/${storeConfig.id}/products`}>
                            View All Products <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            )}
        </div>
      </section>
    </div>
  );
}
