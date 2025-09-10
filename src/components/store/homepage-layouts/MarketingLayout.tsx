
'use client';

import { Button } from '@/components/ui/button';
import { ProductCard, ProductCardSkeleton } from '@/components/store/ProductCard';
import type { PublicProduct } from '@/types/product';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import { ArrowRight, Star, Truck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { StoreHeader } from '../StoreHeader';
import { StoreFooter } from '../StoreFooter';
import { Card } from '@/components/ui/card';

interface MarketingLayoutProps {
  storeConfig: UserStoreConfig;
  products: PublicProduct[];
  isLoading: boolean;
}

export function MarketingLayout({ storeConfig, products, isLoading }: MarketingLayoutProps) {
  const pageContent = storeConfig.pages?.homepage;
  const primaryButtonLink = pageContent?.hero?.primaryButtonLink || `/store/${storeConfig.id}/products`;
  const ctaButtonLink = pageContent?.callToAction?.buttonLink || `/store/${storeConfig.id}/products`;

  return (
    <>
      <StoreHeader storeConfig={storeConfig} />
      <div className="w-full bg-card">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 relative text-white bg-gray-900">
          <div className="absolute inset-0 bg-primary/20" style={{backgroundColor: `hsla(var(--primary) / 0.2)`}}>
            {pageContent?.hero?.backgroundImageUrl ? (
                <Image 
                  src={pageContent.hero.backgroundImageUrl} 
                  alt={pageContent.hero.headline || storeConfig.storeName}
                  fill 
                  className="object-cover opacity-20"
                  data-ai-hint="product background"
                  priority
                />
            ) : products?.[0] && (
                <Image 
                  src={products[0].imageUrl} 
                  alt="Hero background" 
                  fill 
                  className="object-cover opacity-20"
                  data-ai-hint="product background"
                  priority
                />
            )}
          </div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <h1 className="text-4xl md:text-6xl font-extrabold font-headline mb-4 drop-shadow-lg">
              {pageContent?.hero?.headline || storeConfig.storeName}
            </h1>
            <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto mb-8 drop-shadow-md">
              {pageContent?.hero?.subheading || "Unleash your creativity with products designed by you, for you. The highest quality custom gear, made simple."}
            </p>
            <Button size="lg" asChild className="transform hover:scale-105 transition-transform duration-300" style={{ backgroundColor: `hsl(var(--primary))`, color: `hsl(var(--primary-foreground))` }}>
              <Link href={primaryButtonLink}>
                {pageContent?.hero?.primaryButtonText || 'Start Designing Now'} <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Featured Products Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold font-headline">Top Picks For You</h2>
              <p className="text-md text-muted-foreground mt-2">Get started with our most popular customizable products.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
                : products.slice(0, 4).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        {pageContent?.features?.enabled && pageContent.features.items.length > 0 && (
            <section className="py-16 md:py-24 bg-card">
                 <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold font-headline">{pageContent.features.title || 'Why You\'ll Love Us'}</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto">
                        {pageContent.features.items.map((feature, index) => (
                             <div key={index} className="text-center">
                                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mx-auto mb-4">
                                    <Star className="h-8 w-8" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                                <p className="text-muted-foreground">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                 </div>
            </section>
        )}

        {/* Shipping Info Section */}
        {pageContent?.shipping?.enabled && pageContent.shipping.items.length > 0 && (
            <section className="py-16 md:py-24 bg-background">
              <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
                <div className="relative aspect-video w-full bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src="https://picsum.photos/seed/shipping-marketing/500/350"
                        alt="Shipping and delivery"
                        fill
                        className="object-cover"
                        data-ai-hint="delivery packages"
                      />
                </div>
                <div>
                     <h2 className="text-3xl font-bold font-headline mb-6">{pageContent.shipping.title || 'Fast & Reliable Delivery'}</h2>
                     <ul className="space-y-4">
                        {pageContent.shipping.items.map((item, index) => (
                            <li key={index} className="flex items-start">
                                <Truck className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold">{item.title}</h4>
                                    <p className="text-muted-foreground">{item.description}</p>
                                </div>
                            </li>
                        ))}
                     </ul>
                </div>
              </div>
            </section>
        )}

        {/* Testimonials */}
        {pageContent?.testimonials?.enabled && pageContent.testimonials.items.length > 0 && (
            <section className="py-16 md:py-24 bg-card">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold font-headline">{pageContent.testimonials.title || 'Loved By Creators Like You'}</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    {pageContent.testimonials.items.map((testimonial, index) => (
                        <div key={index} className="bg-background p-6 rounded-lg border text-center">
                            <div className="flex justify-center text-yellow-400 mb-2">{[...Array(5)].map((_,i)=><Star key={i} fill="currentColor"/>)}</div>
                            <p className="text-muted-foreground italic">"{testimonial.quote}"</p>
                            <p className="font-semibold mt-3">- {testimonial.author}</p>
                        </div>
                    ))}
                </div>
            </div>
            </section>
        )}

        {/* Call to Action Section */}
        {pageContent?.callToAction?.enabled && (
            <section className="py-20 md:py-32 bg-primary text-primary-foreground">
            <div className="container mx-auto px-4 text-center">
                <h2 className="text-3xl md:text-4xl font-bold font-headline mb-6">
                {pageContent.callToAction.headline || 'Ready to Unleash Personalization?'}
                </h2>
                <p className="text-lg text-primary-foreground/90 mb-10 max-w-xl mx-auto">
                {pageContent.callToAction.subheading || 'Join hundreds of businesses offering unique, personalized products. Start your journey with Customizer Studio today.'}
                </p>
                <Button
                    asChild
                    size="lg"
                    className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto text-base px-8 py-3"
                >
                    <Link href={ctaButtonLink}>
                        <span>{pageContent.callToAction.buttonText || 'Start Your Free Trial'}</span>
                    </Link>
                </Button>
            </div>
            </section>
        )}
      </div>
      <StoreFooter storeConfig={storeConfig} />
    </>
  );
}
