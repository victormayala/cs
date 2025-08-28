
'use client';

import { Button } from '@/components/ui/button';
import { ProductCard, ProductCardSkeleton } from '@/components/store/ProductCard';
import type { PublicProduct } from '@/types/product';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import { ArrowRight, ShoppingBag, Heart, Gift, Tag as TagIcon, Rss } from 'lucide-react';
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

        {/* Featured Categories */}
        <section className="py-16 md:py-24 bg-muted/20">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold font-headline text-center mb-10">Shop by Category</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['T-Shirts', 'Hoodies', 'Mugs', 'Hats'].map(category => (
                        <Link href={`/store/${storeConfig.id}/products`} key={category}>
                            <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
                                <CardContent className="p-0">
                                    <div className="relative aspect-square">
                                        <Image src={`https://picsum.photos/seed/${category}/400`} alt={category} fill className="object-cover transition-transform group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <h3 className="text-white text-xl font-bold drop-shadow-md">{category}</h3>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </section>

        {/* Special Offers Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
            <div className="container mx-auto px-4 text-center">
                <Gift className="h-12 w-12 mx-auto mb-4" />
                <h2 className="text-3xl font-bold font-headline mb-2">Special Offer!</h2>
                <p className="text-lg mb-6">Get 15% off your order of $50 or more with code <strong className="bg-primary-foreground/20 px-2 py-1 rounded-md">SAVE15</strong></p>
                <Button variant="secondary" size="lg" asChild>
                    <Link href={`/store/${storeConfig.id}/products`}>Start Shopping</Link>
                </Button>
            </div>
        </section>

        {/* Lifestyle Imagery Section */}
        <section className="py-16 md:py-24">
            <div className="container mx-auto px-4 grid md:grid-cols-2 gap-8 items-center">
                <div className="relative aspect-square rounded-lg overflow-hidden shadow-lg">
                    <Image src="https://picsum.photos/seed/lifestyle-1/600" alt="Lifestyle image" fill className="object-cover" />
                </div>
                <div className="text-center md:text-left">
                    <h2 className="text-3xl font-bold font-headline mb-4">Made for Your Life</h2>
                    <p className="text-muted-foreground text-lg">See our products in action and get inspired for your next custom creation. Quality you can feel, designs that tell your story.</p>
                </div>
            </div>
        </section>
        
        {/* Personalized Recommendations Section */}
        <section className="py-16 md:py-24 bg-muted/20">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold font-headline text-center mb-10">Just For You</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {products.slice(0,4).map((p, i) => <ProductCard key={p.id} product={{...p, imageUrl: `https://picsum.photos/seed/rec${i}/400`}}/>)}
                </div>
            </div>
        </section>

        {/* Blog/Content Integration Section */}
        <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold font-headline text-center mb-10">From our Blog</h2>
                <div className="grid md:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="group overflow-hidden">
                            <CardContent className="p-0">
                                <Link href="#">
                                    <div className="relative aspect-video">
                                        <Image src={`https://picsum.photos/seed/blog${i}/400/250`} alt={`Blog post ${i}`} fill className="object-cover group-hover:scale-105 transition-transform" />
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-semibold text-lg group-hover:text-primary">The Ultimate T-Shirt Design Guide</h3>
                                        <p className="text-sm text-muted-foreground mt-2">Learn the secrets to creating a design that pops and sells.</p>
                                    </div>
                                </Link>
                            </CardContent>
                        </Card>
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
