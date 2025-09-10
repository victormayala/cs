
'use client';

import { Button } from '@/components/ui/button';
import { ProductCard, ProductCardSkeleton } from '@/components/store/ProductCard';
import type { PublicProduct } from '@/types/product';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import { ArrowRight, Building, CheckCircle, Truck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { StoreHeader } from '../StoreHeader';
import { StoreFooter } from '../StoreFooter';

interface CorporateLayoutProps {
  storeConfig: UserStoreConfig;
  products: PublicProduct[];
  isLoading: boolean;
}

export function CorporateLayout({ storeConfig, products, isLoading }: CorporateLayoutProps) {
  const pageContent = storeConfig.pages?.homepage;

  return (
    <>
    <StoreHeader storeConfig={storeConfig} />
    <div className="w-full bg-background">
      {/* Hero Section */}
      <section className="w-full py-20 md:py-28 bg-white border-b">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4 text-gray-900 leading-tight">
              {pageContent?.hero?.headline || `${storeConfig.storeName}: Professional Customization Solutions`}
            </h1>
            <p className="text-lg text-gray-600 max-w-xl mb-8">
              {pageContent?.hero?.subheading || "Elevate your brand with high-quality, customizable products tailored for corporate needs."}
            </p>
            <div className="flex gap-4">
              <Button size="lg" asChild style={{ backgroundColor: `hsl(var(--primary))`, color: `hsl(var(--primary-foreground))` }}>
                <Link href={`/store/${storeConfig.id}/products`}>
                  {pageContent?.hero?.primaryButtonText || 'Browse Catalog'}
                </Link>
              </Button>
              {pageContent?.hero?.secondaryButtonText && (
                <Button size="lg" variant="outline" asChild>
                  <Link href="/contact">{pageContent.hero.secondaryButtonText}</Link>
                </Button>
              )}
            </div>
          </div>
          <div className="relative aspect-video w-full bg-gray-100 rounded-lg overflow-hidden">
             {pageContent?.hero?.backgroundImageUrl ? (
                <Image
                    src={pageContent.hero.backgroundImageUrl}
                    alt={pageContent.hero.headline || storeConfig.storeName}
                    fill
                    className="object-cover"
                    data-ai-hint="corporate hero banner"
                    priority
                />
            ) : (
                <div className="flex items-center justify-center h-full">
                    <Building className="h-16 w-16 text-gray-300" />
                </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      {pageContent?.features?.enabled && pageContent.features.items.length > 0 && (
          <section className="py-16 bg-gray-50">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-3 gap-8 text-center">
                    {pageContent.features.items.map((feature, index) => (
                        <div key={index} className="p-4">
                            <CheckCircle className="h-10 w-10 mx-auto mb-3 text-primary"/>
                            <h3 className="text-lg font-semibold text-gray-800">{feature.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
          </section>
      )}

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

      {/* Shipping Info Section */}
      {pageContent?.shipping?.enabled && pageContent.shipping.items.length > 0 && (
          <section className="py-16 bg-gray-50 border-t">
            <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
                <div>
                     <h2 className="text-3xl font-bold font-headline text-gray-900 mb-6">{pageContent.shipping.title || 'Reliable & Efficient Delivery'}</h2>
                     <ul className="space-y-4">
                        {pageContent.shipping.items.map((item, index) => (
                            <li key={index} className="flex items-start">
                                <Truck className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-gray-800">{item.title}</h4>
                                    <p className="text-gray-600">{item.description}</p>
                                </div>
                            </li>
                        ))}
                     </ul>
                </div>
                <div className="relative aspect-video w-full bg-gray-100 rounded-lg overflow-hidden">
                     <Image
                        src="https://picsum.photos/seed/shipping-corporate/500/350"
                        alt="Shipping and delivery"
                        fill
                        className="object-cover"
                        data-ai-hint="delivery logistics"
                      />
                </div>
            </div>
          </section>
      )}

      {/* Testimonials */}
      {pageContent?.testimonials?.enabled && pageContent.testimonials.items.length > 0 && (
        <section className="py-20 bg-primary text-primary-foreground">
            <div className="container mx-auto px-4 text-center">
                 <h2 className="text-3xl font-bold font-headline mb-10">{pageContent.testimonials.title || 'Trusted by Leading Companies'}</h2>
                <div className="max-w-3xl mx-auto">
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

      {/* Call to Action */}
      {pageContent?.callToAction?.enabled && (
        <section className="py-16 md:py-24 bg-white">
            <div className="container mx-auto px-4 text-center">
                <h2 className="text-3xl font-bold font-headline text-gray-900 mb-4">{pageContent.callToAction.headline || 'Ready to Elevate Your Brand?'}</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10">
                    {pageContent.callToAction.subheading || 'Browse our catalog and start creating your professionally branded products today.'}
                </p>
                <Button size="lg" asChild>
                    <Link href={`/store/${storeConfig.id}/products`}>{pageContent.callToAction.buttonText || 'Get Started'}</Link>
                </Button>
            </div>
        </section>
      )}
    </div>
    <StoreFooter storeConfig={storeConfig} />
    </>
  );
}
