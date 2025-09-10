
'use client';

import { Button } from '@/components/ui/button';
import { ProductCard, ProductCardSkeleton } from '@/components/store/ProductCard';
import type { PublicProduct } from '@/types/product';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import { ArrowRight, CheckCircle, Star, Percent, User, Rss } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { StoreHeader } from '../StoreHeader';
import { StoreFooter } from '../StoreFooter';
import { Card, CardContent } from '@/components/ui/card';

interface MarketingLayoutProps {
  storeConfig: UserStoreConfig;
  products: PublicProduct[];
  isLoading: boolean;
}

export function MarketingLayout({ storeConfig, products, isLoading }: MarketingLayoutProps) {
  const heroProduct = products?.[0];
  const pageContent = storeConfig.pages?.homepage;

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
            ) : heroProduct && (
                <Image 
                  src={heroProduct.imageUrl} 
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
              <Link href={`/store/${storeConfig.id}/products`}>
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
        
        {/* Featured Categories Section */}
        <section className="py-16 md:py-24 bg-card">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold font-headline text-center mb-12">Explore Our Collections</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {['New Arrivals', 'Best Sellers', 'For The Team'].map(category => (
                         <Link href={`/store/${storeConfig.id}/products`} key={category} className="group block">
                            <Card className="overflow-hidden border-none shadow-xl transform group-hover:-translate-y-2 transition-transform duration-300">
                                <div className="relative aspect-square">
                                    <Image src={`https://picsum.photos/seed/${category}/500`} alt={category} fill className="object-cover" />
                                </div>
                                <div className="p-4 bg-primary/90 backdrop-blur-sm text-primary-foreground text-center">
                                    <h3 className="font-semibold text-xl">{category}</h3>
                                </div>
                            </Card>
                         </Link>
                    ))}
                </div>
            </div>
        </section>

        {/* Special Offer Section */}
        <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4">
                <Card className="bg-secondary text-secondary-foreground overflow-hidden">
                    <div className="grid md:grid-cols-2 items-center">
                        <div className="p-8 md:p-12">
                            <Percent className="h-10 w-10 mb-4 opacity-80" />
                            <h2 className="text-3xl font-bold font-headline mb-2">Limited-Time Offer</h2>
                            <p className="text-lg opacity-90 mb-6">Create your first custom design and get 20% off your entire order. Don't wait!</p>
                            <Button size="lg" variant="outline" asChild className="bg-secondary-foreground text-secondary hover:bg-secondary-foreground/90">
                                <Link href={`/store/${storeConfig.id}/products`}>Claim Your Discount</Link>
                            </Button>
                        </div>
                        <div className="relative h-64 md:h-full w-full">
                            <Image src="https://picsum.photos/seed/sale/600/400" alt="Special offer background" fill className="object-cover" />
                        </div>
                    </div>
                </Card>
            </div>
        </section>

        {/* Lifestyle Imagery Section */}
        <section className="py-16 md:py-24 bg-card">
            <div className="container mx-auto px-4">
                 <h2 className="text-3xl font-bold font-headline text-center mb-12">Our Style in Action</h2>
                 <div className="columns-2 md:columns-3 gap-4 space-y-4">
                    {[1,2,3,4,5,6].map(i => (
                         <div key={i} className="overflow-hidden rounded-lg shadow-lg">
                            <Image src={`https://picsum.photos/seed/gallery${i}/500/${i % 2 === 0 ? 700 : 400}`} alt={`Lifestyle image ${i}`} width={500} height={i % 2 === 0 ? 700 : 400} className="w-full h-auto object-cover"/>
                         </div>
                    ))}
                 </div>
            </div>
        </section>

        {/* Personalized Recommendations Section */}
        <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4">
                 <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold font-headline">Just for You</h2>
                    <p className="text-md text-muted-foreground mt-2">Based on your activity, we think you'll love these.</p>
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {isLoading
                        ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
                        : products.slice(0, 4).map((product, i) => (
                            <ProductCard key={product.id} product={{...product, imageUrl: `https://picsum.photos/seed/foryou${i}/400`}} />
                        ))}
                </div>
            </div>
        </section>

        {/* Blog/Content Section */}
        <section className="py-16 md:py-24 bg-card">
             <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold font-headline">From the Journal</h2>
                    <p className="text-md text-muted-foreground mt-2">Design tips, inspiration, and stories from our community.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-8 items-center">
                    <Link href="#" className="group">
                        <div className="relative aspect-video rounded-lg overflow-hidden">
                            <Image src="https://picsum.photos/seed/blog-main/600/350" alt="Main blog post" fill className="object-cover group-hover:scale-105 transition-transform" />
                        </div>
                        <h3 className="text-xl font-semibold mt-4 group-hover:text-primary">Top 5 Design Trends for Custom Apparel This Year</h3>
                        <p className="text-muted-foreground mt-1">Discover what's hot and get inspired for your next project.</p>
                    </Link>
                    <div className="space-y-6">
                        {[1,2,3].map(i => (
                             <Link href="#" key={i} className="group flex items-center gap-4">
                                <div className="relative h-20 w-20 rounded-lg overflow-hidden shrink-0">
                                    <Image src={`https://picsum.photos/seed/blog-sub${i}/200`} alt={`Blog post ${i}`} fill className="object-cover" />
                                </div>
                                <div>
                                    <h4 className="font-semibold group-hover:text-primary">How to Create the Perfect Gift</h4>
                                    <p className="text-sm text-muted-foreground">A step-by-step guide to thoughtful personalization.</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
             </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold font-headline">Loved By Creators Like You</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                  <div className="bg-card p-6 rounded-lg border text-center">
                      <div className="flex justify-center text-yellow-400 mb-2">{[...Array(5)].map((_,i)=><Star key={i} fill="currentColor"/>)}</div>
                      <p className="text-muted-foreground italic">"The process was so simple and the final product was exactly what I pictured. 10/10!"</p>
                      <p className="font-semibold mt-3">- Alex Johnson</p>
                  </div>
                  <div className="bg-card p-6 rounded-lg border text-center">
                      <div className="flex justify-center text-yellow-400 mb-2">{[...Array(5)].map((_,i)=><Star key={i} fill="currentColor"/>)}</div>
                      <p className="text-muted-foreground italic">"I ordered custom shirts for my whole team and they were a huge hit. The quality is fantastic."</p>
                      <p className="font-semibold mt-3">- Samantha Lee</p>
                  </div>
                  <div className="bg-card p-6 rounded-lg border text-center">
                      <div className="flex justify-center text-yellow-400 mb-2">{[...Array(5)].map((_,i)=><Star key={i} fill="currentColor"/>)}</div>
                      <p className="text-muted-foreground italic">"Finally, a customizer that's actually fun to use. I'm already planning my next design."</p>
                      <p className="font-semibold mt-3">- Michael Brown</p>
                  </div>
              </div>
          </div>
        </section>
      </div>
      <StoreFooter storeConfig={storeConfig} />
    </>
  );
}
