
'use client';

import { Button } from '@/components/ui/button';
import { ProductCard, ProductCardSkeleton } from '@/components/store/ProductCard';
import type { PublicProduct } from '@/types/product';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import { ArrowRight, ShoppingBag, Heart, Gift, Star, Truck } from 'lucide-react';
import Link from 'next/link';
import { StoreHeader } from '../StoreHeader';
import { StoreFooter } from '../StoreFooter';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';

interface CasualLayoutProps {
  storeConfig: UserStoreConfig;
  products: PublicProduct[];
  isLoading: boolean;
}

export function CasualLayout({ storeConfig, products, isLoading }: CasualLayoutProps) {
  const pageContent = storeConfig.pages?.homepage;
  const primaryButtonLink = pageContent?.hero?.primaryButtonLink || `/store/${storeConfig.id}/products`;
  const secondaryButtonLink = pageContent?.hero?.secondaryButtonLink || `/store/${storeConfig.id}/products`;
  const ctaButtonLink = pageContent?.callToAction?.buttonLink || `/store/${storeConfig.id}/products`;

  return (
    <>
      <StoreHeader storeConfig={storeConfig} />
      <div className="w-full">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 bg-muted/30 relative">
            {pageContent?.hero?.backgroundImageUrl && (
                <Image 
                    src={pageContent.hero.backgroundImageUrl}
                    alt={pageContent.hero.headline || storeConfig.storeName}
                    fill
                    className="object-cover opacity-20"
                    priority
                />
            )}
            <div className="container mx-auto px-4 text-center relative z-10">
                <h1 className="text-4xl md:text-6xl font-bold font-headline mb-4" style={{ color: `hsl(var(--primary))` }}>
                {pageContent?.hero?.headline || `Welcome to ${storeConfig.storeName}`}
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                {pageContent?.hero?.subheading || "Your new favorite spot for unique, customizable gear. Let's create something amazing together!"}
                </p>
                <div className="flex gap-4 justify-center">
                <Button size="lg" asChild style={{ backgroundColor: `hsl(var(--primary))`, color: `hsl(var(--primary-foreground))` }}>
                    <Link href={primaryButtonLink}>
                    {pageContent?.hero?.primaryButtonText || 'Shop All Products'} <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                </Button>
                {pageContent?.hero?.secondaryButtonText && (
                    <Button size="lg" variant="outline" asChild>
                    <Link href={secondaryButtonLink}>
                        {pageContent.hero.secondaryButtonText}
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

        {/* Shipping Section */}
        {pageContent?.shipping?.enabled && pageContent.shipping.items.length > 0 && (
            <section className="py-16 md:py-24 bg-muted/30">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold font-headline text-center mb-10">{pageContent.shipping.title || 'Delivery Information'}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                        {pageContent.shipping.items.map((item, index) => (
                            <div key={index} className="p-4">
                                <Truck className="h-10 w-10 mx-auto mb-4 text-primary" />
                                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                                <p className="text-muted-foreground">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        )}

        {/* Features Section */}
        {pageContent?.features?.enabled && pageContent.features.items.length > 0 && (
            <section className="py-16 md:py-24 bg-background">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold font-headline text-center mb-10">{pageContent.features.title || 'Why Choose Us?'}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                        {pageContent.features.items.map((feature, index) => (
                            <div key={index} className="p-4">
                                <Heart className="h-10 w-10 mx-auto mb-4 text-primary" />
                                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                                <p className="text-muted-foreground">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        )}

        {/* Testimonials Section */}
        {pageContent?.testimonials?.enabled && pageContent.testimonials.items.length > 0 && (
            <section className="py-16 md:py-24 bg-primary text-primary-foreground">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold font-headline mb-10">{pageContent.testimonials.title || 'What Our Customers Say'}</h2>
                    <div className="max-w-3xl mx-auto space-y-8">
                        {pageContent.testimonials.items.map((testimonial, index) => (
                            <blockquote key={index}>
                                <p className="text-xl italic">"{testimonial.quote}"</p>
                                <footer className="mt-4 font-semibold opacity-90">- {testimonial.author}</footer>
                            </blockquote>
                        ))}
                    </div>
                </div>
            </section>
        )}

        {/* Call to Action Section */}
        {pageContent?.callToAction?.enabled && (
            <section className="py-16 md:py-24 bg-muted/30">
            <div className="container mx-auto px-4">
                <div className="bg-card p-10 rounded-lg shadow-lg flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-center md:text-left">
                    <h3 className="text-3xl font-bold font-headline mb-2">{pageContent.callToAction.headline || 'Ready to Start Designing?'}</h3>
                    <p className="text-muted-foreground max-w-lg">
                    {pageContent.callToAction.subheading || 'Pick a product and unleash your creativity. Our customizer makes it easy and fun to create one-of-a-kind items.'}
                    </p>
                </div>
                <Button size="lg" asChild className="flex-shrink-0" style={{ backgroundColor: `hsl(var(--secondary))`, color: `hsl(var(--secondary-foreground))` }}>
                    <Link href={ctaButtonLink}>
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    {pageContent.callToAction.buttonText || 'Browse Products'}
                    </Link>
                </Button>
                </div>
            </div>
            </section>
        )}
      </div>
      <StoreFooter storeConfig={storeConfig} />
    </>
  );
}
