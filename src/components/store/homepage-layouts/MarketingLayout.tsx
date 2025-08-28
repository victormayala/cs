
'use client';

import { Button } from '@/components/ui/button';
import { ProductCard, ProductCardSkeleton } from '@/components/store/ProductCard';
import type { PublicProduct } from '@/types/product';
import type { UserStoreConfig } from '@/app/actions/userStoreActions';
import { ArrowRight, CheckCircle, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface MarketingLayoutProps {
  storeConfig: UserStoreConfig;
  products: PublicProduct[];
  isLoading: boolean;
}

export function MarketingLayout({ storeConfig, products, isLoading }: MarketingLayoutProps) {
  const heroProduct = products?.[0];

  return (
    <div className="w-full bg-card">
      {/* Hero Section */}
      <section className="w-full py-20 md:py-32 relative text-white bg-gray-900">
         <div className="absolute inset-0 bg-primary/20" style={{backgroundColor: `hsla(var(--primary) / 0.2)`}}>
          {heroProduct && (
              <Image 
                src={heroProduct.imageUrl} 
                alt="Hero background" 
                fill 
                className="object-cover opacity-20"
                data-ai-hint="product background"
              />
          )}
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-extrabold font-headline mb-4 drop-shadow-lg">
            {storeConfig.storeName}
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto mb-8 drop-shadow-md">
            Unleash your creativity with products designed by you, for you. The highest quality custom gear, made simple.
          </p>
          <Button size="lg" asChild className="transform hover:scale-105 transition-transform duration-300" style={{ backgroundColor: `hsl(var(--primary))`, color: `hsl(var(--primary-foreground))` }}>
            <Link href={`/store/${storeConfig.id}/products`}>
              Start Designing Now <ArrowRight className="ml-2 h-5 w-5" />
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
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
            {products?.[1] ? (
                 <Image src={products[1].imageUrl} alt="Feature showcase" fill className="object-contain" data-ai-hint="product feature"/>
            ) : heroProduct ? (
                 <Image src={heroProduct.imageUrl} alt="Feature showcase" fill className="object-contain" data-ai-hint="product feature"/>
            ) : null}
          </div>
          <div>
            <h3 className="text-3xl font-bold font-headline mb-6">Why You'll Love It</h3>
            <ul className="space-y-4">
                <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 mr-3 mt-1 shrink-0" style={{ color: `hsl(var(--primary))` }}/>
                    <div>
                        <h4 className="font-semibold">Intuitive Design Tools</h4>
                        <p className="text-muted-foreground text-sm">Our powerful customizer is easy to use, letting you see your design in real-time.</p>
                    </div>
                </li>
                <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 mr-3 mt-1 shrink-0" style={{ color: `hsl(var(--primary))` }}/>
                    <div>
                        <h4 className="font-semibold">Premium Quality Materials</h4>
                        <p className="text-muted-foreground text-sm">We source the best materials to ensure your custom products look and feel amazing.</p>
                    </div>
                </li>
                <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 mr-3 mt-1 shrink-0" style={{ color: `hsl(var(--primary))` }}/>
                    <div>
                        <h4 className="font-semibold">Fast & Reliable Shipping</h4>
                        <p className="text-muted-foreground text-sm">Your creations are made with care and shipped to your door quickly.</p>
                    </div>
                </li>
            </ul>
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
  );
}
