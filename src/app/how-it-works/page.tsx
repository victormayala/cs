
"use client";

import React from 'react';
import MarketingHeader from '@/components/layout/MarketingHeader';
import MarketingFooter from '@/components/layout/MarketingFooter';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Link2, Settings2, Code, Palette, ShoppingCart, PackageCheck } from 'lucide-react';
import Image from 'next/image'; // Using next/image for optimized images
import { cn } from '@/lib/utils';

const steps = [
  {
    icon: <Link2 className="h-10 w-10 text-secondary mb-4" />,
    title: "1. Sign Up & Connect Your Store",
    description: "Create your Customizer Studio account in minutes. Then, seamlessly connect your Shopify or WooCommerce store using our guided setup. Product synchronization starts immediately, importing your catalog into Customizer Studio.",
    imagePlaceholder: "/connect.png", // Make sure this image exists in /public
    aiHint: "store connection"
  },
  {
    icon: <Settings2 className="h-10 w-10 text-secondary mb-4" />,
    title: "2. Configure Customization Options",
    description: "From your Customizer Studio dashboard, select products you want to make customizable. Define available colors, sizes, text input fields, image upload zones, and set up design boundaries directly on your product images using our intuitive editor.",
    imagePlaceholder: "/dashboard.png", // Make sure this image exists in /public
    aiHint: "product configuration"
  },
  {
    icon: <Code className="h-10 w-10 text-secondary mb-4" />,
    title: "3. Embed the Customizer",
    description: "Add Customizer Studio to your product pages by simply copying a lightweight JavaScript snippet. For Shopify and WooCommerce, our dedicated apps/plugins will make this even easier, often just a few clicks to integrate.",
    imagePlaceholder: "/options.png", // Make sure this image exists in /public
    aiHint: "code embedding"
  },
  {
    icon: <Palette className="h-10 w-10 text-secondary mb-4" />,
    title: "4. Customers Design & Personalize",
    description: "Your customers will now see the Customizer Studio tool on your product pages. They can add text, upload images, choose colors, and see a live preview of their unique creation, leading to higher engagement and satisfaction.",
    imagePlaceholder: "/customizer-app.png", // Make sure this image exists in /public
    aiHint: "customer design"
  },
  {
    icon: <PackageCheck className="h-10 w-10 text-secondary mb-4" />,
    title: "5. Receive & Fulfill Custom Orders",
    description: "When a customer places an order, all customization details (text, image URLs, chosen options) are seamlessly passed to your e-commerce platform with the order. Fulfill custom orders accurately and efficiently.",
    imagePlaceholder: "/cart.png", // Make sure this image exists in /public
    aiHint: "order fulfillment"
  }
];

export default function HowItWorksPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MarketingHeader />
      <main className="flex-1 py-16 md:py-24 lg:py-32 bg-card"> 
        <div className="container max-w-[1440px] mx-auto px-4">
          <div className="text-center mb-20 md:mb-24">
            <h1 className="text-4xl md:text-5xl font-bold font-headline text-foreground mb-6">
              How Customizer Studio Transforms Your Store
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto">
              Integrating powerful product customization into your e-commerce store is straightforward with Customizer Studio. Follow these simple steps to unlock a new level of customer engagement and boost your sales.
            </p>
          </div>
          
          <div className="grid md:grid-cols-1 gap-16 lg:gap-20">
            {steps.map((step, index) => (
              <CardStep key={index} step={step} index={index} totalSteps={steps.length} />
            ))}
          </div>

          <div className="mt-24 md:mt-32 text-center">
            <h2 className="text-3xl font-bold font-headline text-foreground mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join businesses already leveraging the power of personalization with Customizer Studio. Sign up today and take the first step towards a more interactive and profitable online store.
            </p>
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/signup">
                <span className="flex items-center">
                   Sign Up for Free <ArrowRight className="ml-2 h-5 w-5" />
                </span>
              </Link>
            </Button>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}

interface CardStepProps {
  step: {
    icon: JSX.Element;
    title: string;
    description: string;
    imagePlaceholder: string; // Should be a path like "/your-image.png"
    aiHint: string;
  };
  index: number;
  totalSteps: number;
}

const CardStep = ({ step, index }: CardStepProps) => {
  const isEven = index % 2 === 0;

  return (
    <div className={`flex flex-col md:flex-row items-center gap-10 lg:gap-16 ${isEven ? '' : 'md:flex-row-reverse'}`}>
      <div className="md:w-1/2 lg:w-5/12">
        <div className="p-6 md:p-8 border rounded-xl bg-card h-full flex flex-col"> 
          <div className="flex items-center mb-5">
            <div className={cn(
                "mr-4 p-3 rounded-full bg-secondary/10 text-secondary",
                // If you want a different color based on even/odd for the icon bg
                // isEven ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent" 
              )}>
              {React.cloneElement(step.icon, { className: "h-6 w-6" })}
            </div>
            <h2 className="text-2xl font-semibold font-headline text-card-foreground">{step.title}</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {step.description}
          </p>
        </div>
      </div>
      <div className="md:w-1/2 lg:w-7/12">
        <Image
          src={step.imagePlaceholder}
          alt={step.title}
          width={400} 
          height={280} 
          className="rounded-xl object-cover border w-full aspect-[10/7]" 
          data-ai-hint={step.aiHint}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 58vw" // Added sizes prop
        />
      </div>
    </div>
  );
};
    
