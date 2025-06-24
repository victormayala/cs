"use client";

import React from 'react';
import MarketingHeader from '@/components/layout/MarketingHeader';
import MarketingFooter from '@/components/layout/MarketingFooter';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Link2, Settings2, Code, Palette, PackageCheck } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const steps = [
  {
    icon: Link2,
    title: "1. Sign Up & Connect Your Store",
    description: "Create your Customizer Studio account in minutes. Then, seamlessly connect your Shopify or WooCommerce store using our guided setup. Product synchronization starts immediately, importing your catalog into Customizer Studio.",
    imagePlaceholder: "/signup.png",
    aiHint: "store connection"
  },
  {
    icon: Settings2,
    title: "2. Configure Customization Options",
    description: "From your Customizer Studio dashboard, select products you want to make customizable. Define available colors, sizes, text input fields, image upload zones, and set up design boundaries directly on your product images using our intuitive editor.",
    imagePlaceholder: "/settings.png",
    aiHint: "product configuration"
  },
  {
    icon: Code,
    title: "3. Embed the Customizer",
    description: "Add Customizer Studio to your product pages by simply copying a lightweight JavaScript snippet. For Shopify and WooCommerce, our dedicated apps/plugins will make this even easier, often just a few clicks to integrate.",
    imagePlaceholder: "/embed.png",
    aiHint: "code embedding"
  },
  {
    icon: Palette,
    title: "4. Customers Design & Personalize",
    description: "Your customers will now see the Customizer Studio tool on your product pages. They can add text, upload images, choose colors, and see a live preview of their unique creation, leading to higher engagement and satisfaction.",
    imagePlaceholder: "/design.png",
    aiHint: "customer design"
  },
  {
    icon: PackageCheck,
    title: "5. Receive & Fulfill Custom Orders",
    description: "When a customer places an order, all customization details (text, image URLs, chosen options) are seamlessly passed to your e-commerce platform with the order. Fulfill custom orders accurately and efficiently.",
    imagePlaceholder: "/order.png",
    aiHint: "order fulfillment"
  }
];

export default function HowItWorksPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MarketingHeader />
      <main className="flex-1"> 
        <section className="py-20 md:py-28 bg-gradient-to-b from-background via-primary/5 to-background">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="text-center mb-20 md:mb-24">
              <h1 className="text-4xl md:text-5xl font-bold font-headline text-foreground mb-6">
                How Customizer Studio Works
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto">
                Integrating powerful product customization into your store is simple. Here's a step-by-step guide to transforming your customer experience.
              </p>
            </div>
            
            <div className="relative">
              {/* Vertical line for desktop */}
              <div className="absolute top-0 h-full w-0.5 bg-border/60 left-1/2 -translate-x-1/2 hidden md:block" aria-hidden="true"></div>

              {steps.map((step, index) => {
                const Icon = step.icon;
                const isEven = index % 2 === 0;

                return (
                  <div key={index} className="relative md:grid md:grid-cols-2 md:gap-x-12 md:items-center mb-16 last:mb-0">
                    {/* Icon Circle */}
                    <div className="hidden md:flex justify-center row-start-1 col-start-1 col-end-3">
                       <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground ring-8 ring-background">
                        <Icon className="h-7 w-7" />
                      </div>
                    </div>

                    {/* Image */}
                    <div className={cn("mb-6 md:mb-0", isEven ? 'md:col-start-2' : 'md:col-start-1 md:row-start-1')}>
                       <Image
                          src={step.imagePlaceholder}
                          alt={step.title}
                          width={400}
                          height={280}
                          className="rounded-xl object-cover border w-full aspect-[10/7] shadow-lg"
                          data-ai-hint={step.aiHint}
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                    </div>

                    {/* Content */}
                    <div className={cn(isEven ? 'md:col-start-1 md:row-start-1' : 'md:col-start-2')}>
                      {/* Icon for mobile */}
                      <div className="flex items-center gap-4 mb-4 md:hidden">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-background">
                          <Icon className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-semibold font-headline text-card-foreground">{step.title}</h3>
                      </div>
                       <div className="p-6 md:p-8 border rounded-xl bg-card shadow-lg h-full">
                          <h3 className="text-2xl font-semibold font-headline text-card-foreground mb-3 hidden md:block">{step.title}</h3>
                          <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-32 bg-primary text-primary-foreground">
          <div className="container max-w-[1440px] mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-headline mb-6">Ready to Get Started?</h2>
            <p className="text-lg text-primary-foreground/90 mb-10 max-w-xl mx-auto">
              Join businesses already leveraging the power of personalization with Customizer Studio. Sign up today and take the first step towards a more interactive and profitable online store.
            </p>
            <Button
              asChild
              size="lg"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto text-base px-8 py-3"
            >
              <Link href="/signup">
                <span className="flex items-center">
                   Sign Up for Free <ArrowRight className="ml-2 h-5 w-5" />
                </span>
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
