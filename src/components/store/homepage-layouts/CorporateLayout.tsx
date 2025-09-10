
'use client';

import { Button } from '@/components/ui/button';
import { ProductCard, ProductCardSkeleton } from '@/components/store/ProductCard';
import type { PublicProduct } from '@/types/product';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import { ArrowRight, Building, CheckCircle, Briefcase, Percent, Rss } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { StoreHeader } from '../StoreHeader';
import { StoreFooter } from '../StoreFooter';
import { Card, CardContent } from '@/components/ui/card';

interface CorporateLayoutProps {
  storeConfig: UserStoreConfig;
  products: PublicProduct[];
  isLoading: boolean;
}

export function CorporateLayout({ storeConfig, products, isLoading }: CorporateLayoutProps) {
  const heroProduct = products?.[0];
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

      {/* Value Props Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 text-center">
                <div className="p-4">
                    <CheckCircle className="h-10 w-10 mx-auto mb-3" style={{color: `hsl(var(--primary))`}}/>
                    <h3 className="text-lg font-semibold text-gray-800">Quality Guaranteed</h3>
                    <p className="text-sm text-gray-600 mt-1">Premium materials for a professional finish.</p>
                </div>
                <div className="p-4">
                    <CheckCircle className="h-10 w-10 mx-auto mb-3" style={{color: `hsl(var(--primary))`}}/>
                    <h3 className="text-lg font-semibold text-gray-800">Bulk Discounts</h3>
                    <p className="text-sm text-gray-600 mt-1">Competitive pricing for large volume orders.</p>
                </div>
                <div className="p-4">
                    <CheckCircle className="h-10 w-10 mx-auto mb-3" style={{color: `hsl(var(--primary))`}}/>
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

        {/* Featured Categories */}
        <section className="py-16 md:py-24 bg-gray-50">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold font-headline text-gray-900 text-center mb-10">Browse by Department</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {['Apparel', 'Office & Drinkware', 'Trade Show Gear'].map((category) => (
                        <Link href={`/store/${storeConfig.id}/products`} key={category} className="group block">
                            <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                                <Image src={`https://picsum.photos/seed/${category}/500/375`} alt={category} fill className="object-cover transition-transform group-hover:scale-105" />
                            </div>
                            <h3 className="font-semibold text-lg mt-3 text-gray-800 group-hover:text-primary">{category} <ArrowRight className="inline-block h-4 w-4 transition-transform group-hover:translate-x-1" /></h3>
                        </Link>
                    ))}
                </div>
            </div>
        </section>

        {/* Special Offer */}
        <section className="py-20 bg-primary text-primary-foreground">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-center md:text-left gap-6">
                <div>
                    <h2 className="text-3xl font-bold font-headline mb-2">Volume Discount Available</h2>
                    <p className="text-lg opacity-90">Contact our sales team for a custom quote on orders over 50 units.</p>
                </div>
                <Button size="lg" variant="secondary" asChild>
                    <Link href="#">Request a Quote</Link>
                </Button>
            </div>
        </section>

        {/* Lifestyle Section */}
        <section className="py-16 md:py-24 bg-white">
            <div className="container mx-auto px-4 text-center">
                <h2 className="text-3xl font-bold font-headline text-gray-900 mb-4">Our Products in Action</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10">Trusted by leading companies for their branding and corporate gifting needs.</p>
                <div className="relative aspect-video max-w-4xl mx-auto rounded-lg overflow-hidden shadow-lg">
                    <Image src="https://picsum.photos/seed/corporate-lifestyle/1200/675" alt="Products in a corporate setting" fill className="object-cover"/>
                </div>
            </div>
        </section>
        
        {/* Recommended for you */}
        <section className="py-16 md:py-24 bg-gray-50">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold font-headline text-gray-900 mb-10">Recommended For You</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {products.slice(0, 4).map((p,i) => <ProductCard key={p.id} product={{...p, imageUrl: `https://picsum.photos/seed/recc${i}/400`}} />)}
                </div>
            </div>
        </section>

        {/* Blog section */}
        <section className="py-16 md:py-24 bg-white">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold font-headline text-gray-900 text-center mb-10">Latest Insights</h2>
                <div className="grid md:grid-cols-3 gap-8">
                     {[1, 2, 3].map(i => (
                        <Card key={i} className="group overflow-hidden border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                             <Link href="#">
                                <div className="p-6">
                                    <p className="text-sm text-gray-500 mb-2">Branding Tips</p>
                                    <h3 className="font-semibold text-lg text-gray-800 group-hover:text-primary mb-3">How to Choose the Perfect Corporate Gift</h3>
                                    <p className="text-sm text-gray-600 line-clamp-2">A great corporate gift can strengthen relationships and build brand loyalty. Here's how to get it right.</p>
                                </div>
                            </Link>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    </div>
    <StoreFooter storeConfig={storeConfig} />
    </>
  );
}
